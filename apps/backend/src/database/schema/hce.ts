/**
 * Definición Drizzle del schema `hce` (Historia Clínica Electrónica).
 * Espejo de db/schema/esquema_ecosistema.sql — mantener en sincronía.
 */
import { pgSchema, uuid, text, timestamp, numeric, date } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { organizaciones, animales, usuarios, personas } from './core';

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
