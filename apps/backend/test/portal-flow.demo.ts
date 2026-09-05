/**
 * Prueba del portal del dueño vía magic-link (`apps/backend/src/portal/`,
 * distinto del portal público por código en `hce/portal/`): resumen acotado
 * a la propia persona+organización (incluida `fotoUrl`), solicitud de turno
 * y actualización de la foto de perfil de una mascota — las tres con el
 * mismo chequeo de propiedad (no se puede tocar/ver una mascota que no es
 * del dueño autenticado), contra Postgres real (PGlite/WASM). Sin test
 * previo de este módulo. No cubre PortalGuard/multer (capa HTTP) — eso
 * necesitaría una app Nest completa levantada, fuera del alcance de estos
 * demos que llaman al service directo.
 *
 * Correr: pnpm --filter backend test:portal-demo
 */
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { eq } from 'drizzle-orm';
import { organizaciones, personas, especies, animales } from '../src/database/schema/core';
import { turnos, consultas, indicaciones, vacunaciones } from '../src/database/schema/hce';
import { productos } from '../src/database/schema/farmacia';
import { PortalService } from '../src/portal/portal.service';

let ok = 0, fail = 0;
const check = (n: string, c: boolean) => { c ? (ok++, console.log(`  ✓ ${n}`)) : (fail++, console.log(`  ✗ FALLA: ${n}`)); };

async function main() {
  const client = new PGlite();
  await client.exec(`
    CREATE SCHEMA core; CREATE SCHEMA hce; CREATE SCHEMA farmacia;
    CREATE TYPE core.sexo_animal AS ENUM ('macho','hembra','indefinido');
    CREATE TYPE core.estado_animal AS ENUM ('activo','inactivo','fallecido');
    CREATE TYPE core.sexo_persona AS ENUM ('masculino','femenino','otro');
    CREATE TYPE hce.estado_turno AS ENUM ('solicitado','confirmado','reprogramado','cancelado','atendido','ausente');
    CREATE TYPE hce.origen_indicacion AS ENUM ('stock_interno','receta_externa');

    CREATE TABLE core.organizaciones (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), nombre text NOT NULL,
      huella_activa boolean NOT NULL DEFAULT true, tropera_activa boolean NOT NULL DEFAULT false, cuit text, direccion text, localidad text, provincia text, telefono text, email text,
      activo boolean NOT NULL DEFAULT true,
      grupo_id uuid, plan_id uuid, acceso_hasta timestamptz, fecha_activacion timestamptz, es_demo boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz);
    CREATE TABLE core.personas (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organizacion_id uuid NOT NULL REFERENCES core.organizaciones(id), usuario_id uuid, dni text,
      nombre text NOT NULL, apellido text NOT NULL, sexo core.sexo_persona, fecha_nacimiento date,
      celular text, telefono text, email text, domicilio text,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz);
    CREATE TABLE core.especies (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), codigo text NOT NULL UNIQUE, nombre text NOT NULL);
    CREATE TABLE core.animales (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organizacion_id uuid NOT NULL REFERENCES core.organizaciones(id) ON DELETE CASCADE,
      persona_id uuid REFERENCES core.personas(id), especie_id uuid NOT NULL REFERENCES core.especies(id),
      codigo_legible text UNIQUE, microchip text UNIQUE, nombre text NOT NULL,
      sexo core.sexo_animal, fecha_nacimiento date, fecha_nac_estimada boolean NOT NULL DEFAULT false,
      foto_url text, estado core.estado_animal NOT NULL DEFAULT 'activo', datos_especificos jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz);
    CREATE TABLE hce.turnos (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organizacion_id uuid NOT NULL REFERENCES core.organizaciones(id) ON DELETE CASCADE,
      animal_id uuid REFERENCES core.animales(id), persona_id uuid REFERENCES core.personas(id),
      agenda_id uuid, fecha_hora timestamptz NOT NULL, estado hce.estado_turno NOT NULL DEFAULT 'solicitado',
      motivo text, canal text,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz);
    CREATE TABLE hce.consultas (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organizacion_id uuid NOT NULL REFERENCES core.organizaciones(id) ON DELETE CASCADE,
      animal_id uuid NOT NULL REFERENCES core.animales(id), veterinario_id uuid,
      fecha timestamptz NOT NULL DEFAULT now(),
      motivo text, anamnesis text, examen_fisico text, diagnostico text, tratamiento text,
      peso_kg numeric(6,2), temperatura_c numeric(4,1), observaciones text, costo numeric(12,2),
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz);
    CREATE TABLE hce.vacunaciones (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organizacion_id uuid NOT NULL REFERENCES core.organizaciones(id) ON DELETE CASCADE,
      animal_id uuid NOT NULL REFERENCES core.animales(id), veterinario_id uuid,
      producto text, vademecum_id uuid, fecha date NOT NULL DEFAULT current_date, proxima_dosis date, lote_producto text, recordatorio_descartado_en timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz);
    CREATE TABLE farmacia.productos (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organizacion_id uuid NOT NULL REFERENCES core.organizaciones(id) ON DELETE CASCADE,
      nombre text NOT NULL, presentacion text, unidad text, categoria text, activo boolean NOT NULL DEFAULT true,
      es_medicamento boolean NOT NULL DEFAULT false, es_fraccionable boolean NOT NULL DEFAULT false,
      concentracion numeric(10,3), unidad_concentracion text, dosis_sugerida_mg_kg numeric(10,3),
      precio numeric(12,2), precio_compra numeric(12,2),
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz);
    CREATE TABLE hce.indicaciones (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organizacion_id uuid NOT NULL REFERENCES core.organizaciones(id) ON DELETE CASCADE,
      animal_id uuid NOT NULL REFERENCES core.animales(id), consulta_id uuid,
      producto_id uuid REFERENCES farmacia.productos(id), origen hce.origen_indicacion NOT NULL DEFAULT 'stock_interno',
      producto_nombre text, dosis text, frecuencia text, duracion_dias int, activo boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz);
  `);

  const db = drizzle(client, { schema: { organizaciones, personas, especies, animales, turnos, consultas, vacunaciones, indicaciones, productos } });
  const portal = new PortalService(db as any);

  const [orgA] = await db.insert(organizaciones).values({ nombre: 'Vet A' }).returning();
  const [orgB] = await db.insert(organizaciones).values({ nombre: 'Vet B' }).returning();
  const [duenoA] = await db.insert(personas).values({ organizacionId: orgA.id, nombre: 'Marta', apellido: 'Ruiz' }).returning();
  const [otroDuenoA] = await db.insert(personas).values({ organizacionId: orgA.id, nombre: 'Otro', apellido: 'Cliente' }).returning();
  const [can] = await db.insert(especies).values({ codigo: 'CAN', nombre: 'Canino' }).returning();
  const [firulais] = await db.insert(animales).values({
    organizacionId: orgA.id, personaId: duenoA.id, especieId: can.id, nombre: 'Firulais', fotoUrl: null,
  }).returning();
  const [gatoDeOtro] = await db.insert(animales).values({
    organizacionId: orgA.id, personaId: otroDuenoA.id, especieId: can.id, nombre: 'Michi',
  }).returning();

  const ctxDuenoA = { id: duenoA.id, organizacionId: orgA.id, nombre: duenoA.nombre, apellido: duenoA.apellido };

  console.log('1) resumen(): trae las mascotas de la persona, con fotoUrl (null si no tiene)');
  const resumen1 = await portal.resumen(ctxDuenoA);
  check('devuelve exactamente 1 mascota (no la de otro dueño de la misma org)', resumen1.animales.length === 1);
  check('es la mascota correcta', resumen1.animales[0]?.id === firulais.id);
  check('fotoUrl viene null cuando todavía no cargó ninguna', resumen1.animales[0]?.fotoUrl === null);

  console.log('2) solicitarTurno(): funciona para una mascota propia');
  const turno = await portal.solicitarTurno(ctxDuenoA, {
    animalId: firulais.id, fechaPreferida: new Date(Date.now() + 86_400_000).toISOString(), motivo: 'control',
  } as any);
  check('el turno queda "solicitado"', turno.ok === true && turno.estado === 'solicitado');

  console.log('3) solicitarTurno(): rechaza una mascota que no es del dueño autenticado');
  let rechazadoTurno = false;
  try {
    await portal.solicitarTurno(ctxDuenoA, { animalId: gatoDeOtro.id, fechaPreferida: new Date().toISOString() } as any);
  } catch (e: any) {
    rechazadoTurno = e?.status === 403 || e?.name === 'ForbiddenException';
  }
  check('rechaza con 403', rechazadoTurno);

  console.log('4) actualizarFoto(): sube la foto de una mascota propia y queda reflejada en resumen()');
  const r = await portal.actualizarFoto(ctxDuenoA, firulais.id, 'http://localhost:3000/uploads/animales/abc.jpg');
  check('devuelve ok + la url', r.ok === true && r.fotoUrl.endsWith('abc.jpg'));
  const [animalActualizado] = await db.select({ fotoUrl: animales.fotoUrl }).from(animales).where(eq(animales.id, firulais.id));
  check('quedó guardada en la fila del animal', animalActualizado.fotoUrl === r.fotoUrl);
  const resumen2 = await portal.resumen(ctxDuenoA);
  check('resumen() ya la refleja', resumen2.animales[0]?.fotoUrl === r.fotoUrl);

  console.log('5) actualizarFoto(): rechaza una mascota que no es del dueño autenticado');
  let rechazadoFoto = false;
  try {
    await portal.actualizarFoto(ctxDuenoA, gatoDeOtro.id, 'http://localhost:3000/uploads/animales/otra.jpg');
  } catch (e: any) {
    rechazadoFoto = e?.status === 403 || e?.name === 'ForbiddenException';
  }
  check('rechaza con 403', rechazadoFoto);
  const [gatoSinTocar] = await db.select({ fotoUrl: animales.fotoUrl }).from(animales).where(eq(animales.id, gatoDeOtro.id));
  check('la foto del animal ajeno no se tocó', gatoSinTocar.fotoUrl === null);

  console.log('6) aislamiento por organización: una persona de otra org nunca ve animales de orgA');
  const [duenoB] = await db.insert(personas).values({ organizacionId: orgB.id, nombre: 'Lucas', apellido: 'Gómez' }).returning();
  const resumenB = await portal.resumen({ id: duenoB.id, organizacionId: orgB.id, nombre: duenoB.nombre, apellido: duenoB.apellido });
  check('resumen de una persona sin mascotas en su org da vacío, no las de orgA', resumenB.animales.length === 0);

  console.log(`\nRESULTADO: ${ok} OK, ${fail} fallas`);
  await client.close();
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
