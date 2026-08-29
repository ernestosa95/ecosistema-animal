/**
 * Definición Drizzle del schema `plataforma` (información de la plataforma
 * en sí, no de una organización puntual): planes de suscripción, grupos de
 * organizaciones (para poder dirigir mensajes a un conjunto, ej. "cadena de
 * veterinarias") y anuncios/mensajes del super-admin hacia usuarios.
 */
import { pgSchema, uuid, text, numeric, boolean, timestamp } from 'drizzle-orm/pg-core';
import { organizaciones, usuarios } from './core';

export const plataforma = pgSchema('plataforma');

export const planes = plataforma.table('planes', {
  id: uuid('id').primaryKey().defaultRandom(),
  nombre: text('nombre').notNull(),
  precio: numeric('precio', { precision: 12, scale: 2 }),
  descripcion: text('descripcion'),
  activo: boolean('activo').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const gruposOrganizaciones = plataforma.table('grupos_organizaciones', {
  id: uuid('id').primaryKey().defaultRandom(),
  nombre: text('nombre').notNull(),
  descripcion: text('descripcion'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

// destinatarioTipo es texto libre ('todas'|'organizacion'|'grupo'), no enum
// — mismo criterio que core.solicitudes.tipo/estado, evita una migración
// de enum si se agrega un cuarto tipo de destinatario más adelante.
export const mensajes = plataforma.table('mensajes', {
  id: uuid('id').primaryKey().defaultRandom(),
  titulo: text('titulo').notNull(),
  cuerpo: text('cuerpo').notNull(),
  destinatarioTipo: text('destinatario_tipo').notNull(),
  organizacionId: uuid('organizacion_id').references(() => organizaciones.id, { onDelete: 'cascade' }),
  grupoId: uuid('grupo_id').references(() => gruposOrganizaciones.id, { onDelete: 'cascade' }),
  creadoPor: uuid('creado_por').references(() => usuarios.id),
  publicadoEn: timestamp('publicado_en', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

// Sin constraint compuesta (mensajeId, usuarioId) a nivel DB — el service
// busca antes de insertar, mismo patrón que tropera.existencias/farmacia.stock.
export const mensajesLeidos = plataforma.table('mensajes_leidos', {
  id: uuid('id').primaryKey().defaultRandom(),
  mensajeId: uuid('mensaje_id').notNull().references(() => mensajes.id, { onDelete: 'cascade' }),
  usuarioId: uuid('usuario_id').notNull().references(() => usuarios.id, { onDelete: 'cascade' }),
  leidoEn: timestamp('leido_en', { withTimezone: true }).notNull().defaultNow(),
});
