/**
 * Prueba del portal del dueño vía magic-link (`apps/backend/src/portal/`,
 * distinto del portal público por código en `hce/portal/`): resumen acotado
 * a la propia persona+organización (incluida `fotoUrl`), solicitud de turno
 * y actualización de la foto de perfil de una mascota — las tres con el
 * mismo chequeo de propiedad (no se puede tocar/ver una mascota que no es
 * del dueño autenticado), contra Postgres real (PGlite/WASM). También cubre
 * PortalCodigoService (tercera vía de acceso, DNI + código corto). Sin test
 * previo de este módulo. No cubre PortalGuard/multer/los controllers (capa
 * HTTP) — eso necesitaría una app Nest completa levantada, fuera del alcance
 * de estos demos que llaman a los services directo.
 *
 * Correr: pnpm --filter backend test:portal-demo
 */
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { eq } from 'drizzle-orm';
import { organizaciones, personas, especies, animales, portalCodigos } from '../src/database/schema/core';
import { turnos, consultas, indicaciones, vacunaciones } from '../src/database/schema/hce';
import { productos } from '../src/database/schema/farmacia';
import { PortalService } from '../src/portal/portal.service';
import { PortalCodigoService } from '../src/portal/portal-codigo.service';

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
      grupo_id uuid, plan_id uuid, acceso_hasta timestamptz, fecha_activacion timestamptz, es_demo boolean NOT NULL DEFAULT false, logo_url text,
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
      producto text, vademecum_id uuid, fecha date NOT NULL DEFAULT current_date, proxima_dosis date, lote_producto text, costo numeric(12,2), recordatorio_descartado_en timestamptz,
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
    CREATE TABLE core.portal_codigos (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      persona_id uuid NOT NULL REFERENCES core.personas(id) ON DELETE CASCADE,
      organizacion_id uuid NOT NULL REFERENCES core.organizaciones(id) ON DELETE CASCADE,
      codigo_hash text NOT NULL, expires_at timestamptz NOT NULL, intentos_fallidos int NOT NULL DEFAULT 0,
      created_at timestamptz NOT NULL DEFAULT now());
  `);

  const db = drizzle(client, { schema: { organizaciones, personas, especies, animales, turnos, consultas, vacunaciones, indicaciones, productos, portalCodigos } });
  const portal = new PortalService(db as any);
  const codigos = new PortalCodigoService(db as any);

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

  console.log('7) PortalCodigoService: generar() exige DNI cargado');
  let rechazadoSinDni = false;
  try {
    await codigos.generar(otroDuenoA.id, orgA.id);
  } catch (e: any) {
    rechazadoSinDni = e?.status === 400;
  }
  check('rechaza con 400 si la persona no tiene DNI', rechazadoSinDni);

  console.log('8) PortalCodigoService: ciclo completo generar() → canjear(), y es reutilizable (no de un solo uso)');
  await db.update(personas).set({ dni: '20.111.222' }).where(eq(personas.id, otroDuenoA.id));
  const emitido1 = await codigos.generar(otroDuenoA.id, orgA.id);
  check('generar() devuelve un código de 8 caracteres', emitido1.codigo.length === 8);
  check('vence en 15 minutos', emitido1.expiraEnMinutos === 15);

  const identidad = await codigos.canjear('20111222', emitido1.codigo);
  check('canjear() con DNI (sin puntos) + código correcto resuelve la persona', identidad.id === otroDuenoA.id);

  const identidadReuso = await codigos.canjear('20.111.222', emitido1.codigo);
  check('el mismo código se puede volver a canjear (no es de un solo uso)', identidadReuso.id === otroDuenoA.id);

  console.log('9) PortalCodigoService: DNI incorrecto se rechaza sin revelar cuál dato falló');
  const emitido2 = await codigos.generar(otroDuenoA.id, orgA.id);
  let rechazadoDniIncorrecto = false;
  try {
    await codigos.canjear('11111111', emitido2.codigo);
  } catch (e: any) {
    rechazadoDniIncorrecto = e?.status === 401;
  }
  check('DNI incorrecto con código correcto se rechaza igual', rechazadoDniIncorrecto);

  console.log('10) PortalCodigoService: un código activo por vez (generar() invalida el anterior)');
  const emitido3 = await codigos.generar(otroDuenoA.id, orgA.id);
  let rechazadoCodigoSuperado = false;
  try {
    await codigos.canjear('20.111.222', emitido2.codigo);
  } catch (e: any) {
    rechazadoCodigoSuperado = e?.status === 401;
  }
  check('el código emitido antes del último queda invalidado', rechazadoCodigoSuperado);

  console.log('11) PortalCodigoService: un código vencido (15 min de inactividad) se rechaza');
  const [vigente] = await db.select().from(portalCodigos).where(eq(portalCodigos.personaId, otroDuenoA.id));
  await db.update(portalCodigos).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(portalCodigos.id, vigente.id));
  let rechazadoVencido = false;
  try {
    await codigos.canjear('20.111.222', emitido3.codigo);
  } catch (e: any) {
    rechazadoVencido = e?.status === 401;
  }
  check('vencido, no se puede canjear aunque el código sea correcto', rechazadoVencido);

  console.log('12) PortalCodigoService: cada canje exitoso corre la ventana de inactividad 15 min hacia adelante');
  const emitido4 = await codigos.generar(otroDuenoA.id, orgA.id);
  await codigos.canjear('20.111.222', emitido4.codigo);
  // Simula que casi se cumplieron los 15 min desde el canje anterior.
  const [rowCasiVencida] = await db.select().from(portalCodigos).where(eq(portalCodigos.personaId, otroDuenoA.id));
  await db.update(portalCodigos).set({ expiresAt: new Date(Date.now() + 500) }).where(eq(portalCodigos.id, rowCasiVencida.id));
  await codigos.canjear('20.111.222', emitido4.codigo);
  const [rowExtendida] = await db.select().from(portalCodigos).where(eq(portalCodigos.personaId, otroDuenoA.id));
  check(
    'un canje exitoso justo antes de vencer extiende otros 15 min, en vez de dejarlo morir',
    rowExtendida.expiresAt.getTime() > Date.now() + 10 * 60_000,
  );

  console.log(`\nRESULTADO: ${ok} OK, ${fail} fallas`);
  await client.close();
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
