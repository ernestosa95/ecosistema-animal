/**
 * Flujo de trabajo: registro de vacunaciones y recordatorios de próxima dosis,
 * contra Postgres real (PGlite/WASM) con los schemas `core` + `hce` reales.
 * Misma lógica que vacunaciones.service.ts.
 *
 * Correr:  pnpm --filter backend test:vacunas-demo
 */
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { and, asc, desc, eq, isNull, isNotNull, sql } from 'drizzle-orm';
import { organizaciones, usuarios, especies, animales } from '../src/database/schema/core';
import { vacunaciones } from '../src/database/schema/hce';

let ok = 0, fail = 0;
function check(n: string, c: boolean) {
  if (c) { ok++; console.log(`  ✓ ${n}`); } else { fail++; console.log(`  ✗ FALLA: ${n}`); }
}
const iso = (offsetDias: number) =>
  new Date(Date.now() + offsetDias * 86400000).toISOString().slice(0, 10);

async function main() {
  const client = new PGlite();
  await client.exec(`
    CREATE SCHEMA core; CREATE SCHEMA hce;
    CREATE TYPE core.tipo_organizacion AS ENUM ('establecimiento','clinica','mixta');
    CREATE TYPE core.sexo_animal AS ENUM ('macho','hembra','indefinido');
    CREATE TYPE core.estado_animal AS ENUM ('activo','inactivo','fallecido');
    CREATE TABLE core.organizaciones (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), nombre text NOT NULL,
      tipo core.tipo_organizacion NOT NULL DEFAULT 'clinica', cuit text,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz);
    CREATE TABLE core.usuarios (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text NOT NULL UNIQUE, password_hash text NOT NULL,
      nombre text, apellido text, email_verificado boolean NOT NULL DEFAULT false, ultimo_login timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz);
    CREATE TABLE core.personas (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organizacion_id uuid NOT NULL REFERENCES core.organizaciones(id), nombre text NOT NULL, apellido text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz);
    CREATE TABLE core.especies (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), codigo text NOT NULL UNIQUE, nombre text NOT NULL);
    CREATE TABLE core.animales (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organizacion_id uuid NOT NULL REFERENCES core.organizaciones(id) ON DELETE CASCADE,
      persona_id uuid REFERENCES core.personas(id), especie_id uuid NOT NULL REFERENCES core.especies(id),
      codigo_legible text UNIQUE, microchip text UNIQUE, nombre text NOT NULL,
      sexo core.sexo_animal, fecha_nacimiento date, fecha_nac_estimada boolean NOT NULL DEFAULT false,
      foto_url text, estado core.estado_animal NOT NULL DEFAULT 'activo', datos_especificos jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz);
    CREATE TABLE hce.vacunaciones (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organizacion_id uuid NOT NULL REFERENCES core.organizaciones(id) ON DELETE CASCADE,
      animal_id uuid NOT NULL REFERENCES core.animales(id),
      veterinario_id uuid REFERENCES core.usuarios(id),
      producto text, vademecum_id uuid, fecha date NOT NULL DEFAULT current_date, proxima_dosis date, lote_producto text,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz);
  `);

  const db = drizzle(client, { schema: { organizaciones, usuarios, especies, animales, vacunaciones } });
  const [orgA] = await db.insert(organizaciones).values({ nombre: 'Clínica A' }).returning();
  const [orgB] = await db.insert(organizaciones).values({ nombre: 'Clínica B' }).returning();
  const [vet] = await db.insert(usuarios).values({ email: 'vet@a.com', passwordHash: 'x', nombre: 'Ana' }).returning();
  const [can] = await db.insert(especies).values({ codigo: 'CAN', nombre: 'Canino' }).returning();
  const [firu] = await db.insert(animales).values({ organizacionId: orgA.id, especieId: can.id, nombre: 'Firulais', codigoLegible: 'CAN-AR-000001-W' }).returning();

  // ---- Lógica replicada de VacunacionesService ----
  async function verificarAnimal(orgId: string, animalId: string) {
    const [a] = await db.select({ id: animales.id }).from(animales)
      .where(and(eq(animales.id, animalId), eq(animales.organizacionId, orgId))).limit(1);
    if (!a) throw new Error('El paciente no existe en esta organización');
  }
  async function registrar(orgId: string, vetId: string, dto: any) {
    await verificarAnimal(orgId, dto.animalId);
    const [v] = await db.insert(vacunaciones).values({
      organizacionId: orgId, animalId: dto.animalId, veterinarioId: vetId,
      producto: dto.producto, fecha: dto.fecha, proximaDosis: dto.proximaDosis, loteProducto: dto.loteProducto,
    }).returning();
    return v;
  }
  async function recordatorios(orgId: string, dias = 30) {
    return db.select({
      id: vacunaciones.id, animalId: vacunaciones.animalId,
      animalNombre: animales.nombre, producto: vacunaciones.producto, proximaDosis: vacunaciones.proximaDosis,
    }).from(vacunaciones).innerJoin(animales, eq(animales.id, vacunaciones.animalId))
      .where(and(eq(vacunaciones.organizacionId, orgId), isNull(vacunaciones.deletedAt),
        isNotNull(vacunaciones.proximaDosis), sql`${vacunaciones.proximaDosis} <= current_date + ${dias}::int`))
      .orderBy(asc(vacunaciones.proximaDosis));
  }

  // ============================== Pruebas ==============================
  console.log('1) Registrar vacunación');
  const v1 = await registrar(orgA.id, vet.id, {
    animalId: firu.id, producto: 'Séxtuple', fecha: iso(-2), proximaDosis: iso(10), loteProducto: 'L-2024-A',
  });
  check('se registró la vacunación', !!v1.id);
  check('quedó en la organización correcta', v1.organizacionId === orgA.id);
  check('registró al veterinario', v1.veterinarioId === vet.id);
  check('guardó la próxima dosis', v1.proximaDosis === iso(10));

  // una vacuna con próxima dosis lejana (no debe entrar en recordatorios de 30 días)
  await registrar(orgA.id, vet.id, { animalId: firu.id, producto: 'Antirrábica', fecha: iso(-1), proximaDosis: iso(200) });

  console.log('2) Recordatorios de próxima dosis');
  const rec30 = await recordatorios(orgA.id, 30);
  check('recordatorios(30) trae solo la dosis próxima', rec30.length === 1);
  check('el recordatorio corresponde a la Séxtuple', rec30[0].producto === 'Séxtuple');
  check('el recordatorio incluye el nombre del paciente (join)', rec30[0].animalNombre === 'Firulais');
  const rec365 = await recordatorios(orgA.id, 365);
  check('recordatorios(365) trae ambas', rec365.length === 2);

  console.log('3) Aislamiento entre clínicas');
  let cruzado = false;
  try { await registrar(orgB.id, vet.id, { animalId: firu.id, producto: 'X' }); } catch { cruzado = true; }
  check('otra clínica NO puede vacunar a este paciente', cruzado);
  const recB = await recordatorios(orgB.id, 365);
  check('los recordatorios de la Clínica B están vacíos', recB.length === 0);

  console.log(`\nRESULTADO: ${ok} OK, ${fail} fallas`);
  await client.close();
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
