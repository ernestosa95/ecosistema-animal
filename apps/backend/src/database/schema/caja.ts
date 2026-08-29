/**
 * Definición Drizzle del schema `caja` (Fase D del spec UI/UX: §2.6 caja
 * chica y cierre, §4.1 auditoría de cierres, §4.4 liquidación de honorarios).
 *
 * Alcance acordado con el usuario antes de codear (2026-08-29):
 *  - Una caja diaria por organización (no turnos por usuario/cajero).
 *  - Los cobros llevan un `concepto` de texto libre + monto — no hay un
 *    catálogo de precios de servicios/consultas, sólo `farmacia.productos`
 *    suma un `precio` opcional (para cuando el cobro corresponde a la venta
 *    de un producto puntual).
 *  - Honorarios: reporte exportable por profesional, sin cálculo automático
 *    de comisión — "liquidar" sólo marca los cobros de ese rango como
 *    saldados (`liquidado`), reiniciando el acumulador que suma los no
 *    liquidados.
 *  - Egresos: concepto libre + monto, sin categorías predefinidas.
 * Fuera de alcance a propósito (§2.5, stock fraccionado): vender una
 * fracción de una presentación (ej. 20ml de un frasco de 100ml) con
 * descuento proporcional de stock requeriría modelar la capacidad de cada
 * presentación y no es parte de esta pasada — un cobro ligado a un producto
 * hoy descuenta unidades enteras, igual que el resto de Farmacia.
 */
import { pgSchema, uuid, text, timestamp, numeric, integer, boolean } from 'drizzle-orm/pg-core';
import { organizaciones, usuarios } from './core';
import { consultas } from './hce';
import { productos } from './farmacia';

export const caja = pgSchema('caja');

export const estadoCaja = caja.enum('estado_caja', ['abierta', 'cerrada']);

export const estadoAuditoriaCaja = caja.enum('estado_auditoria_caja', [
  'pendiente',
  'aceptado',
  'en_revision',
  'rechazado',
]);

// Una fila por jornada de caja de la organización. `abrir()` rechaza si ya
// hay una `abierta` (chequeo a nivel service, sin constraint de DB — mismo
// criterio que tropera.existencias/farmacia.stock).
export const cajas = caja.table('cajas', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizacionId: uuid('organizacion_id')
    .notNull()
    .references(() => organizaciones.id, { onDelete: 'cascade' }),
  abiertaPorUsuarioId: uuid('abierta_por_usuario_id').references(() => usuarios.id),
  cerradaPorUsuarioId: uuid('cerrada_por_usuario_id').references(() => usuarios.id),
  montoInicial: numeric('monto_inicial', { precision: 12, scale: 2 }).notNull().default('0'),
  // Cargados recién al cerrar.
  montoDeclarado: numeric('monto_declarado', { precision: 12, scale: 2 }),
  montoCalculado: numeric('monto_calculado', { precision: 12, scale: 2 }),
  diferencia: numeric('diferencia', { precision: 12, scale: 2 }),
  observacionesCierre: text('observaciones_cierre'),
  estado: estadoCaja('estado').notNull().default('abierta'),
  // Null mientras está abierta; al cerrar se fija en 'aceptado' automático si
  // no hubo diferencia, o 'pendiente' (entra a la bandeja de auditoría del
  // propietario/gerente, §4.1) si el arqueo no coincidió.
  estadoAuditoria: estadoAuditoriaCaja('estado_auditoria'),
  observacionesAuditoria: text('observaciones_auditoria'),
  auditadaPorUsuarioId: uuid('auditada_por_usuario_id').references(() => usuarios.id),
  abiertaEn: timestamp('abierta_en', { withTimezone: true }).notNull().defaultNow(),
  cerradaEn: timestamp('cerrada_en', { withTimezone: true }),
  auditadaEn: timestamp('auditada_en', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

// Ingresos. `veterinarioId` es a quién se le imputa el cobro para la
// liquidación de honorarios (§4.4) — opcional, un cobro de mostrador sin
// profesional asociado (ej. venta de un producto sin atención) no lo lleva.
export const cobros = caja.table('cobros', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizacionId: uuid('organizacion_id')
    .notNull()
    .references(() => organizaciones.id, { onDelete: 'cascade' }),
  cajaId: uuid('caja_id')
    .notNull()
    .references(() => cajas.id, { onDelete: 'cascade' }),
  usuarioId: uuid('usuario_id').references(() => usuarios.id), // quién cobró
  veterinarioId: uuid('veterinario_id').references(() => usuarios.id), // a quién se le imputa (honorarios)
  concepto: text('concepto').notNull(),
  monto: numeric('monto', { precision: 12, scale: 2 }).notNull(),
  metodoPago: text('metodo_pago'), // libre: efectivo/tarjeta/transferencia/...
  // Opcional: si el cobro corresponde a la venta de un producto de Farmacia,
  // se dispara además un movimiento de stock tipo 'venta' (ver farmacia.ts).
  productoId: uuid('producto_id').references(() => productos.id),
  cantidad: integer('cantidad'),
  consultaId: uuid('consulta_id').references(() => consultas.id), // trazabilidad opcional
  liquidado: boolean('liquidado').notNull().default(false),
  liquidadoEn: timestamp('liquidado_en', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Egresos — "aislados" de los ingresos a propósito (§2.6): tabla separada,
// nunca se mezclan en el mismo listado.
export const egresos = caja.table('egresos', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizacionId: uuid('organizacion_id')
    .notNull()
    .references(() => organizaciones.id, { onDelete: 'cascade' }),
  cajaId: uuid('caja_id')
    .notNull()
    .references(() => cajas.id, { onDelete: 'cascade' }),
  usuarioId: uuid('usuario_id').references(() => usuarios.id),
  concepto: text('concepto').notNull(),
  monto: numeric('monto', { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
