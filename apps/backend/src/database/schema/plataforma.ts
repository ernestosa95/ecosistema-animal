/**
 * Definición Drizzle del schema `plataforma` (información de la plataforma
 * en sí, no de una organización puntual): planes de suscripción, grupos de
 * organizaciones (para poder dirigir mensajes a un conjunto, ej. "cadena de
 * veterinarias") y anuncios/mensajes del super-admin hacia usuarios.
 */
import { pgSchema, uuid, text, numeric, boolean, timestamp, jsonb, date } from 'drizzle-orm/pg-core';
import { organizaciones, usuarios } from './core';

export const plataforma = pgSchema('plataforma');

export const planes = plataforma.table('planes', {
  id: uuid('id').primaryKey().defaultRandom(),
  nombre: text('nombre').notNull(),
  // Precio recurrente mensual. `precioAnual` es opcional y aparte (no un
  // simple ×12 con descuento) porque el descuento por compromiso anual es
  // una decisión comercial del super-admin al cargar el plan, no una regla
  // fija — la web calcula y muestra el % de descuento comparando ambos,
  // pero no lo infiere ni lo fuerza.
  precioMensual: numeric('precio_mensual', { precision: 12, scale: 2 }),
  precioAnual: numeric('precio_anual', { precision: 12, scale: 2 }),
  // Cupo máximo de miembros por rol en las organizaciones de este plan, ej.
  // { "veterinario": 2, "recepcion": 1 } — un rol ausente del objeto no
  // tiene límite. jsonb (no una tabla aparte) porque el conjunto de roles es
  // chico y fijo (los 5 de core.rol_membresia) y no hace falta reportar/unir
  // contra esto, sólo leerlo entero al validar (ver admin.service.ts). Se
  // hace cumplir en AdminService.agregarMiembro()/setRoles().
  limitesRoles: jsonb('limites_roles').notNull().default({}),
  descripcion: text('descripcion'),
  activo: boolean('activo').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

// Registro de pagos recibidos por organización (no hay integración con
// ninguna pasarela todavía). Dos orígenes posibles:
//  - el super-admin lo carga a mano desde /admin al confirmar una
//    transferencia/depósito → nace `confirmado`.
//  - la propia organización lo carga (self-service, `core/organizacion/`)
//    subiendo el comprobante de una transferencia → nace `pendiente`, y el
//    super-admin lo aprueba/rechaza desde la cola en /admin (`revisarPago`).
// `periodo` es siempre el primer día del mes calendario que el pago cubre
// (ej. "2026-09-01"), sin relación con el día-del-mes real de facturación
// de la organización (`organizaciones.fechaActivacion`) — así "¿pagó este
// mes?" es una búsqueda simple por mes calendario, y "próximo vencimiento"
// se calcula aparte a partir de fechaActivacion. Sin soft-delete: un pago
// cargado mal se corrige con una nota en `observaciones`, no se borra un
// cobro real (y un pago rechazado se conserva con `estado: 'rechazado'`,
// no se borra, para que quede historial de qué se intentó cargar).
export const pagos = plataforma.table('pagos', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizacionId: uuid('organizacion_id').notNull().references(() => organizaciones.id, { onDelete: 'cascade' }),
  periodo: date('periodo').notNull(),
  monto: numeric('monto', { precision: 12, scale: 2 }).notNull(),
  fechaPago: timestamp('fecha_pago', { withTimezone: true }).notNull().defaultNow(),
  medioPago: text('medio_pago'),
  observaciones: text('observaciones'),
  registradoPor: uuid('registrado_por').references(() => usuarios.id),
  // 'pendiente' | 'confirmado' | 'rechazado' — texto libre, no enum, mismo
  // criterio que solicitudes.tipo/estado. Default 'confirmado': un pago
  // cargado por el super-admin (el único origen hasta ahora) ya está
  // confirmado por definición.
  estado: text('estado').notNull().default('confirmado'),
  // Sólo se completa en pagos self-service (comprobante de transferencia
  // subido por la organización) — un pago cargado a mano por el super-admin
  // no tiene comprobante adjunto, sólo su propia palabra.
  comprobanteUrl: text('comprobante_url'),
  revisadoPor: uuid('revisado_por').references(() => usuarios.id),
  revisadoEn: timestamp('revisado_en', { withTimezone: true }),
  motivoRechazo: text('motivo_rechazo'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
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

export const tipoEventoUso = plataforma.enum('tipo_evento_uso', ['pantalla', 'accion']);

// Analítica de uso (a pedido del super-admin, para saber qué pantallas y
// acciones usan más los clientes) — ledger de eventos simple, sin joins
// pesados: el frontend dispara un POST fire-and-forget por cada pantalla
// que se abre y por cada acción clave (ver analitica/eventos-uso.service.ts
// para el alta y AdminService.resumenAnalitica() para la agregación). No
// hay borrado ni edición, sólo inserción — se agrega/agrupa en la consulta,
// nunca en la escritura.
export const eventosUso = plataforma.table('eventos_uso', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizacionId: uuid('organizacion_id')
    .notNull()
    .references(() => organizaciones.id, { onDelete: 'cascade' }),
  usuarioId: uuid('usuario_id').references(() => usuarios.id, { onDelete: 'set null' }),
  tipo: tipoEventoUso('tipo').notNull(),
  // Nombre libre de la pantalla/acción (ej. 'turnos', 'nueva-consulta') —
  // texto, no un enum: el catálogo de pantallas/acciones instrumentadas va
  // a crecer con el tiempo y no vale la pena una migración por cada una.
  nombre: text('nombre').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
