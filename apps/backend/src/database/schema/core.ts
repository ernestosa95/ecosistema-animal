/**
 * Definición Drizzle del schema `core` (tronco común del ecosistema).
 * Espejo de db/schema/esquema_ecosistema.sql — mantener ambos en sincronía.
 */
import {
  pgSchema,
  uuid,
  text,
  boolean,
  date,
  jsonb,
  timestamp,
  numeric,
} from 'drizzle-orm/pg-core';

export const core = pgSchema('core');

// --- Enumerados ---
export const tipoOrganizacion = core.enum('tipo_organizacion', [
  'establecimiento',
  'clinica',
  'mixta',
]);
export const rolMembresia = core.enum('rol_membresia', [
  'propietario',
  'admin',
  'capataz',
  'veterinario',
  'recepcion',
]);
export const sexoPersona = core.enum('sexo_persona', ['masculino', 'femenino', 'otro']);
export const sexoAnimal = core.enum('sexo_animal', ['macho', 'hembra', 'indefinido']);
export const estadoAnimal = core.enum('estado_animal', ['activo', 'inactivo', 'fallecido']);

// --- Secuencia para el codigo_legible del paciente ---
export const animalesCodigoSeq = core.sequence('animales_codigo_seq', { startWith: 1 });

// --- Tablas ---
export const organizaciones = core.table('organizaciones', {
  id: uuid('id').primaryKey().defaultRandom(),
  nombre: text('nombre').notNull(),
  tipo: tipoOrganizacion('tipo').notNull().default('clinica'),
  cuit: text('cuit'),
  activo: boolean('activo').notNull().default(true),
  // grupoId/planId son referencias lógicas a plataforma.grupos_organizaciones/
  // plataforma.planes, sin FK real a nivel DB — plataforma.ts ya importa de
  // core.ts, así que una FK en sentido contrario crearía un ciclo de
  // módulos. Mismo criterio que hce.vacunaciones.vademecum_id → farmacia.productos.
  grupoId: uuid('grupo_id'),
  planId: uuid('plan_id'),
  // Control de acceso de la plataforma: null = sin vencimiento (todas las
  // organizaciones existentes antes de esta columna no se ven afectadas).
  accesoHasta: timestamp('acceso_hasta', { withTimezone: true }),
  esDemo: boolean('es_demo').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const usuarios = core.table('usuarios', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  nombre: text('nombre'),
  apellido: text('apellido'),
  emailVerificado: boolean('email_verificado').notNull().default(false),
  ultimoLogin: timestamp('ultimo_login', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const membresias = core.table('membresias', {
  id: uuid('id').primaryKey().defaultRandom(),
  usuarioId: uuid('usuario_id')
    .notNull()
    .references(() => usuarios.id, { onDelete: 'cascade' }),
  organizacionId: uuid('organizacion_id')
    .notNull()
    .references(() => organizaciones.id, { onDelete: 'cascade' }),
  // Roles apilables: un usuario puede tener más de un rol en la misma
  // organización (ej. recepción + veterinario) sin necesitar cuentas
  // separadas. Arreglo de Postgres en vez de tabla intermedia — conjunto
  // fijo y chico de roles, evita joins en cada lectura.
  roles: rolMembresia('rol').array().notNull(),
  activo: boolean('activo').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const personas = core.table('personas', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizacionId: uuid('organizacion_id')
    .notNull()
    .references(() => organizaciones.id, { onDelete: 'cascade' }),
  usuarioId: uuid('usuario_id').references(() => usuarios.id),
  dni: text('dni'),
  nombre: text('nombre').notNull(),
  apellido: text('apellido').notNull(),
  sexo: sexoPersona('sexo'),
  fechaNacimiento: date('fecha_nacimiento'),
  celular: text('celular'),
  telefono: text('telefono'),
  email: text('email'),
  // Texto libre (calle, número, localidad...), mismo criterio que
  // `tropera.establecimientos.ubicacion` — no se modela por componentes
  // (calle/número/ciudad/CP separados) porque nada en el sistema todavía
  // necesita filtrar/geocodificar por esas partes; el carnet/ficha del
  // animal ya lo imprimía como placeholder, esto lo completa.
  domicilio: text('domicilio'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const especies = core.table('especies', {
  id: uuid('id').primaryKey().defaultRandom(),
  codigo: text('codigo').notNull().unique(),
  nombre: text('nombre').notNull(),
});

export const animales = core.table('animales', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizacionId: uuid('organizacion_id')
    .notNull()
    .references(() => organizaciones.id, { onDelete: 'cascade' }),
  personaId: uuid('persona_id').references(() => personas.id),
  especieId: uuid('especie_id')
    .notNull()
    .references(() => especies.id),
  codigoLegible: text('codigo_legible').unique(),
  microchip: text('microchip').unique(),
  nombre: text('nombre').notNull(),
  sexo: sexoAnimal('sexo'),
  fechaNacimiento: date('fecha_nacimiento'),
  fechaNacEstimada: boolean('fecha_nac_estimada').notNull().default(false),
  fotoUrl: text('foto_url'),
  estado: estadoAnimal('estado').notNull().default('activo'),
  datosEspecificos: jsonb('datos_especificos').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

// --- Solicitudes de registro / acceso (auto-registro con aprobación) ---
export const solicitudes = core.table('solicitudes', {
  id: uuid('id').primaryKey().defaultRandom(),
  tipo: text('tipo').notNull(), // 'crear' | 'unirse'
  estado: text('estado').notNull().default('pendiente'), // 'pendiente' | 'aprobada' | 'rechazada'
  nombre: text('nombre').notNull(),
  apellido: text('apellido').notNull(),
  email: text('email').notNull(),
  passwordHash: text('password_hash').notNull(),
  telefono: text('telefono'),
  nombreOrganizacion: text('nombre_organizacion'),
  tipoOrganizacion: text('tipo_organizacion'),
  organizacionSolicitada: text('organizacion_solicitada'),
  motivoRechazo: text('motivo_rechazo'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  resolvedPor: uuid('resolved_por').references(() => usuarios.id),
});
