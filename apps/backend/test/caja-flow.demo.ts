/**
 * Flujo de trabajo: Caja (Fase D) — apertura/cierre con arqueo, cobros
 * (rechazados sin caja abierta), egresos aislados, auditoría de cierres con
 * diferencia, y liquidación de honorarios — contra Postgres real
 * (PGlite/WASM). Misma lógica que cajas/cobros/egresos.service.ts.
 *
 * Correr:  pnpm --filter backend test:caja-demo
 */
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { and, eq, isNotNull, sum } from 'drizzle-orm';
import { organizaciones, usuarios } from '../src/database/schema/core';
import { cajas, cobros, egresos } from '../src/database/schema/caja';

let ok = 0, fail = 0;
function check(n: string, c: boolean) {
  if (c) { ok++; console.log(`  ✓ ${n}`); } else { fail++; console.log(`  ✗ FALLA: ${n}`); }
}

async function main() {
  const client = new PGlite();
  await client.exec(`
    CREATE SCHEMA core;
    CREATE SCHEMA caja;
    CREATE TYPE core.tipo_organizacion AS ENUM ('establecimiento','clinica','mixta');
    CREATE TABLE core.organizaciones (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), nombre text NOT NULL,
      tipo core.tipo_organizacion NOT NULL DEFAULT 'clinica', cuit text, direccion text, localidad text, provincia text, telefono text, email text,
      activo boolean NOT NULL DEFAULT true,
      grupo_id uuid, plan_id uuid, acceso_hasta timestamptz, es_demo boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz
    );
    CREATE TABLE core.usuarios (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text NOT NULL UNIQUE, password_hash text NOT NULL,
      nombre text, apellido text, dni text, email_verificado boolean NOT NULL DEFAULT false, ultimo_login timestamptz,
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
  const [orgA] = await db.insert(organizaciones).values({ nombre: 'Clínica A' }).returning();
  const [orgB] = await db.insert(organizaciones).values({ nombre: 'Clínica B' }).returning();
  const [vet] = await db.insert(usuarios).values({ email: 'vet@a.com', passwordHash: 'x', nombre: 'Ana' }).returning();

  // ---- Lógica replicada de CajasService ----
  async function cajaAbierta(orgId: string) {
    const [c] = await db.select().from(cajas).where(and(eq(cajas.organizacionId, orgId), eq(cajas.estado, 'abierta'))).limit(1);
    return c ?? null;
  }
  async function abrirCaja(orgId: string, montoInicial: number) {
    if (await cajaAbierta(orgId)) throw new Error('Ya hay una caja abierta');
    const [c] = await db.insert(cajas).values({ organizacionId: orgId, montoInicial: montoInicial.toString() }).returning();
    return c;
  }
  async function cerrarCaja(orgId: string, id: string, montoDeclarado: number) {
    const [caja] = await db.select().from(cajas).where(eq(cajas.id, id)).limit(1);
    const [{ total: totalCobros }] = await db.select({ total: sum(cobros.monto) }).from(cobros).where(eq(cobros.cajaId, id));
    const [{ total: totalEgresos }] = await db.select({ total: sum(egresos.monto) }).from(egresos).where(eq(egresos.cajaId, id));
    const calculado = Number(caja.montoInicial) + Number(totalCobros ?? 0) - Number(totalEgresos ?? 0);
    const diferencia = montoDeclarado - calculado;
    const [act] = await db.update(cajas).set({
      estado: 'cerrada', montoDeclarado: montoDeclarado.toString(), montoCalculado: calculado.toString(),
      diferencia: diferencia.toString(), estadoAuditoria: diferencia === 0 ? 'aceptado' : 'pendiente', updatedAt: new Date(),
    }).where(eq(cajas.id, id)).returning();
    return act;
  }
  async function auditar(id: string, estadoAuditoria: string, observaciones?: string) {
    if (estadoAuditoria !== 'aceptado' && !observaciones) throw new Error('Se requiere observación');
    const [act] = await db.update(cajas).set({ estadoAuditoria: estadoAuditoria as any, observacionesAuditoria: observaciones, updatedAt: new Date() }).where(eq(cajas.id, id)).returning();
    return act;
  }

  // ---- Lógica replicada de CobrosService ----
  async function crearCobro(orgId: string, dto: { concepto: string; monto: number; veterinarioId?: string }) {
    const abierta = await cajaAbierta(orgId);
    if (!abierta) throw new Error('No hay una caja abierta');
    const [c] = await db.insert(cobros).values({ organizacionId: orgId, cajaId: abierta.id, concepto: dto.concepto, monto: dto.monto.toString(), veterinarioId: dto.veterinarioId }).returning();
    return c;
  }
  async function crearEgreso(orgId: string, dto: { concepto: string; monto: number }) {
    const abierta = await cajaAbierta(orgId);
    if (!abierta) throw new Error('No hay una caja abierta');
    const [e] = await db.insert(egresos).values({ organizacionId: orgId, cajaId: abierta.id, concepto: dto.concepto, monto: dto.monto.toString() }).returning();
    return e;
  }
  async function honorarios(orgId: string, veterinarioId: string) {
    return db.select().from(cobros).where(and(eq(cobros.organizacionId, orgId), eq(cobros.veterinarioId, veterinarioId), isNotNull(cobros.veterinarioId)));
  }
  async function liquidar(orgId: string, veterinarioId: string) {
    const act = await db.update(cobros).set({ liquidado: true, liquidadoEn: new Date() })
      .where(and(eq(cobros.organizacionId, orgId), eq(cobros.veterinarioId, veterinarioId), eq(cobros.liquidado, false)))
      .returning({ id: cobros.id });
    return act.length;
  }

  // ============================== Pruebas ==============================
  console.log('1) Cobrar/egresar sin caja abierta se rechaza');
  let rechazoSinCaja = false;
  try { await crearCobro(orgA.id, { concepto: 'x', monto: 100 }); } catch { rechazoSinCaja = true; }
  check('cobro sin caja abierta se rechaza', rechazoSinCaja);

  console.log('2) Abrir caja, rechazo de doble apertura');
  const c = await abrirCaja(orgA.id, 500);
  check('caja abierta con monto inicial', Number(c.montoInicial) === 500);
  let rechazoDoble = false;
  try { await abrirCaja(orgA.id, 100); } catch { rechazoDoble = true; }
  check('abrir una segunda caja se rechaza', rechazoDoble);

  console.log('3) Cobros y egresos');
  await crearCobro(orgA.id, { concepto: 'Consulta', monto: 300, veterinarioId: vet.id });
  await crearCobro(orgA.id, { concepto: 'Venta producto', monto: 31 });
  await crearEgreso(orgA.id, { concepto: 'Insumos', monto: 50 });
  const cobrosDeLaCaja = await db.select().from(cobros).where(eq(cobros.cajaId, c.id));
  check('quedaron los 2 cobros', cobrosDeLaCaja.length === 2);

  console.log('4) Cierre: cálculo correcto y decisión de auditoría automática');
  const cerradaOk = await cerrarCaja(orgA.id, c.id, 781); // 500 + 300 + 31 - 50 = 781
  check('montoCalculado es 781', Number(cerradaOk.montoCalculado) === 781);
  check('sin diferencia, queda aceptado automático', cerradaOk.estadoAuditoria === 'aceptado');

  const c2 = await abrirCaja(orgA.id, 100);
  await crearCobro(orgA.id, { concepto: 'x', monto: 50 });
  const cerradaMal = await cerrarCaja(orgA.id, c2.id, 140); // esperado 150, declarado 140
  check('con diferencia, diferencia = -10', Number(cerradaMal.diferencia) === -10);
  check('con diferencia, queda pendiente de auditoría', cerradaMal.estadoAuditoria === 'pendiente');

  console.log('5) Auditoría: exige observación salvo al aceptar');
  let rechazoSinObs = false;
  try { await auditar(c2.id, 'rechazado'); } catch { rechazoSinObs = true; }
  check('rechazar sin observación se rechaza', rechazoSinObs);
  const auditada = await auditar(c2.id, 'en_revision', 'Voy a hablar con el cajero');
  check('en_revision con observación se guarda', auditada.estadoAuditoria === 'en_revision');

  console.log('6) Honorarios: listado por profesional y liquidación');
  const antesLiquidar = await honorarios(orgA.id, vet.id);
  check('el profesional tiene 1 cobro imputado', antesLiquidar.length === 1);
  check('arranca sin liquidar', antesLiquidar[0].liquidado === false);
  const cantidadLiquidada = await liquidar(orgA.id, vet.id);
  check('liquidar afecta exactamente 1 cobro', cantidadLiquidada === 1);
  const despuesLiquidar = await honorarios(orgA.id, vet.id);
  check('queda marcado como liquidado', despuesLiquidar[0].liquidado === true);
  const segundaLiquidacion = await liquidar(orgA.id, vet.id);
  check('liquidar de nuevo no afecta nada (ya estaba liquidado)', segundaLiquidacion === 0);

  console.log('7) Aislamiento entre organizaciones');
  const cajaDeB = await cajaAbierta(orgB.id);
  check('la organización B no tiene ninguna caja abierta de A', cajaDeB === null);

  console.log(`\nRESULTADO: ${ok} OK, ${fail} fallas`);
  await client.close();
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
