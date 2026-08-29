/**
 * Definición Drizzle del schema `tropera` (gestión de emprendimientos ganaderos).
 *
 * MVP: establecimientos + existencias agregadas por categoría + movimientos
 * (altas/bajas/traslados) que las ajustan + eventos sanitarios/reproductivos
 * (sólo registro, no ajustan existencias). Decisión de alcance: la hacienda
 * se registra como CONTEOS por categoría (no una fila por cabeza en
 * core.animales) — no hay seguimiento individual todavía.
 */
import { pgSchema, uuid, text, timestamp, numeric, integer, date } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { organizaciones, usuarios } from './core';

export const tropera = pgSchema('tropera');

export const categoriaHacienda = tropera.enum('categoria_hacienda', [
  'vaca',
  'toro',
  'ternero',
  'ternera',
  'vaquillona',
  'novillo',
]);

export const establecimientos = tropera.table('establecimientos', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizacionId: uuid('organizacion_id')
    .notNull()
    .references(() => organizaciones.id, { onDelete: 'cascade' }),
  nombre: text('nombre').notNull(),
  ubicacion: text('ubicacion'),
  superficieHa: numeric('superficie_ha', { precision: 10, scale: 2 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

// Una fila por (establecimiento, categoría) con la cantidad actual. Sin
// constraint compuesta a nivel DB: la unicidad la garantiza el service
// (busca antes de insertar), igual que otros upserts del proyecto.
export const existencias = tropera.table('existencias', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizacionId: uuid('organizacion_id')
    .notNull()
    .references(() => organizaciones.id, { onDelete: 'cascade' }),
  establecimientoId: uuid('establecimiento_id')
    .notNull()
    .references(() => establecimientos.id, { onDelete: 'cascade' }),
  categoria: categoriaHacienda('categoria').notNull(),
  cantidad: integer('cantidad').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const tipoMovimiento = tropera.enum('tipo_movimiento', [
  'nacimiento',
  'compra',
  'muerte',
  'venta',
  'traslado',
]);

// Ledger de movimientos de hacienda. Cada fila, al crearse, ajusta la(s)
// fila(s) de `existencias` correspondientes en la misma transacción
// (MovimientosService.crear) — no es sólo un registro histórico pasivo.
// nacimiento/compra: sólo destino. muerte/venta: sólo origen. traslado: ambos.
export const movimientos = tropera.table('movimientos', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizacionId: uuid('organizacion_id')
    .notNull()
    .references(() => organizaciones.id, { onDelete: 'cascade' }),
  tipo: tipoMovimiento('tipo').notNull(),
  categoria: categoriaHacienda('categoria').notNull(),
  cantidad: integer('cantidad').notNull(),
  establecimientoOrigenId: uuid('establecimiento_origen_id').references(() => establecimientos.id),
  establecimientoDestinoId: uuid('establecimiento_destino_id').references(() => establecimientos.id),
  fecha: date('fecha').notNull().default(sql`current_date`),
  observaciones: text('observaciones'),
  usuarioId: uuid('usuario_id').references(() => usuarios.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const tipoEvento = tropera.enum('tipo_evento', [
  // sanitarios
  'vacunacion',
  'desparasitacion',
  'tratamiento',
  // reproductivos
  'servicio',
  'diagnostico_prenez',
  'destete',
]);

// Eventos sanitarios/reproductivos. A diferencia de `movimientos`, NO ajustan
// `existencias` — son sólo registro (ej. "se vacunaron 40 vacas" no cambia
// cuántas vacas hay). `categoria`/`cantidad` son opcionales: un evento puede
// aplicar a todo el establecimiento sin desglosar por categoría.
export const eventos = tropera.table('eventos', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizacionId: uuid('organizacion_id')
    .notNull()
    .references(() => organizaciones.id, { onDelete: 'cascade' }),
  establecimientoId: uuid('establecimiento_id')
    .notNull()
    .references(() => establecimientos.id, { onDelete: 'cascade' }),
  tipo: tipoEvento('tipo').notNull(),
  categoria: categoriaHacienda('categoria'),
  cantidad: integer('cantidad'),
  producto: text('producto'),
  fecha: date('fecha').notNull().default(sql`current_date`),
  observaciones: text('observaciones'),
  usuarioId: uuid('usuario_id').references(() => usuarios.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});
