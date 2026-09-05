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
  // Reemplaza al viejo enum `tipo` (clinica/establecimiento/mixta): dos
  // booleans independientes por solución, para poder activar/desactivar
  // Huella y Tropera por separado (incluso ninguna, ej. una org suspendida)
  // desde /admin — ver ADMIN/CHANGELOG 2026-08-30.
  huellaActiva: boolean('huella_activa').notNull().default(true),
  troperaActiva: boolean('tropera_activa').notNull().default(false),
  cuit: text('cuit'),
  // Datos de contacto/ubicación de la institución/campo — capturados desde
  // el alta (form de solicitud de cuenta), texto libre igual que
  // personas.domicilio (no hay necesidad de geocodificar/filtrar todavía).
  direccion: text('direccion'),
  localidad: text('localidad'),
  provincia: text('provincia'),
  telefono: text('telefono'),
  email: text('email'),
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
  // Fecha en que la organización empezó a operar (no siempre coincide con
  // createdAt: puede aprobarse un alta y activarse recién unos días después).
  // Es la base del cálculo de "próximo vencimiento" en /admin — se factura
  // todos los meses el mismo día-del-mes que esta fecha. null = todavía sin
  // definir (AdminService cae a createdAt para no bloquear el cálculo).
  fechaActivacion: timestamp('fecha_activacion', { withTimezone: true }),
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
  dni: text('dni'),
  emailVerificado: boolean('email_verificado').notNull().default(false),
  ultimoLogin: timestamp('ultimo_login', { withTimezone: true }),
  // Invalida cualquier token de "olvidé mi contraseña" emitido antes de este
  // momento (se compara contra el `iat` del JWT) — sin esto, un link de reset
  // viejo seguiría sirviendo para siempre ya que ese token es stateless
  // (mismo patrón que `PortalTokenService`, sin tabla propia).
  passwordChangedAt: timestamp('password_changed_at', { withTimezone: true }),
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
  dni: text('dni'),
  email: text('email').notNull(),
  passwordHash: text('password_hash').notNull(),
  telefono: text('telefono'),
  nombreOrganizacion: text('nombre_organizacion'),
  tipoOrganizacion: text('tipo_organizacion'),
  // Plan elegido al solicitar la cuenta — referencia lógica a
  // plataforma.planes, sin FK real (mismo motivo que organizaciones.planId:
  // plataforma.ts ya importa de core.ts). Se traslada tal cual a
  // organizaciones.planId al aprobar (ver SolicitudesService.aprobar()).
  planId: uuid('plan_id'),
  // Datos de la institución/campo, sólo relevantes si tipo = 'crear' — se
  // trasladan tal cual a core.organizaciones al aprobar la solicitud.
  direccionOrganizacion: text('direccion_organizacion'),
  localidadOrganizacion: text('localidad_organizacion'),
  provinciaOrganizacion: text('provincia_organizacion'),
  telefonoOrganizacion: text('telefono_organizacion'),
  emailOrganizacion: text('email_organizacion'),
  organizacionSolicitada: text('organizacion_solicitada'),
  motivoRechazo: text('motivo_rechazo'),
  // Un timestamp no nulo es la prueba de que aceptó — más simple que sumar un
  // boolean redundante. `terminosVersion` queda para el día que el texto
  // cambie y haga falta saber qué versión aceptó cada quien.
  terminosAceptadosEn: timestamp('terminos_aceptados_en', { withTimezone: true }),
  terminosVersion: text('terminos_version'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  resolvedPor: uuid('resolved_por').references(() => usuarios.id),
});
