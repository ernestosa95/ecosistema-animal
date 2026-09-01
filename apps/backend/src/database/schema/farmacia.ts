/**
 * Definición Drizzle del schema `farmacia` (vademécum + stock).
 *
 * MVP básico, mismo patrón que `tropera`: catálogo (productos) + cantidad
 * actual (stock, corrección directa sin historial) + movimientos (ledger
 * transaccional que ajusta stock). A diferencia de Tropera, acá NO hay un
 * "establecimiento" intermedio — el stock es directo de la organización
 * (como consultas/vacunaciones/turnos en `hce`), porque una farmacia de
 * veterinaria no se reparte por campo.
 *
 * F4.3 (dispensa ligada a consulta): NO es una entidad nueva — un movimiento
 * de tipo 'uso' con `consulta_id` cargado ES la dispensa. Se reusa toda la
 * lógica transaccional de movimientos en vez de inventar un concepto
 * paralelo. `consulta_id` es opcional: un 'uso' sin consulta sigue siendo
 * válido (ej. se rompió un frasco, no hubo paciente de por medio).
 *
 * Fuera de alcance a propósito: la FK real desde hce.vacunaciones.vademecum_id
 * hacia acá (hoy es sólo una referencia lógica, sin constraint) — dispensar
 * queda ligado a la consulta, no (todavía) a una vacunación puntual.
 */
import { pgSchema, uuid, text, timestamp, integer, boolean, date, numeric } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { organizaciones, usuarios } from './core';
import { consultas } from './hce';

export const farmacia = pgSchema('farmacia');

export const productos = farmacia.table('productos', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizacionId: uuid('organizacion_id')
    .notNull()
    .references(() => organizaciones.id, { onDelete: 'cascade' }),
  nombre: text('nombre').notNull(),
  presentacion: text('presentacion'), // ej: "frasco 50ml", "caja x10 comp"
  unidad: text('unidad'), // ej: "ml", "comprimidos", "dosis"
  categoria: text('categoria'), // texto libre (antibiótico, antiparasitario, vacuna, ...) — un vademécum real es demasiado variado para un enum cerrado
  // Datos opcionales para la calculadora de dosificación (Fase B, §3.2 del
  // spec UI/UX): cada organización los completa en su propio vademécum a
  // medida que los necesita, no es una tabla de referencia médica universal.
  concentracion: numeric('concentracion', { precision: 10, scale: 3 }),
  unidadConcentracion: text('unidad_concentracion'), // ej: "mg/ml"
  dosisSugeridaMgKg: numeric('dosis_sugerida_mg_kg', { precision: 10, scale: 3 }),
  // Precio de venta unitario (Fase D, §2.6 del spec UI/UX) — opcional: no
  // todos los productos se venden sueltos en mostrador (algunos son sólo
  // insumo clínico, dispensado vía consulta). Se carga/actualiza típicamente
  // desde el flujo de Ingresos, no en el alta del producto (ver precioCompra).
  precio: numeric('precio', { precision: 12, scale: 2 }),
  // Costo de compra al proveedor — separado del precio de venta, ambos por
  // la misma unidad del producto (ver `unidad`). Igual que `precio`, se
  // completa/actualiza desde Ingresos; nunca se infiere del precio de venta.
  precioCompra: numeric('precio_compra', { precision: 12, scale: 2 }),
  // Gatilla mostrar/pedir concentración, unidad de concentración y dosis
  // sugerida en el alta — un insumo no clínico (alimento, accesorios) no
  // tiene por qué completar esos campos.
  esMedicamento: boolean('es_medicamento').notNull().default(false),
  // Informativo por ahora (no cambia la precisión del stock, que sigue
  // siendo entero): distingue insumos que se venden por unidad completa
  // (ej. una cama) de los que se venden por porciones de un bulto mayor
  // (ej. kg de una bolsa de alimento) — ver el flujo de Ingresos.
  esFraccionable: boolean('es_fraccionable').notNull().default(false),
  activo: boolean('activo').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

// Una fila por producto con la cantidad actual. Igual criterio que
// tropera.existencias: sin constraint de unicidad a nivel DB, el service
// busca antes de insertar.
export const stock = farmacia.table('stock', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizacionId: uuid('organizacion_id')
    .notNull()
    .references(() => organizaciones.id, { onDelete: 'cascade' }),
  productoId: uuid('producto_id')
    .notNull()
    .references(() => productos.id, { onDelete: 'cascade' }),
  cantidad: integer('cantidad').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const tipoMovimientoStock = farmacia.enum('tipo_movimiento_stock', [
  'compra',
  'uso',
  'vencimiento',
  'merma',
  // Venta de mostrador (Fase D, §2.5): la dispara `caja.cobros` cuando el
  // cobro referencia un producto — distinta de 'uso' (dispensa ligada a una
  // consulta, F4.3), aunque ambas sean una baja de stock.
  'venta',
]);

// Ledger de movimientos de stock. Igual criterio que tropera.movimientos:
// al crearse, ajusta `stock` en la misma transacción (StockService no,
// MovimientosService sí — ver movimientos.service.ts). compra: alta.
// uso/vencimiento/merma: baja (rechaza si deja cantidad negativa).
export const movimientosStock = farmacia.table('movimientos_stock', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizacionId: uuid('organizacion_id')
    .notNull()
    .references(() => organizaciones.id, { onDelete: 'cascade' }),
  productoId: uuid('producto_id')
    .notNull()
    .references(() => productos.id, { onDelete: 'cascade' }),
  tipo: tipoMovimientoStock('tipo').notNull(),
  cantidad: integer('cantidad').notNull(),
  fecha: date('fecha').notNull().default(sql`current_date`),
  observaciones: text('observaciones'),
  // Sólo se carga cuando el movimiento es una dispensa (F4.3): "esto se usó
  // en esta consulta". Nullable — la mayoría de los movimientos no vienen de
  // una consulta (compras, mermas, vencimientos).
  consultaId: uuid('consulta_id').references(() => consultas.id),
  usuarioId: uuid('usuario_id').references(() => usuarios.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
