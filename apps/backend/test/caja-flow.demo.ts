/**
 * Flujo de trabajo: Caja (Fase D) — apertura/cierre con arqueo, cobros y
 * egresos con apertura rápida (si no hay caja abierta, el primer
 * cobro/venta/egreso del día la abre sola — cobros desde 2026-09-03,
 * egresos sumados el 2026-09-14 a pedido del usuario: un caso real, "+
 * Ingresos" de Farmacia generando un egreso automático por la compra a
 * proveedor, podía ser la primera plata del día, antes de cualquier venta,
 * y quedaba rechazado con "abrí la caja primero"), auditoría de cierres con
 * diferencia, liquidación de honorarios y estadísticas del período — contra
 * Postgres real (PGlite/WASM). Llama a las clases reales
 * (CajasService/CobrosService/EgresosService), no una reimplementación de su
 * lógica — así un cambio de comportamiento real (como el de apertura
 * rápida) se refleja acá solo, sin que el test quede "probando una copia"
 * desactualizada.
 *
 * Correr:  pnpm --filter backend test:caja-demo
 */
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { and, eq, isNotNull } from 'drizzle-orm';
import { organizaciones, usuarios } from '../src/database/schema/core';
import { cajas, cobros, egresos } from '../src/database/schema/caja';
import { CajasService } from '../src/caja/cajas/cajas.service';
import { CobrosService } from '../src/caja/cobros/cobros.service';
import { EgresosService } from '../src/caja/egresos/egresos.service';

let ok = 0, fail = 0;
function check(n: string, c: boolean) {
  if (c) { ok++; console.log(`  ✓ ${n}`); } else { fail++; console.log(`  ✗ FALLA: ${n}`); }
}

async function main() {
  const client = new PGlite();
  await client.exec(`
    CREATE SCHEMA core;
    CREATE SCHEMA caja;
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
    CREATE TYPE caja.estado_caja AS ENUM ('abierta','cerrada');
    CREATE TYPE caja.estado_auditoria_caja AS ENUM ('pendiente','aceptado','en_revision','rechazado');
    CREATE TABLE caja.cajas (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organizacion_id uuid NOT NULL REFERENCES core.organizaciones(id) ON DELETE CASCADE,
      abierta_por_usuario_id uuid, cerrada_por_usuario_id uuid,
      monto_inicial numeric(12,2) NOT NULL DEFAULT '0', monto_declarado numeric(12,2), monto_calculado numeric(12,2),
      diferencia numeric(12,2), observaciones_cierre text, estado caja.estado_caja NOT NULL DEFAULT 'abierta',
      estado_auditoria caja.estado_auditoria_caja, observaciones_auditoria text, auditada_por_usuario_id uuid,
      abierta_en timestamptz NOT NULL DEFAULT now(), cerrada_en timestamptz, auditada_en timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz
    );
    CREATE TABLE caja.cobros (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organizacion_id uuid NOT NULL REFERENCES core.organizaciones(id) ON DELETE CASCADE,
      caja_id uuid NOT NULL REFERENCES caja.cajas(id) ON DELETE CASCADE,
      usuario_id uuid, veterinario_id uuid, concepto text NOT NULL, monto numeric(12,2) NOT NULL, metodo_pago text,
      producto_id uuid, cantidad integer, consulta_id uuid,
      liquidado boolean NOT NULL DEFAULT false, liquidado_en timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE caja.egresos (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organizacion_id uuid NOT NULL REFERENCES core.organizaciones(id) ON DELETE CASCADE,
      caja_id uuid NOT NULL REFERENCES caja.cajas(id) ON DELETE CASCADE,
      usuario_id uuid, concepto text NOT NULL, monto numeric(12,2) NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  const db = drizzle(client, { schema: { organizaciones, usuarios, cajas, cobros, egresos } });
  const cajasService = new CajasService(db as any);
  const cobrosService = new CobrosService(db as any, cajasService);
  const egresosService = new EgresosService(db as any, cajasService);

  const [orgA] = await db.insert(organizaciones).values({ nombre: 'Clínica A' }).returning();
  const [orgB] = await db.insert(organizaciones).values({ nombre: 'Clínica B' }).returning();
  // Org aparte para probar la apertura rápida de egresos sin ensuciar a
  // orgB, que las secciones 8/9 usan como "organización limpia" para los
  // chequeos de aislamiento.
  const [orgC] = await db.insert(organizaciones).values({ nombre: 'Clínica C' }).returning();
  const [vet] = await db.insert(usuarios).values({ email: 'vet@a.com', passwordHash: 'x', nombre: 'Ana' }).returning();
  const [staff] = await db.insert(usuarios).values({ email: 'recepcion@a.com', passwordHash: 'x' }).returning();

  console.log('1) Apertura rápida: cobrar sin caja abierta ya no rechaza, abre una sola');
  check('no hay ninguna caja abierta todavía', (await cajasService.actual(orgA.id)) === null);
  const primerCobro = await cobrosService.crear(orgA.id, staff.id, { concepto: 'Consulta', monto: 300, veterinarioId: vet.id } as any);
  const cajaAutoabierta = await cajasService.actual(orgA.id);
  check('el cobro se guardó igual', !!primerCobro.id);
  check('la caja quedó abierta sola, con monto inicial 0', !!cajaAutoabierta && Number(cajaAutoabierta.montoInicial) === 0);
  check('el cobro quedó imputado a esa caja', primerCobro.cajaId === cajaAutoabierta!.id);

  console.log('2) Apertura rápida también para egresos (2026-09-14): el primer egreso del día, sin caja abierta, abre una sola');
  check('orgC no tiene ninguna caja abierta todavía', (await cajasService.actual(orgC.id)) === null);
  const primerEgreso = await egresosService.crear(orgC.id, staff.id, { concepto: 'Compra a proveedor', monto: 10 } as any);
  const cajaAutoabiertaPorEgreso = await cajasService.actual(orgC.id);
  check('el egreso se guardó igual', !!primerEgreso.id);
  check('la caja quedó abierta sola, con monto inicial 0', !!cajaAutoabiertaPorEgreso && Number(cajaAutoabiertaPorEgreso.montoInicial) === 0);
  check('el egreso quedó imputado a esa caja', primerEgreso.cajaId === cajaAutoabiertaPorEgreso!.id);
  check('la respuesta avisa que la caja se abrió recién ahora (cajaAbiertaAhora)', primerEgreso.cajaAbiertaAhora === true);
  const segundoEgreso = await egresosService.crear(orgC.id, staff.id, { concepto: 'Otra compra', monto: 5 } as any);
  check('un egreso con la caja ya abierta NO vuelve a avisar', segundoEgreso.cajaAbiertaAhora === false);
  check('orgB sigue sin ninguna caja (esta prueba no la tocó, sólo a orgC)', (await cajasService.actual(orgB.id)) === null);

  console.log('3) Doble apertura manual se rechaza (la caja de orgA ya está abierta por el paso 1)');
  let rechazoDoble = false;
  try { await cajasService.abrir(orgA.id, staff.id, { montoInicial: 100 } as any); }
  catch (e: any) { rechazoDoble = e?.status === 400 || e?.name === 'BadRequestException'; }
  check('abrir una segunda caja en la misma organización se rechaza', rechazoDoble);

  console.log('4) Más cobros y un egreso en la misma caja');
  await cobrosService.crear(orgA.id, staff.id, { concepto: 'Venta producto', monto: 31, metodoPago: 'tarjeta' } as any);
  await egresosService.crear(orgA.id, staff.id, { concepto: 'Insumos', monto: 50 } as any);
  const cobrosDeLaCaja = await db.select().from(cobros).where(eq(cobros.cajaId, cajaAutoabierta!.id));
  check('quedaron los 2 cobros', cobrosDeLaCaja.length === 2);

  console.log('5) Cierre: cálculo correcto y decisión de auditoría automática');
  const cerradaOk = await cajasService.cerrar(orgA.id, staff.id, cajaAutoabierta!.id, { montoDeclarado: 281 } as any); // 0 + 300 + 31 - 50 = 281
  check('montoCalculado es 281', Number(cerradaOk.montoCalculado) === 281);
  check('sin diferencia, queda aceptado automático', cerradaOk.estadoAuditoria === 'aceptado');

  const c2 = await cajasService.abrir(orgA.id, staff.id, { montoInicial: 100 } as any);
  await cobrosService.crear(orgA.id, staff.id, { concepto: 'x', monto: 50 } as any);
  const cerradaMal = await cajasService.cerrar(orgA.id, staff.id, c2.id, { montoDeclarado: 140 } as any); // esperado 150, declarado 140
  check('con diferencia, diferencia = -10', Number(cerradaMal.diferencia) === -10);
  check('con diferencia, queda pendiente de auditoría', cerradaMal.estadoAuditoria === 'pendiente');

  console.log('6) Auditoría: exige observación salvo al aceptar');
  let rechazoSinObs = false;
  try { await cajasService.auditar(orgA.id, staff.id, c2.id, { estadoAuditoria: 'rechazado' } as any); }
  catch (e: any) { rechazoSinObs = e?.status === 400 || e?.name === 'BadRequestException'; }
  check('rechazar sin observación se rechaza', rechazoSinObs);
  const auditada = await cajasService.auditar(orgA.id, staff.id, c2.id, { estadoAuditoria: 'en_revision', observaciones: 'Voy a hablar con el cajero' } as any);
  check('en_revision con observación se guarda', auditada.estadoAuditoria === 'en_revision');

  console.log('7) Honorarios: listado por profesional y liquidación');
  const hoy = new Date().toISOString().slice(0, 10);
  const antesLiquidar = await cobrosService.honorarios(orgA.id, undefined, undefined, vet.id);
  check('el profesional tiene 1 cobro imputado (el primero, el resto no le imputa veterinario)', antesLiquidar.length === 1);
  check('arranca sin liquidar', antesLiquidar[0].liquidado === false);
  const liquidacion = await cobrosService.liquidar(orgA.id, { veterinarioId: vet.id, desde: '2020-01-01', hasta: `${hoy}T23:59:59` } as any);
  check('liquidar afecta exactamente 1 cobro', liquidacion.cantidad === 1);
  const despuesLiquidar = await cobrosService.honorarios(orgA.id, undefined, undefined, vet.id);
  check('queda marcado como liquidado', despuesLiquidar[0].liquidado === true);
  const segundaLiquidacion = await cobrosService.liquidar(orgA.id, { veterinarioId: vet.id, desde: '2020-01-01', hasta: `${hoy}T23:59:59` } as any);
  check('liquidar de nuevo no afecta nada (ya estaba liquidado)', segundaLiquidacion.cantidad === 0);

  console.log('8) Aislamiento entre organizaciones');
  check('la organización B sigue sin ninguna caja abierta de A', (await cajasService.actual(orgB.id)) === null);
  check('honorarios de orgB no ve nada de orgA', (await cobrosService.honorarios(orgB.id, undefined, undefined, vet.id)).length === 0);

  console.log('9) Estadísticas: totales, por método de pago y por día (nuevo, 2026-09-03)');
  const stats = await cajasService.estadisticas(orgA.id, '2020-01-01', `${hoy}T23:59:59`);
  // Cobros de orgA en todo el flujo: 300 (efectivo/sin especificar) + 31 (tarjeta) + 50 (sin especificar) = 381
  check('totalCobros suma todos los cobros del rango', stats.totalCobros === 381);
  check('totalEgresos suma el único egreso', stats.totalEgresos === 50);
  check('neto = cobros - egresos', stats.neto === 331);
  check('cantidadCobros cuenta las 3 filas (300 + 31 + 50)', stats.cantidadCobros === 3);
  check('cantidadCajas cuenta las 2 cajas abiertas en el rango', stats.cantidadCajas === 2);
  const metodoTarjeta = stats.porMetodoPago.find((m) => m.metodoPago === 'tarjeta');
  check('el desglose por método de pago separa la venta con tarjeta', metodoTarjeta?.total === 31);
  const sinEspecificar = stats.porMetodoPago.find((m) => m.metodoPago === 'sin especificar');
  check('los cobros sin método de pago se agrupan aparte, no se pierden', (sinEspecificar?.total ?? 0) === 350);
  check('el desglose por día tiene una sola fecha (todo el flujo corrió hoy)', stats.porDia.length === 1);
  const statsOtraOrg = await cajasService.estadisticas(orgB.id, '2020-01-01', `${hoy}T23:59:59`);
  check('las estadísticas están aisladas por organización', statsOtraOrg.totalCobros === 0 && statsOtraOrg.totalEgresos === 0);

  console.log('10) normalizarDelDia(): una caja que quedó abierta de un día anterior se cierra sola, sin bloquear al que la disparó');
  const cajaOlvidada = await cajasService.abrir(orgA.id, staff.id, { montoInicial: 200 } as any);
  await cobrosService.crear(orgA.id, staff.id, { concepto: 'Venta de ayer', monto: 100 } as any);
  const anteayer = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
  await db.update(cajas).set({ abiertaEn: anteayer }).where(eq(cajas.id, cajaOlvidada.id));

  const cobroDeHoy = await cobrosService.crear(orgA.id, staff.id, { concepto: 'Venta de hoy', monto: 500 } as any);
  const [cajaOlvidadaTrasNormalizar] = await db.select().from(cajas).where(eq(cajas.id, cajaOlvidada.id));
  check('la caja de ayer quedó cerrada sola', cajaOlvidadaTrasNormalizar.estado === 'cerrada');
  check('sin arqueo humano: montoDeclarado queda sin cargar', cajaOlvidadaTrasNormalizar.montoDeclarado === null);
  check('queda en revisión, no aceptada automáticamente', cajaOlvidadaTrasNormalizar.estadoAuditoria === 'pendiente');
  check('el cálculo sí se hizo (200 inicial + 100 de la venta de ayer)', Number(cajaOlvidadaTrasNormalizar.montoCalculado) === 300);
  check('el cobro de hoy NO quedó imputado a la caja vieja', cobroDeHoy.cajaId !== cajaOlvidada.id);
  const cajaDeHoy = await cajasService.actual(orgA.id);
  check('se abrió una caja nueva para hoy, sola', cajaDeHoy !== null && cajaDeHoy.id === cobroDeHoy.cajaId);

  console.log('11) normalizarDelDia() vía egresos: mismo comportamiento que con cobros, ahora que el egreso también abre una caja nueva sola');
  await cajasService.cerrar(orgA.id, staff.id, cajaDeHoy!.id, { montoDeclarado: 500 } as any); // cerrar la de hoy para dejar el escenario limpio
  const otraOlvidada = await cajasService.abrir(orgA.id, staff.id, { montoInicial: 0 } as any);
  await db.update(cajas).set({ abiertaEn: anteayer }).where(eq(cajas.id, otraOlvidada.id));
  const egresoTrasNormalizar = await egresosService.crear(orgA.id, staff.id, { concepto: 'Insumos de hoy', monto: 20 } as any);
  check('el egreso NO quedó imputado a la caja vieja', egresoTrasNormalizar.cajaId !== otraOlvidada.id);
  check('avisa que abrió una caja nueva sola', egresoTrasNormalizar.cajaAbiertaAhora === true);
  const [otraOlvidadaTrasNormalizar] = await db.select().from(cajas).where(eq(cajas.id, otraOlvidada.id));
  check('la caja vieja quedó cerrada sola por normalizarDelDia()', otraOlvidadaTrasNormalizar.estado === 'cerrada');

  console.log(`\nRESULTADO: ${ok} OK, ${fail} fallas`);
  await client.close();
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
