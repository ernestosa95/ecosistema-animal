CREATE TYPE "tropera"."estado_tarea" AS ENUM('pendiente', 'completada', 'cancelada');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tropera"."plantilla_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plantilla_id" uuid NOT NULL,
	"tipo" "tropera"."tipo_evento" NOT NULL,
	"producto" text,
	"orden" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tropera"."plantillas_tareas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizacion_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tropera"."potreros" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizacion_id" uuid NOT NULL,
	"establecimiento_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"superficie_ha" numeric(10, 2),
	"capacidad_cabezas" integer,
	"observaciones" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tropera"."protocolo_iatf_pasos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"protocolo_id" uuid NOT NULL,
	"dia_offset" integer NOT NULL,
	"descripcion" text NOT NULL,
	"producto" text,
	"orden" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tropera"."protocolos_iatf" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizacion_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"descripcion" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tropera"."tareas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizacion_id" uuid NOT NULL,
	"establecimiento_id" uuid NOT NULL,
	"animal_campo_id" uuid,
	"protocolo_id" uuid,
	"descripcion" text NOT NULL,
	"producto" text,
	"fecha_programada" date NOT NULL,
	"estado" "tropera"."estado_tarea" DEFAULT 'pendiente' NOT NULL,
	"observaciones" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "tropera"."animales_campo" ADD COLUMN "potrero_id" uuid;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tropera"."plantilla_items" ADD CONSTRAINT "plantilla_items_plantilla_id_plantillas_tareas_id_fk" FOREIGN KEY ("plantilla_id") REFERENCES "tropera"."plantillas_tareas"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tropera"."plantillas_tareas" ADD CONSTRAINT "plantillas_tareas_organizacion_id_organizaciones_id_fk" FOREIGN KEY ("organizacion_id") REFERENCES "core"."organizaciones"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tropera"."potreros" ADD CONSTRAINT "potreros_organizacion_id_organizaciones_id_fk" FOREIGN KEY ("organizacion_id") REFERENCES "core"."organizaciones"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tropera"."potreros" ADD CONSTRAINT "potreros_establecimiento_id_establecimientos_id_fk" FOREIGN KEY ("establecimiento_id") REFERENCES "tropera"."establecimientos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tropera"."protocolo_iatf_pasos" ADD CONSTRAINT "protocolo_iatf_pasos_protocolo_id_protocolos_iatf_id_fk" FOREIGN KEY ("protocolo_id") REFERENCES "tropera"."protocolos_iatf"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tropera"."protocolos_iatf" ADD CONSTRAINT "protocolos_iatf_organizacion_id_organizaciones_id_fk" FOREIGN KEY ("organizacion_id") REFERENCES "core"."organizaciones"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tropera"."tareas" ADD CONSTRAINT "tareas_organizacion_id_organizaciones_id_fk" FOREIGN KEY ("organizacion_id") REFERENCES "core"."organizaciones"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tropera"."tareas" ADD CONSTRAINT "tareas_establecimiento_id_establecimientos_id_fk" FOREIGN KEY ("establecimiento_id") REFERENCES "tropera"."establecimientos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tropera"."tareas" ADD CONSTRAINT "tareas_animal_campo_id_animales_campo_id_fk" FOREIGN KEY ("animal_campo_id") REFERENCES "tropera"."animales_campo"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tropera"."tareas" ADD CONSTRAINT "tareas_protocolo_id_protocolos_iatf_id_fk" FOREIGN KEY ("protocolo_id") REFERENCES "tropera"."protocolos_iatf"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tropera"."animales_campo" ADD CONSTRAINT "animales_campo_potrero_id_potreros_id_fk" FOREIGN KEY ("potrero_id") REFERENCES "tropera"."potreros"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
