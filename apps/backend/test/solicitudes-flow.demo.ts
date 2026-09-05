/**
 * Prueba del flujo de solicitudes de cuenta (SolicitudesService): alta
 * pública con selección de plan obligatoria (rechaza planes inexistentes o
 * deshabilitados para altas nuevas — mismo criterio que AdminService.
 * setAcceso()), aprobación (crea usuario + organización + membresía
 * "propietario", trasladando el plan elegido y activando la organización) y
 * rechazo, contra un Postgres real (PGlite/WASM). Mismo estilo que
 * plataforma-flow.demo.ts.
 *
 * Correr: pnpm --filter backend test:solicitudes-demo
 */
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { eq } from 'drizzle-orm';
import * as core from '../src/database/schema/core';
import * as plataforma from '../src/database/schema/plataforma';
import { SolicitudesService } from '../src/solicitudes/solicitudes.service';

let ok = 0, fail = 0;
const check = (n: string, c: boolean) => { c ? (ok++, console.log(`  ✓ ${n}`)) : (fail++, console.log(`  ✗ FALLA: ${n}`)); };

async function main() {
  const client = new PGlite();
  await client.exec(`
    CREATE SCHEMA core; CREATE SCHEMA plataforma;
    CREATE TYPE core.rol_membresia AS ENUM ('propietario','admin','capataz','veterinario','recepcion');

    CREATE TABLE core.organizaciones (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), nombre text NOT NULL,
      huella_activa boolean NOT NULL DEFAULT true, tropera_activa boolean NOT NULL DEFAULT false, cuit text, direccion text, localidad text, provincia text, telefono text, email text,
      activo boolean NOT NULL DEFAULT true,
      grupo_id uuid, plan_id uuid, acceso_hasta timestamptz, fecha_activacion timestamptz, es_demo boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz);
    CREATE TABLE core.usuarios (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text NOT NULL UNIQUE, password_hash text NOT NULL,
      nombre text, apellido text, dni text, email_verificado boolean NOT NULL DEFAULT false, ultimo_login timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz);
    CREATE TABLE core.membresias (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      usuario_id uuid NOT NULL REFERENCES core.usuarios(id) ON DELETE CASCADE,
      organizacion_id uuid NOT NULL REFERENCES core.organizaciones(id) ON DELETE CASCADE,
      rol core.rol_membresia[] NOT NULL, activo boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz);
    CREATE TABLE core.solicitudes (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tipo text NOT NULL, estado text NOT NULL DEFAULT 'pendiente',
      nombre text NOT NULL, apellido text NOT NULL, dni text, email text NOT NULL, password_hash text NOT NULL, telefono text,
      plan_id uuid,
      nombre_organizacion text, tipo_organizacion text,
      direccion_organizacion text, localidad_organizacion text, provincia_organizacion text, telefono_organizacion text, email_organizacion text,
      organizacion_solicitada text, motivo_rechazo text,
      terminos_aceptados_en timestamptz, terminos_version text,
      created_at timestamptz NOT NULL DEFAULT now(), resolved_at timestamptz, resolved_por uuid REFERENCES core.usuarios(id));

    CREATE TABLE plataforma.planes (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), nombre text NOT NULL,
      precio_mensual numeric(12,2), precio_anual numeric(12,2),
      limites_roles jsonb NOT NULL DEFAULT '{}'::jsonb,
      descripcion text, activo boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz);
  `);

  const db = drizzle(client, { schema: { ...core, ...plataforma } });
  const solicitudesService = new SolicitudesService(db as any);

  const [planActivo] = await db.insert(plataforma.planes).values({
    nombre: 'Plan Estándar', precioMensual: '15000', limitesRoles: { veterinario: 2, recepcion: 1 },
  }).returning();
  const [planInactivo] = await db.insert(plataforma.planes).values({
    nombre: 'Plan Descontinuado', activo: false,
  }).returning();

  console.log('1) planesDisponibles(): sólo devuelve planes habilitados para altas nuevas');
  const disponibles = await solicitudesService.planesDisponibles();
  check('el plan activo aparece', disponibles.some((p) => p.id === planActivo.id));
  check('el plan deshabilitado NO aparece', !disponibles.some((p) => p.id === planInactivo.id));

  const dtoBase = {
    tipo: 'crear' as const,
    terminosAceptados: true,
    nombre: 'Ana', apellido: 'García', email: 'ana@vet.com', password: 'password123',
    telefono: '3511234567', dni: '30111222',
    nombreOrganizacion: 'Veterinaria del Sur', tipoOrganizacion: 'clinica',
  };

  console.log('2) crear(): un plan inexistente se rechaza');
  let rechazadoNoExiste = false;
  try { await solicitudesService.crear({ ...dtoBase, planId: '00000000-0000-0000-0000-000000000000' } as any); }
  catch (e: any) { rechazadoNoExiste = e?.status === 404 || e?.name === 'NotFoundException'; }
  check('plan inexistente → 404', rechazadoNoExiste);

  console.log('3) crear(): un plan deshabilitado para altas nuevas se rechaza');
  let rechazadoInactivo = false;
  try { await solicitudesService.crear({ ...dtoBase, planId: planInactivo.id } as any); }
  catch (e: any) { rechazadoInactivo = e?.status === 400 || e?.name === 'BadRequestException'; }
  check('plan deshabilitado → 400', rechazadoInactivo);

  console.log('4) crear(): con un plan disponible, la solicitud queda pendiente con ese plan guardado');
  const creada = await solicitudesService.crear({ ...dtoBase, planId: planActivo.id } as any);
  check('devuelve ok + id', creada.ok === true && !!creada.id);
  const [solGuardada] = await db.select().from(core.solicitudes).where(eq(core.solicitudes.id, creada.id));
  check('queda pendiente', solGuardada.estado === 'pendiente');
  check('el plan elegido se guardó', solGuardada.planId === planActivo.id);

  console.log('5) crear(): mismo email con una solicitud pendiente se rechaza (evita duplicados)');
  let rechazadoDuplicado = false;
  try { await solicitudesService.crear({ ...dtoBase, planId: planActivo.id } as any); }
  catch (e: any) { rechazadoDuplicado = e?.status === 409 || e?.name === 'ConflictException'; }
  check('email con solicitud pendiente → 409', rechazadoDuplicado);

  console.log('6) listar(): filtra por estado (pendiente por defecto)');
  const pendientes = await solicitudesService.listar();
  check('aparece la solicitud recién creada', pendientes.some((s) => s.id === creada.id));

  console.log('7) aprobar(): crea la organización con el plan solicitado y la activa (fechaActivacion)');
  const [adminFicticio] = await db.insert(core.usuarios).values({ email: 'admin@plataforma.com', passwordHash: 'x' }).returning();
  await solicitudesService.aprobar(creada.id, adminFicticio.id, {});
  const [orgCreada] = await db.select().from(core.organizaciones).where(eq(core.organizaciones.nombre, 'Veterinaria del Sur'));
  check('se creó la organización', !!orgCreada);
  check('con el plan que se solicitó', orgCreada.planId === planActivo.id);
  check('con fecha de activación seteada (no null)', orgCreada.fechaActivacion != null);
  const [usuarioNuevo] = await db.select().from(core.usuarios).where(eq(core.usuarios.email, 'ana@vet.com'));
  check('se creó el usuario', !!usuarioNuevo);
  const [membresiaNueva] = await db.select().from(core.membresias).where(eq(core.membresias.usuarioId, usuarioNuevo.id));
  check('como propietario de la organización', membresiaNueva?.roles?.includes('propietario'));
  const [solResuelta] = await db.select().from(core.solicitudes).where(eq(core.solicitudes.id, creada.id));
  check('la solicitud queda "aprobada"', solResuelta.estado === 'aprobada');

  console.log('8) aprobar(): una solicitud ya resuelta no se puede volver a aprobar');
  let rechazadoYaResuelta = false;
  try { await solicitudesService.aprobar(creada.id, adminFicticio.id, {}); }
  catch (e: any) { rechazadoYaResuelta = e?.status === 400 || e?.name === 'BadRequestException'; }
  check('reintentar aprobar una solicitud ya resuelta → 400', rechazadoYaResuelta);

  console.log('9) rechazar(): marca la solicitud como rechazada con motivo');
  const otra = await solicitudesService.crear({ ...dtoBase, email: 'otro@vet.com', planId: planActivo.id } as any);
  await solicitudesService.rechazar(otra.id, adminFicticio.id, { motivo: 'No cumple los requisitos' });
  const [solRechazada] = await db.select().from(core.solicitudes).where(eq(core.solicitudes.id, otra.id));
  check('queda "rechazada" con el motivo guardado', solRechazada.estado === 'rechazada' && solRechazada.motivoRechazo === 'No cumple los requisitos');

  console.log(`\nRESULTADO: ${ok} OK, ${fail} fallas`);
  await client.close();
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
