"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.turnos = exports.vacunaciones = exports.consultas = exports.estadoTurno = exports.hce = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_orm_1 = require("drizzle-orm");
const core_1 = require("./core");
exports.hce = (0, pg_core_1.pgSchema)('hce');
exports.estadoTurno = exports.hce.enum('estado_turno', [
    'solicitado',
    'confirmado',
    'reprogramado',
    'cancelado',
    'atendido',
    'ausente',
]);
exports.consultas = exports.hce.table('consultas', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    organizacionId: (0, pg_core_1.uuid)('organizacion_id')
        .notNull()
        .references(() => core_1.organizaciones.id, { onDelete: 'cascade' }),
    animalId: (0, pg_core_1.uuid)('animal_id')
        .notNull()
        .references(() => core_1.animales.id),
    veterinarioId: (0, pg_core_1.uuid)('veterinario_id').references(() => core_1.usuarios.id),
    fecha: (0, pg_core_1.timestamp)('fecha', { withTimezone: true }).notNull().defaultNow(),
    motivo: (0, pg_core_1.text)('motivo'),
    anamnesis: (0, pg_core_1.text)('anamnesis'),
    examenFisico: (0, pg_core_1.text)('examen_fisico'),
    diagnostico: (0, pg_core_1.text)('diagnostico'),
    tratamiento: (0, pg_core_1.text)('tratamiento'),
    pesoKg: (0, pg_core_1.numeric)('peso_kg', { precision: 6, scale: 2 }),
    temperaturaC: (0, pg_core_1.numeric)('temperatura_c', { precision: 4, scale: 1 }),
    observaciones: (0, pg_core_1.text)('observaciones'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: (0, pg_core_1.timestamp)('deleted_at', { withTimezone: true }),
});
exports.vacunaciones = exports.hce.table('vacunaciones', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    organizacionId: (0, pg_core_1.uuid)('organizacion_id')
        .notNull()
        .references(() => core_1.organizaciones.id, { onDelete: 'cascade' }),
    animalId: (0, pg_core_1.uuid)('animal_id')
        .notNull()
        .references(() => core_1.animales.id),
    veterinarioId: (0, pg_core_1.uuid)('veterinario_id').references(() => core_1.usuarios.id),
    producto: (0, pg_core_1.text)('producto'),
    vademecumId: (0, pg_core_1.uuid)('vademecum_id'),
    fecha: (0, pg_core_1.date)('fecha').notNull().default((0, drizzle_orm_1.sql) `current_date`),
    proximaDosis: (0, pg_core_1.date)('proxima_dosis'),
    loteProducto: (0, pg_core_1.text)('lote_producto'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: (0, pg_core_1.timestamp)('deleted_at', { withTimezone: true }),
});
exports.turnos = exports.hce.table('turnos', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    organizacionId: (0, pg_core_1.uuid)('organizacion_id')
        .notNull()
        .references(() => core_1.organizaciones.id, { onDelete: 'cascade' }),
    animalId: (0, pg_core_1.uuid)('animal_id').references(() => core_1.animales.id),
    personaId: (0, pg_core_1.uuid)('persona_id').references(() => core_1.personas.id),
    veterinarioId: (0, pg_core_1.uuid)('veterinario_id').references(() => core_1.usuarios.id),
    fechaHora: (0, pg_core_1.timestamp)('fecha_hora', { withTimezone: true }).notNull(),
    estado: (0, exports.estadoTurno)('estado').notNull().default('solicitado'),
    motivo: (0, pg_core_1.text)('motivo'),
    canal: (0, pg_core_1.text)('canal'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: (0, pg_core_1.timestamp)('deleted_at', { withTimezone: true }),
});
//# sourceMappingURL=hce.js.map