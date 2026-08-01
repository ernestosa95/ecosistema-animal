/**
 * Flujo de trabajo: alta de paciente (animal), ejecutado contra Postgres real
 * (PGlite/WASM) usando el schema `core` real, la secuencia de Postgres y la
 * utilidad `codigo-legible` real — misma lógica que animales.service.ts.
 */
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { and, eq } from 'drizzle-orm';
import { organizaciones, especies, animales } from '../src/database/schema/core';
import {
  validarCodigoLegible,
  generarCodigoLegible,
  resolverIdentificadorExterno,
} from '../src/core/animales/codigo-legible.util';

let ok = 0, fail = 0;
function check(nombre: string, cond: boolean) {
  if (cond) { ok++; console.log(`  ✓ ${nombre}`); }
  else { fail++; console.log(`  ✗ FALLA: ${nombre}`); }
}

async function main() {
const client = new PGlite();
await client.exec(`
  CREATE SCHEMA core;
  CREATE TYPE core.tipo_organizacion AS ENUM ('establecimiento','clinica','mixta');
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
    organizacion_id uuid NOT NULL REFERENCES core.organizaciones(id),
    nombre text NOT NULL, apellido text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz
  );
  CREATE TABLE core.especies (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), codigo text NOT NULL UNIQUE, nombre text NOT NULL
  );
  CREATE TABLE core.animales (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organizacion_id uuid NOT NULL REFERENCES core.organizaciones(id) ON DELETE CASCADE,
    persona_id uuid REFERENCES core.personas(id),
    especie_id uuid NOT NULL REFERENCES core.especies(id),
    codigo_legible text UNIQUE, microchip text UNIQUE,
    nombre text NOT NULL, sexo core.sexo_animal, fecha_nacimiento date,
    fecha_nac_estimada boolean NOT NULL DEFAULT false, foto_url text,
    estado core.estado_animal NOT NULL DEFAULT 'activo',
    datos_especificos jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz
  );
`);

const db = drizzle(client, { schema: { organizaciones, especies, animales } });

// --- Semillas: dos clínicas (tenants) y una especie ---
const [clinicaA] = await db.insert(organizaciones).values({ nombre: 'Clínica A' }).returning();
const [clinicaB] = await db.insert(organizaciones).values({ nombre: 'Clínica B' }).returning();
const [can] = await db.insert(especies).values({ codigo: 'CAN', nombre: 'Canino' }).returning();

// ============ Lógica replicada de AnimalesService.crear ============
async function crear(organizacionId: string, dto: any) {
  const [esp] = await db.select({ codigo: especies.codigo }).from(especies)
    .where(eq(especies.id, dto.especieId)).limit(1);
  if (!esp) throw new Error('La especie indicada no existe');

  const r = await client.query<{ n: string }>("SELECT nextval('core.animales_codigo_seq') AS n");
  const secuencia = Number(r.rows[0].n);
  const codigoLegible = generarCodigoLegible(esp.codigo, secuencia);

  const [animal] = await db.insert(animales).values({
    organizacionId, especieId: dto.especieId, personaId: dto.personaId,
    nombre: dto.nombre, sexo: dto.sexo, fechaNacimiento: dto.fechaNacimiento,
    microchip: dto.microchip, codigoLegible,
    datosEspecificos: dto.datosEspecificos ?? {},
  }).returning();
  return animal;
}

// ============================== Pruebas ==============================
console.log('1) Alta de un paciente');
const firulais = await crear(clinicaA.id, {
  nombre: 'Firulais', especieId: can.id, sexo: 'macho',
  fechaNacimiento: '2021-05-10', datosEspecificos: { raza: 'Labrador', tamaño: 'grande' },
});
console.log(`     código asignado -> ${firulais.codigoLegible}`);
check('se generó un codigo_legible', !!firulais.codigoLegible);
check('el codigo_legible es válido (formato + DV)', validarCodigoLegible(firulais.codigoLegible!));
check('el prefijo corresponde a la especie (CAN)', firulais.codigoLegible!.startsWith('CAN-'));
check('quedó asignado a la organización correcta', firulais.organizacionId === clinicaA.id);
check('los datos específicos (JSONB) se guardaron', (firulais.datosEspecificos as any).raza === 'Labrador');

console.log('2) Aislamiento entre clínicas (multi-tenant)');
const enA = await db.select().from(animales).where(eq(animales.organizacionId, clinicaA.id));
const enB = await db.select().from(animales).where(eq(animales.organizacionId, clinicaB.id));
check('la Clínica A ve a su paciente', enA.length === 1);
check('la Clínica B NO ve pacientes de A', enB.length === 0);

const ajeno = await db.select().from(animales)
  .where(and(eq(animales.id, firulais.id), eq(animales.organizacionId, clinicaB.id))).limit(1);
check('obtener() con otra organización no lo encuentra', ajeno.length === 0);

console.log('3) Paciente con microchip ISO');
const michi = await crear(clinicaA.id, {
  nombre: 'Michi', especieId: can.id, microchip: '941000024630000',
});
check('acepta microchip ISO válido', michi.microchip === '941000024630000');
check('prioriza el microchip como identificador externo',
  resolverIdentificadorExterno(michi.microchip, michi.codigoLegible) === '941000024630000');

console.log('4) Unicidad por secuencia');
const varios = [];
for (let i = 0; i < 5; i++) varios.push(await crear(clinicaA.id, { nombre: `P${i}`, especieId: can.id }));
const codigos = new Set(varios.map((a) => a.codigoLegible));
check('5 altas -> 5 códigos únicos', codigos.size === 5);
check('todos los códigos son válidos', varios.every((a) => validarCodigoLegible(a.codigoLegible!)));

console.log('5) Especie inexistente');
let rechazo = false;
try { await crear(clinicaA.id, { nombre: 'X', especieId: '00000000-0000-0000-0000-000000000000' }); }
catch { rechazo = true; }
check('rechaza crear con una especie inexistente', rechazo);

console.log(`\nRESULTADO: ${ok} OK, ${fail} fallas`);
await client.close();
process.exit(fail === 0 ? 0 : 1);

}

main().catch((e) => { console.error(e); process.exit(1); });
