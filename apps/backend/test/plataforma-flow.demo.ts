/**
 * Prueba del control de acceso por vencimiento (TenantGuard), de los
 * mensajes de plataforma dirigidos por organización/grupo (MensajesService),
 * del cupo de miembros por rol y de la facturación/pagos por organización
 * (AdminService: setAcceso, registrarPago, resumenPagos, gananciasPorPeriodo),
 * contra un Postgres real (PGlite/WASM). Mismo estilo que sync-flow.demo.ts.
 *
 * Correr: pnpm --filter backend test:plataforma-demo
 */
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import * as core from '../src/database/schema/core';
import * as plataforma from '../src/database/schema/plataforma';
import { eq } from 'drizzle-orm';
import { TenantGuard } from '../src/common/guards/tenant.guard';
import { MensajesService } from '../src/mensajes/mensajes.service';
import { AdminService } from '../src/admin/admin.service';

let ok = 0, fail = 0;
const check = (n: string, c: boolean) => { c ? (ok++, console.log(`  ✓ ${n}`)) : (fail++, console.log(`  ✗ FALLA: ${n}`)); };

function fakeContext(user: { sub: string }, headers: Record<string, string>) {
  const req: any = { user, headers };
  return { switchToHttp: () => ({ getRequest: () => req }) } as any;
}

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

    CREATE TABLE plataforma.planes (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), nombre text NOT NULL,
      precio_mensual numeric(12,2), precio_anual numeric(12,2),
      limites_roles jsonb NOT NULL DEFAULT '{}'::jsonb,
      descripcion text, activo boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz);
    CREATE TABLE plataforma.grupos_organizaciones (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), nombre text NOT NULL, descripcion text,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz);
    CREATE TABLE plataforma.mensajes (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), titulo text NOT NULL, cuerpo text NOT NULL,
      destinatario_tipo text NOT NULL,
      organizacion_id uuid REFERENCES core.organizaciones(id) ON DELETE CASCADE,
      grupo_id uuid REFERENCES plataforma.grupos_organizaciones(id) ON DELETE CASCADE,
      creado_por uuid REFERENCES core.usuarios(id),
      publicado_en timestamptz NOT NULL DEFAULT now(),
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz);
    CREATE TABLE plataforma.mensajes_leidos (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      mensaje_id uuid NOT NULL REFERENCES plataforma.mensajes(id) ON DELETE CASCADE,
      usuario_id uuid NOT NULL REFERENCES core.usuarios(id) ON DELETE CASCADE,
      leido_en timestamptz NOT NULL DEFAULT now());
    CREATE TABLE plataforma.pagos (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organizacion_id uuid NOT NULL REFERENCES core.organizaciones(id) ON DELETE CASCADE,
      periodo date NOT NULL, monto numeric(12,2) NOT NULL,
      fecha_pago timestamptz NOT NULL DEFAULT now(), medio_pago text, observaciones text,
      registrado_por uuid REFERENCES core.usuarios(id),
      created_at timestamptz NOT NULL DEFAULT now());
  `);

  const db = drizzle(client, { schema: { ...core, ...plataforma } });

  // Seed
  const [grupoCadenas] = await db.insert(plataforma.gruposOrganizaciones).values({ nombre: 'Cadena de veterinarias' }).returning();
  const [orgConGrupo] = await db.insert(core.organizaciones).values({ nombre: 'Vet A', grupoId: grupoCadenas.id }).returning();
  const [orgSinGrupo] = await db.insert(core.organizaciones).values({ nombre: 'Vet B (unipersonal)' }).returning();
  const [orgVencida] = await db.insert(core.organizaciones).values({
    nombre: 'Vet C (demo vencida)', accesoHasta: new Date(Date.now() - 24 * 60 * 60 * 1000),
  }).returning();
  const [usuarioA] = await db.insert(core.usuarios).values({ email: 'a@vet.com', passwordHash: 'x' }).returning();
  const [usuarioB] = await db.insert(core.usuarios).values({ email: 'b@vet.com', passwordHash: 'x' }).returning();
  const [usuarioC] = await db.insert(core.usuarios).values({ email: 'c@vet.com', passwordHash: 'x' }).returning();
  await db.insert(core.membresias).values({ usuarioId: usuarioA.id, organizacionId: orgConGrupo.id, roles: ['propietario'] });
  await db.insert(core.membresias).values({ usuarioId: usuarioB.id, organizacionId: orgSinGrupo.id, roles: ['propietario'] });
  await db.insert(core.membresias).values({ usuarioId: usuarioC.id, organizacionId: orgVencida.id, roles: ['propietario'] });

  console.log('1) TenantGuard: organización sin accesoHasta (null) no se ve afectada');
  const guard = new TenantGuard(db as any);
  const ctxA = fakeContext({ sub: usuarioA.id }, { 'x-organizacion-id': orgConGrupo.id });
  let paso = false;
  try { paso = await guard.canActivate(ctxA); } catch { paso = false; }
  check('org sin accesoHasta deja pasar', paso === true);

  console.log('2) TenantGuard: accesoHasta vencido rechaza con 403');
  const ctxC = fakeContext({ sub: usuarioC.id }, { 'x-organizacion-id': orgVencida.id });
  let rechazado = false;
  try { await guard.canActivate(ctxC); } catch (e: any) { rechazado = e?.status === 403 || e?.name === 'ForbiddenException'; }
  check('org con accesoHasta vencido se rechaza', rechazado);

  console.log('3) Mensajes: dirigido a un grupo aparece para un usuario de una org de ese grupo');
  const mensajesService = new MensajesService(db as any);
  await db.insert(plataforma.mensajes).values({
    titulo: 'Aumento de precio', cuerpo: 'El mes que viene sube el precio.',
    destinatarioTipo: 'grupo', grupoId: grupoCadenas.id, creadoPor: usuarioA.id,
  });
  const pendientesA = await mensajesService.pendientes(orgConGrupo.id, usuarioA.id);
  check('el usuario de la org del grupo ve el mensaje', pendientesA.length === 1);

  console.log('4) Mensajes: NO aparece para un usuario de una org fuera de ese grupo');
  const pendientesB = await mensajesService.pendientes(orgSinGrupo.id, usuarioB.id);
  check('el usuario de otra org no ve el mensaje del grupo', pendientesB.length === 0);

  console.log('5) Mensajes: marcar como leído lo saca de "pendientes" (idempotente)');
  await mensajesService.marcarLeido(pendientesA[0].id, usuarioA.id);
  await mensajesService.marcarLeido(pendientesA[0].id, usuarioA.id); // reintento, no debe duplicar/romper
  const pendientesADespues = await mensajesService.pendientes(orgConGrupo.id, usuarioA.id);
  check('ya no aparece como pendiente tras marcarlo leído', pendientesADespues.length === 0);

  console.log('6) Mensajes: broadcast "todas" aparece para cualquier organización');
  await db.insert(plataforma.mensajes).values({
    titulo: 'Nueva funcionalidad', cuerpo: 'Probaste el dashboard nuevo?',
    destinatarioTipo: 'todas', creadoPor: usuarioA.id,
  });
  const pendientesBTodas = await mensajesService.pendientes(orgSinGrupo.id, usuarioB.id);
  check('el broadcast "todas" llega a una org sin grupo', pendientesBTodas.length === 1);

  console.log('7) Planes: cupo por rol (AdminService.agregarMiembro/setRoles/setMiembroActivo)');
  const adminService = new AdminService(db as any);
  const [planConCupo] = await db.insert(plataforma.planes).values({
    nombre: 'Plan Chico', limitesRoles: { veterinario: 1 },
  }).returning();
  await db.update(core.organizaciones).set({ planId: planConCupo.id }).where(eq(core.organizaciones.id, orgConGrupo.id));

  const altaD = await adminService.agregarMiembro(orgConGrupo.id, {
    email: 'd@vet.com', password: 'x', roles: ['veterinario'],
  } as any);
  check('primer veterinario dentro del cupo se agrega sin problema', !!altaD.usuario);

  let rechazadoPorCupo = false;
  try {
    await adminService.agregarMiembro(orgConGrupo.id, { email: 'e@vet.com', password: 'x', roles: ['veterinario'] } as any);
  } catch (e: any) {
    rechazadoPorCupo = e?.status === 400 || e?.name === 'BadRequestException';
  }
  check('un segundo veterinario que excede el cupo del plan se rechaza', rechazadoPorCupo);

  const [membresiaA] = await db.select({ id: core.membresias.id }).from(core.membresias)
    .where(eq(core.membresias.usuarioId, usuarioA.id));
  let setRolesRechazado = false;
  try {
    await adminService.setRoles(orgConGrupo.id, membresiaA.id, ['propietario', 'veterinario'] as any);
  } catch (e: any) {
    setRolesRechazado = e?.status === 400 || e?.name === 'BadRequestException';
  }
  check('asignarle veterinario a otro miembro (setRoles) también respeta el cupo', setRolesRechazado);

  check('un rol sin límite configurado en el plan (recepcion) no tiene tope', true);
  await adminService.agregarMiembro(orgConGrupo.id, { email: 'f@vet.com', password: 'x', roles: ['recepcion'] } as any);
  await adminService.agregarMiembro(orgConGrupo.id, { email: 'g@vet.com', password: 'x', roles: ['recepcion'] } as any);
  const miembrosOrgConGrupo = await adminService.miembros(orgConGrupo.id);
  check('ambas altas de recepcion (sin límite) quedaron cargadas', miembrosOrgConGrupo.filter((m) => m.roles.includes('recepcion')).length === 2);

  const [membresiaD] = await db.select({ id: core.membresias.id }).from(core.membresias)
    .where(eq(core.membresias.usuarioId, (await db.select({ id: core.usuarios.id }).from(core.usuarios).where(eq(core.usuarios.email, 'd@vet.com')))[0].id));
  await adminService.setMiembroActivo(orgConGrupo.id, membresiaD.id, false);
  const altaEDespuesDeLiberarCupo = await adminService.agregarMiembro(orgConGrupo.id, { email: 'e@vet.com', password: 'x', roles: ['veterinario'] } as any);
  check('desactivar al veterinario existente libera el cupo para uno nuevo', !!altaEDespuesDeLiberarCupo.usuario);

  let reactivarRechazado = false;
  try {
    await adminService.setMiembroActivo(orgConGrupo.id, membresiaD.id, true);
  } catch (e: any) {
    reactivarRechazado = e?.status === 400 || e?.name === 'BadRequestException';
  }
  check('reactivar al primer veterinario ahora que el cupo lo ocupa otro se rechaza', reactivarRechazado);

  const altaSinPlan = await adminService.agregarMiembro(orgSinGrupo.id, { email: 'h@vet.com', password: 'x', roles: ['veterinario'] } as any);
  check('una organización sin plan asignado no tiene ningún cupo (agrega sin problema)', !!altaSinPlan.usuario);

  console.log('8) Planes: límite en 0 bloquea el rol por completo (no es lo mismo que "sin límite")');
  await db.update(plataforma.planes).set({ limitesRoles: { capataz: 0 } }).where(eq(plataforma.planes.id, planConCupo.id));
  let capatazRechazado = false;
  try {
    await adminService.agregarMiembro(orgConGrupo.id, { email: 'i@vet.com', password: 'x', roles: ['capataz'] } as any);
  } catch (e: any) {
    capatazRechazado = e?.status === 400 || e?.name === 'BadRequestException';
  }
  check('un rol con límite 0 rechaza cualquier alta, no lo trata como sin límite', capatazRechazado);

  console.log('9) setAcceso: asignar un plan deshabilitado para altas se rechaza; uno habilitado se acepta');
  const [planInactivo] = await db.insert(plataforma.planes).values({ nombre: 'Plan Descontinuado', activo: false }).returning();
  let planInactivoRechazado = false;
  try {
    await adminService.setAcceso(orgSinGrupo.id, { planId: planInactivo.id });
  } catch (e: any) {
    planInactivoRechazado = e?.status === 400 || e?.name === 'BadRequestException';
  }
  check('asignar un plan no disponible para altas se rechaza', planInactivoRechazado);
  const orgTrasIntento = await adminService.setAcceso(orgSinGrupo.id, { planId: planConCupo.id });
  check('asignar un plan disponible sí se acepta', orgTrasIntento.planId === planConCupo.id);

  console.log('10) setAcceso: fechaActivacion define el día de facturación (resumenPagos().proximoVencimiento)');
  const hoy = new Date();
  const hoyUTC = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate()));
  await adminService.setAcceso(orgConGrupo.id, { fechaActivacion: hoyUTC.toISOString() });
  const resumenHoy = await adminService.resumenPagos();
  const filaHoy = resumenHoy.find((r) => r.id === orgConGrupo.id)!;
  check(
    'si la fecha de activación cae hoy, el próximo vencimiento es hoy (no se salta al mes que viene)',
    filaHoy.proximoVencimiento.toISOString().slice(0, 10) === hoyUTC.toISOString().slice(0, 10),
  );
  const ayerUTC = new Date(hoyUTC); ayerUTC.setUTCDate(ayerUTC.getUTCDate() - 1);
  if (ayerUTC.getUTCMonth() === hoyUTC.getUTCMonth()) {
    await adminService.setAcceso(orgSinGrupo.id, { fechaActivacion: ayerUTC.toISOString() });
    const resumenAyer = await adminService.resumenPagos();
    const filaAyer = resumenAyer.find((r) => r.id === orgSinGrupo.id)!;
    const vencAyer = new Date(filaAyer.proximoVencimiento);
    check('si el día de facturación ya pasó este mes, el próximo vencimiento cae el mes que viene', vencAyer > hoyUTC);
  } else {
    check('(salteado: hoy es 1° del mes, "ayer" cruza de mes)', true);
  }

  console.log('11) registrarPago + resumenPagos: "pagó este mes" sólo es true para quien tiene un pago del mes en curso');
  await adminService.registrarPago(orgConGrupo.id, { monto: 15000, medioPago: 'transferencia' });
  const resumenTrasPago = await adminService.resumenPagos();
  const orgConGrupoResumen = resumenTrasPago.find((r) => r.id === orgConGrupo.id)!;
  const orgSinGrupoResumen = resumenTrasPago.find((r) => r.id === orgSinGrupo.id)!;
  check('la organización con el pago registrado figura "pagó este mes"', orgConGrupoResumen.pagoEsteMes === true);
  check('otra organización sin pago sigue "pendiente"', orgSinGrupoResumen.pagoEsteMes === false);
  check('se guarda el monto del último pago', Number(orgConGrupoResumen.montoUltimoPago) === 15000);

  console.log('12) listarPagos: historial de una organización, más reciente primero');
  await adminService.registrarPago(orgConGrupo.id, { periodo: '2020-01-15', monto: 9999, observaciones: 'pago histórico de prueba' });
  const historialOrgConGrupo = await adminService.listarPagos(orgConGrupo.id);
  check('quedan los dos pagos cargados', historialOrgConGrupo.length === 2);
  check('el más reciente (mes actual) aparece primero', new Date(historialOrgConGrupo[0].periodo) > new Date(historialOrgConGrupo[1].periodo));

  console.log('13) gananciasPorPeriodo: agrupa por mes calendario y suma el total histórico');
  const ganancias = await adminService.gananciasPorPeriodo();
  const totalEsperado = 15000 + 9999;
  check('el total acumulado suma todos los pagos cargados en esta prueba', ganancias.totalAcumulado === totalEsperado);
  check('hay al menos dos períodos distintos (mes actual + el histórico de 2020)', ganancias.porPeriodo.length >= 2);

  console.log(`\nRESULTADO: ${ok} OK, ${fail} fallas`);
  await client.close();
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
