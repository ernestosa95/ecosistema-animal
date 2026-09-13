/**
 * Definición Drizzle del schema `hce` (Historia Clínica Electrónica).
 * Espejo de db/schema/esquema_ecosistema.sql — mantener en sincronía.
 */
import { pgSchema, uuid, text, timestamp, numeric, date, integer, boolean, time } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { organizaciones, animales, usuarios, personas, especies } from './core';
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
  // Costo de la consulta — obligatorio a nivel DTO desde 2026-09-03, nullable
  // acá para no romper las filas ya cargadas. Es sólo un dato de referencia
  // en la ficha: no genera un cobro automático en caja (el cobro real, con
  // método de pago y demás, se sigue cargando a mano desde Caja — mismo
  // criterio de acoplamiento flojo que la dispensa F4.3).
  costo: numeric('costo', { precision: 12, scale: 2 }),
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
  // Mismo criterio que `consultas.costo`: obligatorio a nivel de DTO desde
  // que se agregó, nullable acá para no romper las filas ya cargadas. Dato
  // de referencia de la ficha — no genera un cobro automático en caja, el
  // cobro real se sigue cargando a mano desde Caja.
  costo: numeric('costo', { precision: 12, scale: 2 }),
  // No nulo = el staff descartó el recordatorio de esta dosis (ej. ya se
  // contactó al dueño y no quiere seguir viéndolo en la lista, o decidió
  // que no aplica). No borra la vacunación ni la próxima dosis — sólo la
  // saca de recordatorios(). Reversible a nivel de datos (columna, no soft
  // delete) aunque hoy no hay UI para deshacer.
  recordatorioDescartadoEn: timestamp('recordatorio_descartado_en', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

// Catálogo de referencia GLOBAL (no por organización, mismo criterio que
// `core.especies` y `farmacia.vademecum_senasa`) de vacunas/antiparasitarios
// comunes por especie — sólo asiste el campo `producto` (texto libre) de
// `vacunaciones` con sugerencias filtradas por la especie del paciente, no
// es una fuente de verdad ni un vínculo real con lo que se registra.
export const catalogoVacunas = hce.table('catalogo_vacunas', {
  id: uuid('id').primaryKey().defaultRandom(),
  especieId: uuid('especie_id')
    .notNull()
    .references(() => especies.id),
  categoria: text('categoria').notNull(),
  nombre: text('nombre').notNull(),
});

// Mismo criterio que `catalogoVacunas` — catálogo de referencia GLOBAL de
// diagnósticos comunes por especie, sólo asiste el campo `diagnostico`
// (texto libre) de `consultas`.
export const catalogoDiagnosticos = hce.table('catalogo_diagnosticos', {
  id: uuid('id').primaryKey().defaultRandom(),
  especieId: uuid('especie_id')
    .notNull()
    .references(() => especies.id),
  categoria: text('categoria').notNull(),
  nombre: text('nombre').notNull(),
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

// Agendas (una por profesional, o sin profesional — ej. "Peluquería canina" en
// una veterinaria que también ofrece ese servicio) con horarios de atención
// recurrentes (agendaBloques) y excepciones puntuales (agendaExcepciones,
// feriados/licencias o aperturas extra). Reemplaza a turnos.veterinarioId:
// el turno pasa a apuntar a una agenda, que puede o no tener un profesional
// asociado — sin duplicar el dato en dos columnas.
export const agendas = hce.table('agendas', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizacionId: uuid('organizacion_id')
    .notNull()
    .references(() => organizaciones.id, { onDelete: 'cascade' }),
  nombre: text('nombre').notNull(),
  // null = agenda sin profesional (recurso/servicio, ej. peluquería).
  usuarioId: uuid('usuario_id').references(() => usuarios.id),
  duracionTurnoMinutos: integer('duracion_turno_minutos').notNull().default(30),
  color: text('color'), // hex opcional, para diferenciar agendas en la UI
  activa: boolean('activa').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

// Horario recurrente semanal de una agenda (ej. "Lunes a Viernes 9 a 13").
export const agendaBloques = hce.table('agenda_bloques', {
  id: uuid('id').primaryKey().defaultRandom(),
  agendaId: uuid('agenda_id')
    .notNull()
    .references(() => agendas.id, { onDelete: 'cascade' }),
  diaSemana: integer('dia_semana').notNull(), // 0=domingo .. 6=sábado (Date#getDay())
  horaInicio: time('hora_inicio').notNull(),
  horaFin: time('hora_fin').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const tipoExcepcionAgenda = hce.enum('tipo_excepcion_agenda', ['cierre', 'apertura_extra']);

// Excepción puntual a una fecha concreta: cierra la agenda entera o una
// franja (feriado, licencia) o abre una ventana extra fuera del horario
// recurrente. `horaInicio`/`horaFin` nulos + tipo='cierre' = día completo.
export const agendaExcepciones = hce.table('agenda_excepciones', {
  id: uuid('id').primaryKey().defaultRandom(),
  agendaId: uuid('agenda_id')
    .notNull()
    .references(() => agendas.id, { onDelete: 'cascade' }),
  fecha: date('fecha').notNull(),
  tipo: tipoExcepcionAgenda('tipo').notNull(),
  horaInicio: time('hora_inicio'),
  horaFin: time('hora_fin'),
  motivo: text('motivo'),
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
  // Nullable a propósito: un turno sin agenda sigue siendo 100% libre (sin
  // validación de horario/solapamiento), igual que todos los turnos hoy.
  agendaId: uuid('agenda_id').references(() => agendas.id),
  fechaHora: timestamp('fecha_hora', { withTimezone: true }).notNull(),
  estado: estadoTurno('estado').notNull().default('solicitado'),
  motivo: text('motivo'),
  canal: text('canal'), // portal, telefono, mostrador
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});
