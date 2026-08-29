CREATE SEQUENCE "tropera"."animales_campo_temp_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint
CREATE TYPE "tropera"."estado_animal_campo" AS ENUM('activo', 'vendido', 'muerto', 'transferido');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tropera"."animales_campo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizacion_id" uuid NOT NULL,
	"establecimiento_id" uuid NOT NULL,
	"caravana" text NOT NULL,
	"caravana_definitiva" boolean DEFAULT true NOT NULL,
	"categoria" "tropera"."categoria_hacienda" NOT NULL,
	"sexo" text,
	"estado" "tropera"."estado_animal_campo" DEFAULT 'activo' NOT NULL,
	"fecha_alta" date DEFAULT current_date NOT NULL,
	"observaciones" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "tropera"."eventos" ADD COLUMN "animal_campo_id" uuid;--> statement-breakpoint
ALTER TABLE "tropera"."eventos" ADD COLUMN "retiro_hasta" date;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tropera"."animales_campo" ADD CONSTRAINT "animales_campo_organizacion_id_organizaciones_id_fk" FOREIGN KEY ("organizacion_id") REFERENCES "core"."organizaciones"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tropera"."animales_campo" ADD CONSTRAINT "animales_campo_establecimiento_id_establecimientos_id_fk" FOREIGN KEY ("establecimiento_id") REFERENCES "tropera"."establecimientos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tropera"."eventos" ADD CONSTRAINT "eventos_animal_campo_id_animales_campo_id_fk" FOREIGN KEY ("animal_campo_id") REFERENCES "tropera"."animales_campo"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
