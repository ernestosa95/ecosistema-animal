/**
 * Flujo de trabajo: registro de consultas en la historia clínica de un paciente,
 * contra Postgres real (PGlite/WASM) con los schemas `core` + `hce` reales.
 * Misma lógica que consultas.service.ts.
 *
 * Correr:  pnpm --filter backend test:hce-demo
 */
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { and, desc, eq } from 'drizzle-orm';
import { organizaciones, usuarios, especies, animales } from '../src/database/schema/core';
import { consultas } from '../src/database/schema/hce';

let ok = 0, fail = 0;
function check(n: string, c: boolean) {
  if (c) { ok++; console.log(`  ✓ ${n}`); } else { fail++; console.log(`  ✗ FALLA: ${n}`); }
}

async function main() {
  const client = new PGlite();
  await client.exec(`
    CREATE SCHEMA core;
    CREATE SCHEMA hce;
    CREATE TYPE core.tipo_organizacion AS ENUM ('establecimiento','clinica','mixta');
    CREATE TYPE core.sexo_animal AS ENUM ('macho','hembra','indefinido');
    CREATE TYPE core.estado_animal AS ENUM ('activo','inactivo','fallecido');
    CREATE TABLE core.organizaciones (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), nombre text NOT NULL,
      tipo core.tipo_organizacion NOT NULL DEFAULT 'clinica', cuit text,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz
    );
    CREATE TABLE core.usuarios (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text NOT NULL UNIQUE, password_hash text NOT NULL,
      nombre text, apellido text, email_verificado boolean NOT NULL DEFAULT false, ultimo_login timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz
    );
    CREATE TABLE core.personas (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organizacion_id uuid NOT NULL REFERENCES core.organizaciones(id),
      nombre text NOT NULL, apellido text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz
    );
    CREATE TABLE core.especies (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), codigo text NOT NULL UNIQUE, nombre text NOT NULL);
    CREATE TABLE core.animales (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organizacion_id uuid NOT NULL REFERENCES core.organizaciones(id) ON DELETE CASCADE,
      persona_id uuid REFERENCES core.personas(id),
      especie_id uuid NOT NULL REFERENCES core.especies(id),
      codigo_legible text UNIQUE, microchip text UNIQUE, nombre text NOT NULL,
      sexo core.sexo_animal, fecha_nacimiento date, fecha_nac_estimada boolean NOT NULL DEFAULT false,
      foto_url text, estado core.estado_animal NOT NULL DEFAULT 'activo',
      datos_especificos jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz
    );
    CREATE TABLE hce.consultas (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organizacion_id uuid NOT NULL REFERENCES core.organizaciones(id) ON DELETE CASCADE,
      animal_id uuid NOT NULL REFERENCES core.animales(id),
      veterinario_id uuid REFERENCES core.usuarios(id),
      fecha timestamptz NOT NULL DEFAULT now(),
      motivo text, anamnesis text, examen_fisico text, diagnostico text, tratamiento text,
      peso_kg numeric(6,2), temperatura_c numeric(4,1), observaciones text,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz
    );
  `);

  const db = drizzle(client, { schema: { organizaciones, usuarios, especies, animales, consultas } });
  const [orgA] = await db.insert(organizaciones).values({ nombre: 'Clínica A' }).returning();
  const [orgB] = await db.insert(organizaciones).values({ nombre: 'Clínica B' }).returning();
  const [vet] = await db.insert(usuarios).values({ email: 'vet@a.com', passwordHash: 'x', nombre: 'Ana' }).returning();
  const [can] = await db.insert(especies).values({ codigo: 'CAN', nombre: 'Canino' }).returning();
  const [firulais] = await db.insert(animales).values({ organizacionId: orgA.id, especieId: can.id, nombre: 'Firulais' }).returning();

  // ---- Lógica replicada de ConsultasService ----
  async function verificarAnimal(orgId: string, animalId: string) {
    const [a] = await db.select({ id: animales.id }).from(animales)
      .where(and(eq(animales.id, animalId), eq(animales.organizacionId, orgId))).limit(1);
    if (!a) throw new Error('El paciente no existe en esta organización');
  }
  async function crear(orgId: string, vetId: string, dto: any) {
    await verificarAnimal(orgId, dto.animalId);
    const [c] = await db.insert(consultas).values({
      organizacionId: orgId, animalId: dto.animalId, veterinarioId: vetId,
      fecha: dto.fecha ? new Date(dto.fecha) : undefined,
      motivo: dto.motivo, diagnostico: dto.diagnostico, tratamiento: dto.tratamiento,
      pesoKg: dto.pesoKg?.toString(), observaciones: dto.observaciones,
    }).returning();
    return c;
  }
  async function historiaPorAnimal(orgId: string, animalId: string) {
    await verificarAnimal(orgId, animalId);
    return db.select().from(consultas)
      .where(and(eq(consultas.organizacionId, orgId), eq(consultas.animalId, animalId)))
      .orderBy(desc(consultas.fecha));
  }

  // ============================== Pruebas ==============================
  console.log('1) Registrar una consulta');
  const c1 = await crear(orgA.id, vet.id, {
    animalId: firulais.id, fecha: '2024-01-15', motivo: 'Control anual',
    diagnostico: 'Sano', tratamiento: 'Vacuna séxtuple', pesoKg: 28.5,
  });
  check('se creó la consulta', !!c1.id);
  check('quedó en la organización correcta', c1.organizacionId === orgA.id);
  check('registró al veterinario', c1.veterinarioId === vet.id);
  check('guardó el diagnóstico', c1.diagnostico === 'Sano');
  check('guardó el peso (numeric)', Number(c1.pesoKg) === 28.5);

  console.log('2) Historia clínica ordenada');
  await crear(orgA.id, vet.id, { animalId: firulais.id, fecha: '2024-06-20', motivo: 'Otitis', diagnostico: 'Otitis externa' });
  const historia = await historiaPorAnimal(orgA.id, firulais.id);
  check('la historia tiene 2 consultas', historia.length === 2);
  check('la más reciente aparece primera', historia[0].motivo === 'Otitis');

  console.log('3) Aislamiento entre clínicas');
  let rechazoCruzado = false;
  try { await crear(orgB.id, vet.id, { animalId: firulais.id, motivo: 'Intruso' }); } catch { rechazoCruzado = true; }
  check('otra clínica NO puede cargar consultas a este paciente', rechazoCruzado);

  const ajeno = await db.select().from(consultas)
    .where(and(eq(consultas.id, c1.id), eq(consultas.organizacionId, orgB.id))).limit(1);
  check('obtener() con otra organización no la encuentra', ajeno.length === 0);

  console.log('4) Paciente inexistente');
  let rechazoAnimal = false;
  try { await crear(orgA.id, vet.id, { animalId: '00000000-0000-0000-0000-000000000000', motivo: 'X' }); } catch { rechazoAnimal = true; }
  check('rechaza consulta sobre un paciente inexistente', rechazoAnimal);

  console.log(`\nRESULTADO: ${ok} OK, ${fail} fallas`);
  await client.close();
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
