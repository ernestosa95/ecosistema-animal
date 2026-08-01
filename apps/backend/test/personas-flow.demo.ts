/**
 * Flujo de trabajo: alta de dueño (persona) y su asociación con un animal,
 * contra Postgres real (PGlite/WASM) con el schema `core` real.
 * Misma lógica que personas.service.ts + animales.service.ts.
 *
 * Correr:  pnpm --filter backend test:personas-demo
 */
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { and, eq } from 'drizzle-orm';
import { organizaciones, personas, especies, animales } from '../src/database/schema/core';
import { generarCodigoLegible } from '../src/core/animales/codigo-legible.util';

let ok = 0, fail = 0;
function check(n: string, c: boolean) {
  if (c) { ok++; console.log(`  ✓ ${n}`); } else { fail++; console.log(`  ✗ FALLA: ${n}`); }
}

async function main() {
const client = new PGlite();
await client.exec(`
  CREATE SCHEMA core;
  CREATE TYPE core.tipo_organizacion AS ENUM ('establecimiento','clinica','mixta');
  CREATE TYPE core.sexo_persona AS ENUM ('masculino','femenino','otro');
  CREATE TYPE core.sexo_animal AS ENUM ('macho','hembra','indefinido');
  CREATE TYPE core.estado_animal AS ENUM ('activo','inactivo','fallecido');
  CREATE SEQUENCE core.animales_codigo_seq START 1;
  CREATE TABLE core.organizaciones (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), nombre text NOT NULL,
    tipo core.tipo_organizacion NOT NULL DEFAULT 'clinica', cuit text,
    created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz
  );
  CREATE TABLE core.personas (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organizacion_id uuid NOT NULL REFERENCES core.organizaciones(id) ON DELETE CASCADE,
    usuario_id uuid, dni text, nombre text NOT NULL, apellido text NOT NULL,
    sexo core.sexo_persona, fecha_nacimiento date, celular text, telefono text, email text,
    created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz,
    UNIQUE (organizacion_id, dni)
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
`);

const db = drizzle(client, { schema: { organizaciones, personas, especies, animales } });
const [orgA] = await db.insert(organizaciones).values({ nombre: 'Clínica A' }).returning();
const [orgB] = await db.insert(organizaciones).values({ nombre: 'Clínica B' }).returning();
const [can] = await db.insert(especies).values({ codigo: 'CAN', nombre: 'Canino' }).returning();

// ---- Lógica replicada de PersonasService.crear ----
async function crearPersona(orgId: string, dto: any) {
  if (dto.dni) {
    const [ex] = await db.select({ id: personas.id }).from(personas)
      .where(and(eq(personas.organizacionId, orgId), eq(personas.dni, dto.dni))).limit(1);
    if (ex) throw new Error('DNI duplicado en la organización');
  }
  const [p] = await db.insert(personas).values({
    organizacionId: orgId, dni: dto.dni, nombre: dto.nombre, apellido: dto.apellido,
    sexo: dto.sexo, celular: dto.celular, email: dto.email,
  }).returning();
  return p;
}

// ---- Lógica replicada de AnimalesService.crear (con validación de dueño) ----
async function crearAnimal(orgId: string, dto: any) {
  const [esp] = await db.select({ codigo: especies.codigo }).from(especies)
    .where(eq(especies.id, dto.especieId)).limit(1);
  if (!esp) throw new Error('especie inexistente');
  if (dto.personaId) {
    const [d] = await db.select({ id: personas.id }).from(personas)
      .where(and(eq(personas.id, dto.personaId), eq(personas.organizacionId, orgId))).limit(1);
    if (!d) throw new Error('El dueño no pertenece a esta organización');
  }
  const r = await client.query<{ n: string }>("SELECT nextval('core.animales_codigo_seq') AS n");
  const [a] = await db.insert(animales).values({
    organizacionId: orgId, especieId: dto.especieId, personaId: dto.personaId,
    nombre: dto.nombre, codigoLegible: generarCodigoLegible(esp.codigo, Number(r.rows[0].n)),
  }).returning();
  return a;
}

// ============================== Pruebas ==============================
console.log('1) Alta de dueño');
const juan = await crearPersona(orgA.id, {
  dni: '30111222', nombre: 'Juan', apellido: 'Pérez', sexo: 'masculino',
  celular: '11-5555-0000', email: 'juan@mail.com',
});
check('se creó la persona', !!juan.id);
check('quedó en la organización correcta', juan.organizacionId === orgA.id);

console.log('2) DNI único por organización');
let dup = false;
try { await crearPersona(orgA.id, { dni: '30111222', nombre: 'Otro', apellido: 'Juan' }); } catch { dup = true; }
check('rechaza DNI duplicado en la misma clínica', dup);
const juanEnB = await crearPersona(orgB.id, { dni: '30111222', nombre: 'Juan', apellido: 'Homónimo' });
check('permite el mismo DNI en otra clínica (aislamiento)', juanEnB.organizacionId === orgB.id);

console.log('3) Aislamiento entre clínicas');
const enA = await db.select().from(personas).where(eq(personas.organizacionId, orgA.id));
const bVeA = enA.some((p) => p.id === juanEnB.id);
check('la Clínica B no aparece en el listado de A', !bVeA);
const ajeno = await db.select().from(personas)
  .where(and(eq(personas.id, juan.id), eq(personas.organizacionId, orgB.id))).limit(1);
check('obtener() con otra organización no lo encuentra', ajeno.length === 0);

console.log('4) Asociar animal a su dueño');
const firulais = await crearAnimal(orgA.id, { nombre: 'Firulais', especieId: can.id, personaId: juan.id });
check('el animal quedó asociado al dueño', firulais.personaId === juan.id);
const animalesDeJuan = await db.select().from(animales)
  .where(and(eq(animales.organizacionId, orgA.id), eq(animales.personaId, juan.id)));
check('listarAnimales del dueño devuelve su animal', animalesDeJuan.length === 1);

console.log('5) Protección cruzada: dueño de otra clínica');
let cruzado = false;
try { await crearAnimal(orgB.id, { nombre: 'Intruso', especieId: can.id, personaId: juan.id }); } catch { cruzado = true; }
check('rechaza asociar un dueño de otra organización', cruzado);

console.log(`\nRESULTADO: ${ok} OK, ${fail} fallas`);
await client.close();
process.exit(fail === 0 ? 0 : 1);

}

main().catch((e) => { console.error(e); process.exit(1); });
