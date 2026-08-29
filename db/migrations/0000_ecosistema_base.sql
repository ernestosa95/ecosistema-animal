-- gen_random_uuid() (usado por todos los defaultRandom() de Drizzle) es nativo
-- desde Postgres 13, pero no antes. pgcrypto lo provee en versiones más viejas
-- — pero la extensión NO está disponible en la build WASM de PGlite (donde
-- gen_random_uuid() ya es nativo igual, así que no hace falta ahí). Envuelto
-- en EXECUTE + EXCEPTION para que sea un best-effort: si la extensión no
-- existe en el entorno pero la función ya es nativa (PGlite, PG13+), sigue
-- sin problema; si hiciera falta y no está disponible, recién fallaría más
-- adelante al insertar (no bloquea la migración del schema).
DO $$ BEGIN
  EXECUTE 'CREATE EXTENSION IF NOT EXISTS "pgcrypto"';
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;
--> statement-breakpoint
CREATE SCHEMA "core";
--> statement-breakpoint
CREATE SCHEMA "hce";
--> statement-breakpoint
CREATE SCHEMA "tropera";
--> statement-breakpoint
CREATE TYPE "core"."estado_animal" AS ENUM('activo', 'inactivo', 'fallecido');--> statement-breakpoint
CREATE TYPE "core"."rol_membresia" AS ENUM('propietario', 'admin', 'capataz', 'veterinario', 'recepcion');--> statement-breakpoint
CREATE TYPE "core"."sexo_animal" AS ENUM('macho', 'hembra', 'indefinido');--> statement-breakpoint
CREATE TYPE "core"."sexo_persona" AS ENUM('masculino', 'femenino', 'otro');--> statement-breakpoint
CREATE TYPE "core"."tipo_organizacion" AS ENUM('establecimiento', 'clinica', 'mixta');--> statement-breakpoint
CREATE TYPE "hce"."estado_turno" AS ENUM('solicitado', 'confirmado', 'reprogramado', 'cancelado', 'atendido', 'ausente');--> statement-breakpoint
CREATE TYPE "tropera"."categoria_hacienda" AS ENUM('vaca', 'toro', 'ternero', 'ternera', 'vaquillona', 'novillo');--> statement-breakpoint
CREATE TYPE "tropera"."tipo_movimiento" AS ENUM('nacimiento', 'compra', 'muerte', 'venta', 'traslado');--> statement-breakpoint
CREATE SEQUENCE "core"."animales_codigo_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "core"."animales" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizacion_id" uuid NOT NULL,
	"persona_id" uuid,
	"especie_id" uuid NOT NULL,
	"codigo_legible" text,
	"microchip" text,
	"nombre" text NOT NULL,
	"sexo" "core"."sexo_animal",
	"fecha_nacimiento" date,
	"fecha_nac_estimada" boolean DEFAULT false NOT NULL,
	"foto_url" text,
	"estado" "core"."estado_animal" DEFAULT 'activo' NOT NULL,
	"datos_especificos" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "animales_codigo_legible_unique" UNIQUE("codigo_legible"),
	CONSTRAINT "animales_microchip_unique" UNIQUE("microchip")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "core"."especies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"codigo" text NOT NULL,
	"nombre" text NOT NULL,
	CONSTRAINT "especies_codigo_unique" UNIQUE("codigo")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "core"."membresias" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"organizacion_id" uuid NOT NULL,
	"rol" "core"."rol_membresia" NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "core"."organizaciones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" text NOT NULL,
	"tipo" "core"."tipo_organizacion" DEFAULT 'clinica' NOT NULL,
	"cuit" text,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "core"."personas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizacion_id" uuid NOT NULL,
	"usuario_id" uuid,
	"dni" text,
	"nombre" text NOT NULL,
	"apellido" text NOT NULL,
	"sexo" "core"."sexo_persona",
	"fecha_nacimiento" date,
	"celular" text,
	"telefono" text,
	"email" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "core"."solicitudes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tipo" text NOT NULL,
	"estado" text DEFAULT 'pendiente' NOT NULL,
	"nombre" text NOT NULL,
	"apellido" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"telefono" text,
	"nombre_organizacion" text,
	"tipo_organizacion" text,
	"organizacion_solicitada" text,
	"motivo_rechazo" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	"resolved_por" uuid
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "core"."usuarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"nombre" text,
	"apellido" text,
	"email_verificado" boolean DEFAULT false NOT NULL,
	"ultimo_login" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "usuarios_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hce"."consultas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizacion_id" uuid NOT NULL,
	"animal_id" uuid NOT NULL,
	"veterinario_id" uuid,
	"fecha" timestamp with time zone DEFAULT now() NOT NULL,
	"motivo" text,
	"anamnesis" text,
	"examen_fisico" text,
	"diagnostico" text,
	"tratamiento" text,
	"peso_kg" numeric(6, 2),
	"temperatura_c" numeric(4, 1),
	"observaciones" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hce"."turnos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizacion_id" uuid NOT NULL,
	"animal_id" uuid,
	"persona_id" uuid,
	"veterinario_id" uuid,
	"fecha_hora" timestamp with time zone NOT NULL,
	"estado" "hce"."estado_turno" DEFAULT 'solicitado' NOT NULL,
	"motivo" text,
	"canal" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hce"."vacunaciones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizacion_id" uuid NOT NULL,
	"animal_id" uuid NOT NULL,
	"veterinario_id" uuid,
	"producto" text,
	"vademecum_id" uuid,
	"fecha" date DEFAULT current_date NOT NULL,
	"proxima_dosis" date,
	"lote_producto" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tropera"."establecimientos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizacion_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"ubicacion" text,
	"superficie_ha" numeric(10, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tropera"."existencias" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizacion_id" uuid NOT NULL,
	"establecimiento_id" uuid NOT NULL,
	"categoria" "tropera"."categoria_hacienda" NOT NULL,
	"cantidad" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tropera"."movimientos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizacion_id" uuid NOT NULL,
	"tipo" "tropera"."tipo_movimiento" NOT NULL,
	"categoria" "tropera"."categoria_hacienda" NOT NULL,
	"cantidad" integer NOT NULL,
	"establecimiento_origen_id" uuid,
	"establecimiento_destino_id" uuid,
	"fecha" date DEFAULT current_date NOT NULL,
	"observaciones" text,
	"usuario_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "core"."animales" ADD CONSTRAINT "animales_organizacion_id_organizaciones_id_fk" FOREIGN KEY ("organizacion_id") REFERENCES "core"."organizaciones"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "core"."animales" ADD CONSTRAINT "animales_persona_id_personas_id_fk" FOREIGN KEY ("persona_id") REFERENCES "core"."personas"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "core"."animales" ADD CONSTRAINT "animales_especie_id_especies_id_fk" FOREIGN KEY ("especie_id") REFERENCES "core"."especies"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "core"."membresias" ADD CONSTRAINT "membresias_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "core"."usuarios"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "core"."membresias" ADD CONSTRAINT "membresias_organizacion_id_organizaciones_id_fk" FOREIGN KEY ("organizacion_id") REFERENCES "core"."organizaciones"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "core"."personas" ADD CONSTRAINT "personas_organizacion_id_organizaciones_id_fk" FOREIGN KEY ("organizacion_id") REFERENCES "core"."organizaciones"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "core"."personas" ADD CONSTRAINT "personas_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "core"."usuarios"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "core"."solicitudes" ADD CONSTRAINT "solicitudes_resolved_por_usuarios_id_fk" FOREIGN KEY ("resolved_por") REFERENCES "core"."usuarios"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hce"."consultas" ADD CONSTRAINT "consultas_organizacion_id_organizaciones_id_fk" FOREIGN KEY ("organizacion_id") REFERENCES "core"."organizaciones"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hce"."consultas" ADD CONSTRAINT "consultas_animal_id_animales_id_fk" FOREIGN KEY ("animal_id") REFERENCES "core"."animales"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hce"."consultas" ADD CONSTRAINT "consultas_veterinario_id_usuarios_id_fk" FOREIGN KEY ("veterinario_id") REFERENCES "core"."usuarios"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hce"."turnos" ADD CONSTRAINT "turnos_organizacion_id_organizaciones_id_fk" FOREIGN KEY ("organizacion_id") REFERENCES "core"."organizaciones"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hce"."turnos" ADD CONSTRAINT "turnos_animal_id_animales_id_fk" FOREIGN KEY ("animal_id") REFERENCES "core"."animales"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hce"."turnos" ADD CONSTRAINT "turnos_persona_id_personas_id_fk" FOREIGN KEY ("persona_id") REFERENCES "core"."personas"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hce"."turnos" ADD CONSTRAINT "turnos_veterinario_id_usuarios_id_fk" FOREIGN KEY ("veterinario_id") REFERENCES "core"."usuarios"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hce"."vacunaciones" ADD CONSTRAINT "vacunaciones_organizacion_id_organizaciones_id_fk" FOREIGN KEY ("organizacion_id") REFERENCES "core"."organizaciones"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hce"."vacunaciones" ADD CONSTRAINT "vacunaciones_animal_id_animales_id_fk" FOREIGN KEY ("animal_id") REFERENCES "core"."animales"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hce"."vacunaciones" ADD CONSTRAINT "vacunaciones_veterinario_id_usuarios_id_fk" FOREIGN KEY ("veterinario_id") REFERENCES "core"."usuarios"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tropera"."establecimientos" ADD CONSTRAINT "establecimientos_organizacion_id_organizaciones_id_fk" FOREIGN KEY ("organizacion_id") REFERENCES "core"."organizaciones"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tropera"."existencias" ADD CONSTRAINT "existencias_organizacion_id_organizaciones_id_fk" FOREIGN KEY ("organizacion_id") REFERENCES "core"."organizaciones"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tropera"."existencias" ADD CONSTRAINT "existencias_establecimiento_id_establecimientos_id_fk" FOREIGN KEY ("establecimiento_id") REFERENCES "tropera"."establecimientos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tropera"."movimientos" ADD CONSTRAINT "movimientos_organizacion_id_organizaciones_id_fk" FOREIGN KEY ("organizacion_id") REFERENCES "core"."organizaciones"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tropera"."movimientos" ADD CONSTRAINT "movimientos_establecimiento_origen_id_establecimientos_id_fk" FOREIGN KEY ("establecimiento_origen_id") REFERENCES "tropera"."establecimientos"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tropera"."movimientos" ADD CONSTRAINT "movimientos_establecimiento_destino_id_establecimientos_id_fk" FOREIGN KEY ("establecimiento_destino_id") REFERENCES "tropera"."establecimientos"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tropera"."movimientos" ADD CONSTRAINT "movimientos_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "core"."usuarios"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
