/**
 * Definición Drizzle del schema `hce` (Historia Clínica Electrónica).
 * Espejo de db/schema/esquema_ecosistema.sql — mantener en sincronía.
 */
import { pgSchema, uuid, text, timestamp, numeric, date, integer, boolean } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { organizaciones, animales, usuarios, personas } from './core';
// Referencia circular con farmacia.ts (que a su vez importa `consultas` de
// acá) — Drizzle soporta esto porque `.references()` recibe un thunk, que
// recién se evalúa en tiempo de consulta, no al cargar el módulo.
import { productos } from './farmacia';

export const hce = pgSchema('hce');

export const estadoTurno = hce.enum('estado_turno', [
  'solicitado',
  'confirmado',
  'reprogramado',
  'cancelado',
  'atendido',
  'ausente',
]);

export const consultas = hce.table('consultas', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizacionId: uuid('organizacion_id')
    .notNull()
    .references(() => organizaciones.id, { onDelete: 'cascade' }),
  animalId: uuid('animal_id')
    .notNull()
    .references(() => animales.id),
  veterinarioId: uuid('veterinario_id').references(() => usuarios.id),
  fecha: timestamp('fecha', { withTimezone: true }).notNull().defaultNow(),
  motivo: text('motivo'),
  anamnesis: text('anamnesis'),
  examenFisico: text('examen_fisico'),
  diagnostico: text('diagnostico'),
  tratamiento: text('tratamiento'),
  pesoKg: numeric('peso_kg', { precision: 6, scale: 2 }),
  temperaturaC: numeric('temperatura_c', { precision: 4, scale: 1 }),
  observaciones: text('observaciones'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const vacunaciones = hce.table('vacunaciones', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizacionId: uuid('organizacion_id')
    .notNull()
    .references(() => organizaciones.id, { onDelete: 'cascade' }),
  animalId: uuid('animal_id')
    .notNull()
    .references(() => animales.id),
  veterinarioId: uuid('veterinario_id').references(() => usuarios.id),
  producto: text('producto'),
  // FK lógica a farmacia.vademecum (se agregará al construir el módulo farmacia)
  vademecumId: uuid('vademecum_id'),
  fecha: date('fecha').notNull().default(sql`current_date`),
  proximaDosis: date('proxima_dosis'),
  loteProducto: text('lote_producto'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const categoriaMacro = hce.enum('categoria_macro', [
  'anamnesis',
  'examenFisico',
  'diagnostico',
  'tratamiento',
]);

// Bloques de texto predefinidos (Fase B, §3.1 del spec UI/UX). Cada
// organización arranca con un catálogo default (sembrado lazy la primera vez
// que pide sus macros, ver MacrosService) y después arma/edita el suyo.
export const macros = hce.table('macros', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizacionId: uuid('organizacion_id')
    .notNull()
    .references(() => organizaciones.id, { onDelete: 'cascade' }),
  categoria: categoriaMacro('categoria').notNull(),
  tag: text('tag').notNull(),
  texto: text('texto').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const origenIndicacion = hce.enum('origen_indicacion', ['stock_interno', 'receta_externa']);

// Indicación/prescripción (Fase B, §3.2 y §3.3 del spec UI/UX): una misma
// entidad cubre tanto el "documento de indicaciones" puntual (duracionDias
// nulo) como un esquema de tratamiento continuo (duracionDias cargado). No
// se acopla al módulo de farmacia: cuando origen = stock_interno, el
// descuento de stock lo dispara el frontend con una segunda llamada a
// POST /farmacia/movimientos (mismo patrón que ya usa DispensaPanel).
export const indicaciones = hce.table('indicaciones', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizacionId: uuid('organizacion_id')
    .notNull()
    .references(() => organizaciones.id, { onDelete: 'cascade' }),
  consultaId: uuid('consulta_id')
    .notNull()
    .references(() => consultas.id),
  // Denormalizado a propósito: el portal público consulta por animalId sin
  // tener que pasar por consultas (mismo criterio que consultaId en
  // farmacia.movimientos_stock, pero a la inversa).
  animalId: uuid('animal_id')
    .notNull()
    .references(() => animales.id),
  origen: origenIndicacion('origen').notNull(),
  productoId: uuid('producto_id').references(() => productos.id), // sólo si origen = stock_interno
  productoNombre: text('producto_nombre'), // sólo si origen = receta_externa (texto libre)
  dosis: text('dosis'), // descripción clínica, ej. "5mg" o "1 comprimido"
  cantidadStock: integer('cantidad_stock'), // sólo si origen = stock_interno, a descontar de farmacia
  frecuencia: text('frecuencia'),
  duracionDias: integer('duracion_dias'), // null = indicación puntual; con valor = esquema continuo
  observaciones: text('observaciones'),
  activo: boolean('activo').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const turnos = hce.table('turnos', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizacionId: uuid('organizacion_id')
    .notNull()
    .references(() => organizaciones.id, { onDelete: 'cascade' }),
  animalId: uuid('animal_id').references(() => animales.id),
  personaId: uuid('persona_id').references(() => personas.id), // solicitante
  veterinarioId: uuid('veterinario_id').references(() => usuarios.id),
  fechaHora: timestamp('fecha_hora', { withTimezone: true }).notNull(),
  estado: estadoTurno('estado').notNull().default('solicitado'),
  motivo: text('motivo'),
  canal: text('canal'), // portal, telefono, mostrador
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});
