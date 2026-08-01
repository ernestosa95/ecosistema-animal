"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.animales = exports.especies = exports.personas = exports.membresias = exports.usuarios = exports.organizaciones = exports.animalesCodigoSeq = exports.estadoAnimal = exports.sexoAnimal = exports.sexoPersona = exports.rolMembresia = exports.tipoOrganizacion = exports.core = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
exports.core = (0, pg_core_1.pgSchema)('core');
exports.tipoOrganizacion = exports.core.enum('tipo_organizacion', [
    'establecimiento',
    'clinica',
    'mixta',
]);
exports.rolMembresia = exports.core.enum('rol_membresia', [
    'propietario',
    'admin',
    'capataz',
    'veterinario',
    'recepcion',
]);
exports.sexoPersona = exports.core.enum('sexo_persona', ['masculino', 'femenino', 'otro']);
exports.sexoAnimal = exports.core.enum('sexo_animal', ['macho', 'hembra', 'indefinido']);
exports.estadoAnimal = exports.core.enum('estado_animal', ['activo', 'inactivo', 'fallecido']);
exports.animalesCodigoSeq = exports.core.sequence('animales_codigo_seq', { startWith: 1 });
exports.organizaciones = exports.core.table('organizaciones', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    nombre: (0, pg_core_1.text)('nombre').notNull(),
    tipo: (0, exports.tipoOrganizacion)('tipo').notNull().default('clinica'),
    cuit: (0, pg_core_1.text)('cuit'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: (0, pg_core_1.timestamp)('deleted_at', { withTimezone: true }),
});
exports.usuarios = exports.core.table('usuarios', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    email: (0, pg_core_1.text)('email').notNull().unique(),
    passwordHash: (0, pg_core_1.text)('password_hash').notNull(),
    nombre: (0, pg_core_1.text)('nombre'),
    apellido: (0, pg_core_1.text)('apellido'),
    emailVerificado: (0, pg_core_1.boolean)('email_verificado').notNull().default(false),
    ultimoLogin: (0, pg_core_1.timestamp)('ultimo_login', { withTimezone: true }),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: (0, pg_core_1.timestamp)('deleted_at', { withTimezone: true }),
});
exports.membresias = exports.core.table('membresias', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    usuarioId: (0, pg_core_1.uuid)('usuario_id')
        .notNull()
        .references(() => exports.usuarios.id, { onDelete: 'cascade' }),
    organizacionId: (0, pg_core_1.uuid)('organizacion_id')
        .notNull()
        .references(() => exports.organizaciones.id, { onDelete: 'cascade' }),
    rol: (0, exports.rolMembresia)('rol').notNull(),
    activo: (0, pg_core_1.boolean)('activo').notNull().default(true),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: (0, pg_core_1.timestamp)('deleted_at', { withTimezone: true }),
});
exports.personas = exports.core.table('personas', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    organizacionId: (0, pg_core_1.uuid)('organizacion_id')
        .notNull()
        .references(() => exports.organizaciones.id, { onDelete: 'cascade' }),
    usuarioId: (0, pg_core_1.uuid)('usuario_id').references(() => exports.usuarios.id),
    dni: (0, pg_core_1.text)('dni'),
    nombre: (0, pg_core_1.text)('nombre').notNull(),
    apellido: (0, pg_core_1.text)('apellido').notNull(),
    sexo: (0, exports.sexoPersona)('sexo'),
    fechaNacimiento: (0, pg_core_1.date)('fecha_nacimiento'),
    celular: (0, pg_core_1.text)('celular'),
    telefono: (0, pg_core_1.text)('telefono'),
    email: (0, pg_core_1.text)('email'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: (0, pg_core_1.timestamp)('deleted_at', { withTimezone: true }),
});
exports.especies = exports.core.table('especies', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    codigo: (0, pg_core_1.text)('codigo').notNull().unique(),
    nombre: (0, pg_core_1.text)('nombre').notNull(),
});
exports.animales = exports.core.table('animales', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    organizacionId: (0, pg_core_1.uuid)('organizacion_id')
        .notNull()
        .references(() => exports.organizaciones.id, { onDelete: 'cascade' }),
    personaId: (0, pg_core_1.uuid)('persona_id').references(() => exports.personas.id),
    especieId: (0, pg_core_1.uuid)('especie_id')
        .notNull()
        .references(() => exports.especies.id),
    codigoLegible: (0, pg_core_1.text)('codigo_legible').unique(),
    microchip: (0, pg_core_1.text)('microchip').unique(),
    nombre: (0, pg_core_1.text)('nombre').notNull(),
    sexo: (0, exports.sexoAnimal)('sexo'),
    fechaNacimiento: (0, pg_core_1.date)('fecha_nacimiento'),
    fechaNacEstimada: (0, pg_core_1.boolean)('fecha_nac_estimada').notNull().default(false),
    fotoUrl: (0, pg_core_1.text)('foto_url'),
    estado: (0, exports.estadoAnimal)('estado').notNull().default('activo'),
    datosEspecificos: (0, pg_core_1.jsonb)('datos_especificos').notNull().default({}),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: (0, pg_core_1.timestamp)('deleted_at', { withTimezone: true }),
});
//# sourceMappingURL=core.js.map