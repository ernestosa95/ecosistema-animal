/**
 * Flujo de trabajo: registro de consultas en la historia clínica de un
 * paciente, incluido el costo (obligatorio desde 2026-09-03 — el DTO lo
 * exige vía class-validator, algo que sólo corre en la capa HTTP real; acá
 * se llama a `ConsultasService` directo, así que los tests que ejercitan
 * "costo faltante" simulan el rechazo a mano), contra Postgres real
 * (PGlite/WASM) con los schemas `core` + `hce` reales. Misma lógica que
 * consultas.service.ts (llama a la clase real, no una reimplementación).
 *
 * Correr:  pnpm --filter backend test:hce-demo
 */
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { and, eq } from 'drizzle-orm';
import { organizaciones, usuarios, especies, animales } from '../src/database/schema/core';
import { consultas } from '../src/database/schema/hce';
import { ConsultasService } from '../src/hce/consultas/consultas.service';

let ok = 0, fail = 0;
function check(n: string, c: boolean) {
  if (c) { ok++; console.log(`  ✓ ${n}`); } else { fail++; console.log(`  ✗ FALLA: ${n}`); }
}

async function main() {
  const client = new PGlite();
  await client.exec(`
    CREATE SCHEMA core;
    CREATE SCHEMA hce;
    CREATE TYPE core.sexo_animal AS ENUM ('macho','hembra','indefinido');
    CREATE TYPE core.estado_animal AS ENUM ('activo','inactivo','fallecido');
    CREATE TABLE core.organizaciones (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), nombre text NOT NULL,
      huella_activa boolean NOT NULL DEFAULT true, tropera_activa boolean NOT NULL DEFAULT false, cuit text, direccion text, localidad text, provincia text, telefono text, email text,
      activo boolean NOT NULL DEFAULT true,
      grupo_id uuid, plan_id uuid, acceso_hasta timestamptz, fecha_activacion timestamptz, es_demo boolean NOT NULL DEFAULT false, logo_url text,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz
    );
    CREATE TABLE core.usuarios (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text NOT NULL UNIQUE, password_hash text NOT NULL,
      nombre text, apellido text, dni text, email_verificado boolean NOT NULL DEFAULT false, ultimo_login timestamptz, password_changed_at timestamptz,
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
      peso_kg numeric(6,2), temperatura_c numeric(4,1), observaciones text, costo numeric(12,2),
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz
    );
  `);

  const db = drizzle(client, { schema: { organizaciones, usuarios, especies, animales, consultas } });
  const consultasService = new ConsultasService(db as any);

  const [orgA] = await db.insert(organizaciones).values({ nombre: 'Clínica A' }).returning();
  const [orgB] = await db.insert(organizaciones).values({ nombre: 'Clínica B' }).returning();
  const [vet] = await db.insert(usuarios).values({ email: 'vet@a.com', passwordHash: 'x', nombre: 'Ana' }).returning();
  const [can] = await db.insert(especies).values({ codigo: 'CAN', nombre: 'Canino' }).returning();
  const [firulais] = await db.insert(animales).values({ organizacionId: orgA.id, especieId: can.id, nombre: 'Firulais' }).returning();

  console.log('1) Registrar una consulta con costo');
  const c1 = await consultasService.crear(orgA.id, vet.id, {
    animalId: firulais.id, fecha: '2024-01-15', motivo: 'Control anual',
    diagnostico: 'Sano', tratamiento: 'Vacuna séxtuple', pesoKg: 28.5, costo: 15000,
  } as any);
  check('se creó la consulta', !!c1.id);
  check('quedó en la organización correcta', c1.organizacionId === orgA.id);
  check('registró al veterinario', c1.veterinarioId === vet.id);
  check('guardó el diagnóstico', c1.diagnostico === 'Sano');
  check('guardó el peso (numeric)', Number(c1.pesoKg) === 28.5);
  check('guardó el costo', Number(c1.costo) === 15000);

  console.log('2) Costo 0 (cortesía) se guarda igual que cualquier otro valor, no como "sin costo"');
  const cortesia = await consultasService.crear(orgA.id, vet.id, { animalId: firulais.id, fecha: '2024-03-01', motivo: 'Revisión rápida', costo: 0 } as any);
  check('costo 0 se persiste como 0, no null', cortesia.costo !== null && Number(cortesia.costo) === 0);

  console.log('3) Historia clínica ordenada, con costo visible en cada entrada');
  await consultasService.crear(orgA.id, vet.id, { animalId: firulais.id, fecha: '2024-06-20', motivo: 'Otitis', diagnostico: 'Otitis externa', costo: 8000 } as any);
  const historia = await consultasService.historiaPorAnimal(orgA.id, firulais.id);
  check('la historia tiene 3 consultas', historia.length === 3);
  check('la más reciente aparece primera', historia[0].motivo === 'Otitis');
  check('cada una conserva su propio costo', Number(historia[0].costo) === 8000 && Number(historia[2].costo) === 15000);

  console.log('4) actualizar(): el costo se puede corregir después sin tocar el resto de la consulta');
  const corregida = await consultasService.actualizar(orgA.id, c1.id, { costo: 16500 } as any);
  check('el costo quedó actualizado', Number(corregida.costo) === 16500);
  check('el resto de los datos no se tocó', corregida.diagnostico === 'Sano' && corregida.motivo === 'Control anual');

  console.log('5) Aislamiento entre clínicas');
  let rechazoCruzado = false;
  try { await consultasService.crear(orgB.id, vet.id, { animalId: firulais.id, motivo: 'Intruso', costo: 100 } as any); }
  catch (e: any) { rechazoCruzado = e?.status === 404 || e?.name === 'NotFoundException'; }
  check('otra clínica NO puede cargar consultas a este paciente', rechazoCruzado);

  let noEncontradaCruzada = false;
  try { await consultasService.obtener(orgB.id, c1.id); }
  catch (e: any) { noEncontradaCruzada = e?.status === 404 || e?.name === 'NotFoundException'; }
  check('obtener() con otra organización no la encuentra', noEncontradaCruzada);

  console.log('6) Paciente inexistente');
  let rechazoAnimal = false;
  try { await consultasService.crear(orgA.id, vet.id, { animalId: '00000000-0000-0000-0000-000000000000', motivo: 'X', costo: 100 } as any); }
  catch (e: any) { rechazoAnimal = e?.status === 404 || e?.name === 'NotFoundException'; }
  check('rechaza consulta sobre un paciente inexistente', rechazoAnimal);

  console.log('7) porRango(): trae el costo junto con el resto (drill-down del dashboard)');
  const rango = await consultasService.porRango(orgA.id);
  check('devuelve las 3 consultas de la organización', rango.length === 3);
  check('cada fila del drill-down incluye el costo', rango.every((r: any) => r.costo !== undefined));

  console.log(`\nRESULTADO: ${ok} OK, ${fail} fallas`);
  await client.close();
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
