/**
 * Definición Drizzle del schema `tropera` (gestión de emprendimientos ganaderos).
 *
 * MVP (F1.1–F1.6): establecimientos + existencias agregadas por categoría +
 * movimientos (altas/bajas/traslados) que las ajustan + eventos sanitarios/
 * reproductivos (sólo registro, no ajustan existencias) — la hacienda se
 * registraba como CONTEOS por categoría, sin fila por cabeza.
 *
 * Fase E (2026-08-29, modelo HÍBRIDO acordado con el usuario antes de
 * codear): se suma seguimiento individual (`animales_campo`) SIN tocar el
 * agregado — `existencias`/`movimientos` siguen funcionando exactamente
 * igual para lo que no está identificado. Un animal con caravana convive
 * con el conteo agregado del resto de la categoría; no hay reconciliación
 * automática entre ambos (cargar un individuo no descuenta `existencias`,
 * son dos formas de registrar hacienda que coexisten a propósito).
 */
import { pgSchema, uuid, text, timestamp, numeric, integer, date, boolean } from 'drizzle-orm/pg-core';
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

// Subdivisión de un establecimiento (Fase E, §5.3 y §7.1 del spec UI/UX).
// No existía nada de esto hasta ahora — Tropera sólo tenía la granularidad
// de establecimiento completo. `capacidadCabezas` queda cargado para un
// futuro semáforo de carga forrajera (Fase 7), no se usa todavía.
export const potreros = tropera.table('potreros', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizacionId: uuid('organizacion_id')
    .notNull()
    .references(() => organizaciones.id, { onDelete: 'cascade' }),
  establecimientoId: uuid('establecimiento_id')
    .notNull()
    .references(() => establecimientos.id, { onDelete: 'cascade' }),
  nombre: text('nombre').notNull(),
  superficieHa: numeric('superficie_ha', { precision: 10, scale: 2 }),
  capacidadCabezas: integer('capacidad_cabezas'),
  observaciones: text('observaciones'),
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

export const estadoAnimalCampo = tropera.enum('estado_animal_campo', [
  'activo',
  'vendido',
  'muerto',
  'transferido',
]);

// Seguimiento individual (Fase E, §5.2 del spec UI/UX): convive con
// `existencias` agregadas, no las reemplaza. `caravana` arranca como
// "TEMP-N" (secuencia `tropera.animales_campo_temp_seq`, consumida igual que
// `core.animales_codigo_seq`) cuando se da de alta sin identificación en el
// campo — `caravanaDefinitiva` queda en false hasta la Bandeja de
// Conciliación (conciliar()), que le asigna la caravana real.
export const animalesCampo = tropera.table('animales_campo', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizacionId: uuid('organizacion_id')
    .notNull()
    .references(() => organizaciones.id, { onDelete: 'cascade' }),
  establecimientoId: uuid('establecimiento_id')
    .notNull()
    .references(() => establecimientos.id, { onDelete: 'cascade' }),
  caravana: text('caravana').notNull(),
  caravanaDefinitiva: boolean('caravana_definitiva').notNull().default(true),
  categoria: categoriaHacienda('categoria').notNull(),
  // Fase E, §5.3: "Apartados Rápidos" — reasignar el potrero es un PATCH
  // normal sobre este campo, no una acción separada. Null = sin asignar a
  // un potrero puntual (animal "suelto" en el establecimiento).
  potreroId: uuid('potrero_id').references(() => potreros.id),
  sexo: text('sexo'),
  estado: estadoAnimalCampo('estado').notNull().default('activo'),
  fechaAlta: date('fecha_alta').notNull().default(sql`current_date`),
  observaciones: text('observaciones'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

// Catálogo normalizado de hallazgos patológicos (Fase E, §6.1 del spec
// UI/UX — "evitando el texto libre en manga"). Mismo patrón que `hce.macros`:
// cada organización arranca con un catálogo default (siembra lazy en
// HallazgosService.listar()) y después arma/edita el suyo.
export const hallazgos = tropera.table('hallazgos', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizacionId: uuid('organizacion_id')
    .notNull()
    .references(() => organizaciones.id, { onDelete: 'cascade' }),
  nombre: text('nombre').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

// "Toros Virtuales / Pajuelas" (Fase E, §6.2): catálogo de genética usada en
// servicios (inseminación/monta) sin que el toro físico esté necesariamente
// cargado como `animales_campo` — filiación genética, no un individuo a
// seguir en el establecimiento.
export const torosVirtuales = tropera.table('toros_virtuales', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizacionId: uuid('organizacion_id')
    .notNull()
    .references(() => organizaciones.id, { onDelete: 'cascade' }),
  nombre: text('nombre').notNull(),
  raza: text('raza'),
  proveedor: text('proveedor'), // empresa de genética / centro de IA, opcional
  observaciones: text('observaciones'),
  activo: boolean('activo').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const resultadoReproductivo = tropera.enum('resultado_reproductivo', ['prenada', 'vacia', 'anestro']);

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
  // Fase E: opcional — un evento puede imputarse a un animal individual en
  // vez de (u además de) la categoría/cantidad agregada del establecimiento.
  animalCampoId: uuid('animal_campo_id').references(() => animalesCampo.id),
  // Fase E, §5.3: período de retiro sanitario/restricción tras un
  // tratamiento — la web/mobile lo usan para la alerta modal antes de
  // procesar de nuevo a ese animal (o a la categoría, si no hay animal puntual).
  retiroHasta: date('retiro_hasta'),
  // Fase E, §6.1: catálogo normalizado en vez de texto libre. Ninguno de los
  // dos exige el otro — un diagnóstico de preñez puede no tener hallazgo, y
  // un hallazgo (ej. en un 'tratamiento') puede no venir de un chequeo reproductivo.
  hallazgoId: uuid('hallazgo_id').references(() => hallazgos.id),
  resultadoReproductivo: resultadoReproductivo('resultado_reproductivo'),
  // Fase E, §6.2: sólo tiene sentido en tipo='servicio' (inseminación/monta).
  toroVirtualId: uuid('toro_virtual_id').references(() => torosVirtuales.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

// Muestreos masivos (Fase E, §6.2): "Interfaz Caravana-Tubo". `tuboNumero`
// se autoincrementa en el cliente cruzando con el último registrado del
// establecimiento (GET .../muestras/ultimo-tubo) — el backend no fuerza
// secuencialidad estricta a nivel de constraint (permitir corregir/rehacer
// una muestra puntual sin bloquear todo el lote), sólo expone el dato para
// que la interfaz alerte sobre saltos.
export const muestras = tropera.table('muestras', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizacionId: uuid('organizacion_id')
    .notNull()
    .references(() => organizaciones.id, { onDelete: 'cascade' }),
  establecimientoId: uuid('establecimiento_id')
    .notNull()
    .references(() => establecimientos.id, { onDelete: 'cascade' }),
  animalCampoId: uuid('animal_campo_id').references(() => animalesCampo.id),
  caravana: text('caravana'), // denormalizado: permite registrar la muestra aunque el animal no esté cargado individualmente
  tuboNumero: integer('tubo_numero').notNull(),
  tipoMuestra: text('tipo_muestra'), // libre: sangre, semen, tejido...
  fecha: date('fecha').notNull().default(sql`current_date`),
  observaciones: text('observaciones'),
  usuarioId: uuid('usuario_id').references(() => usuarios.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

// Evaluación Andrológica (Fase E, §6.2): sólo aplica a un `animal_campo`
// puntual (un toro cargado individualmente) — a diferencia de
// `toros_virtuales` (catálogo de genética externa), acá se evalúa un animal
// propio del establecimiento. `apto` lo calcula el service, no lo manda el
// cliente — regla simplificada (MVP, no reemplaza el criterio del veterinario):
// circunferencia ≥ 30cm Y motilidad ≥ 50% → apto.
export const evaluacionesAndrologicas = tropera.table('evaluaciones_andrologicas', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizacionId: uuid('organizacion_id')
    .notNull()
    .references(() => organizaciones.id, { onDelete: 'cascade' }),
  animalCampoId: uuid('animal_campo_id')
    .notNull()
    .references(() => animalesCampo.id, { onDelete: 'cascade' }),
  circunferenciaEscrotalCm: numeric('circunferencia_escrotal_cm', { precision: 5, scale: 1 }).notNull(),
  motilidadPorcentaje: numeric('motilidad_porcentaje', { precision: 5, scale: 1 }).notNull(),
  apto: boolean('apto').notNull(),
  fecha: date('fecha').notNull().default(sql`current_date`),
  observaciones: text('observaciones'),
  usuarioId: uuid('usuario_id').references(() => usuarios.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Modo Plantilla (Fase E, §5.1): un paquete de tareas ("Vacuna +
// Antiparasitario + Pesaje") que se aplica a un animal en 1-tap — a
// diferencia de un protocolo IATF (abajo), esto crea los `eventos`
// INMEDIATAMENTE (ya se hicieron), no tareas a futuro.
export const plantillasTareas = tropera.table('plantillas_tareas', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizacionId: uuid('organizacion_id')
    .notNull()
    .references(() => organizaciones.id, { onDelete: 'cascade' }),
  nombre: text('nombre').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const plantillaItems = tropera.table('plantilla_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  plantillaId: uuid('plantilla_id')
    .notNull()
    .references(() => plantillasTareas.id, { onDelete: 'cascade' }),
  tipo: tipoEvento('tipo').notNull(),
  producto: text('producto'),
  orden: integer('orden').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Protocolos IATF (Fase E, §6.2 — la parte diferida de E.3): a diferencia de
// una plantilla de tareas, esto genera `tareas` A FUTURO (día 0, día 7, día
// 9...), no eventos ya sucedidos. "Tarea programada" es un concepto nuevo:
// no existía nada parecido en el resto del sistema (los `turnos` de HCE son
// citas, no tareas de campo).
export const protocolosIatf = tropera.table('protocolos_iatf', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizacionId: uuid('organizacion_id')
    .notNull()
    .references(() => organizaciones.id, { onDelete: 'cascade' }),
  nombre: text('nombre').notNull(),
  descripcion: text('descripcion'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const protocoloIatfPasos = tropera.table('protocolo_iatf_pasos', {
  id: uuid('id').primaryKey().defaultRandom(),
  protocoloId: uuid('protocolo_id')
    .notNull()
    .references(() => protocolosIatf.id, { onDelete: 'cascade' }),
  diaOffset: integer('dia_offset').notNull(), // día relativo al "día 0" del protocolo (puede ser negativo)
  descripcion: text('descripcion').notNull(),
  producto: text('producto'),
  orden: integer('orden').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const estadoTarea = tropera.enum('estado_tarea', ['pendiente', 'completada', 'cancelada']);

// Tareas programadas a futuro. Se generan en lote al "aplicar" un protocolo
// IATF a un animal (una tarea por paso, con `fechaProgramada` = fecha de
// inicio + diaOffset) — completar una tarea NO crea un evento
// automáticamente todavía (alcance acotado a esta pasada: el veterinario
// carga el evento real por separado cuando corresponde).
export const tareas = tropera.table('tareas', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizacionId: uuid('organizacion_id')
    .notNull()
    .references(() => organizaciones.id, { onDelete: 'cascade' }),
  establecimientoId: uuid('establecimiento_id')
    .notNull()
    .references(() => establecimientos.id, { onDelete: 'cascade' }),
  animalCampoId: uuid('animal_campo_id').references(() => animalesCampo.id),
  protocoloId: uuid('protocolo_id').references(() => protocolosIatf.id),
  descripcion: text('descripcion').notNull(),
  producto: text('producto'),
  fechaProgramada: date('fecha_programada').notNull(),
  estado: estadoTarea('estado').notNull().default('pendiente'),
  observaciones: text('observaciones'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});
