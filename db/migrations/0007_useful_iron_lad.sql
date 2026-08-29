CREATE TYPE "hce"."categoria_macro" AS ENUM('anamnesis', 'examenFisico', 'diagnostico', 'tratamiento');--> statement-breakpoint
CREATE TYPE "hce"."origen_indicacion" AS ENUM('stock_interno', 'receta_externa');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hce"."indicaciones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizacion_id" uuid NOT NULL,
	"consulta_id" uuid NOT NULL,
	"animal_id" uuid NOT NULL,
	"origen" "hce"."origen_indicacion" NOT NULL,
	"producto_id" uuid,
	"producto_nombre" text,
	"dosis" text,
	"cantidad_stock" integer,
	"frecuencia" text,
	"duracion_dias" integer,
	"observaciones" text,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hce"."macros" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizacion_id" uuid NOT NULL,
	"categoria" "hce"."categoria_macro" NOT NULL,
	"tag" text NOT NULL,
	"texto" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "farmacia"."productos" ADD COLUMN "concentracion" numeric(10, 3);--> statement-breakpoint
ALTER TABLE "farmacia"."productos" ADD COLUMN "unidad_concentracion" text;--> statement-breakpoint
ALTER TABLE "farmacia"."productos" ADD COLUMN "dosis_sugerida_mg_kg" numeric(10, 3);--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hce"."indicaciones" ADD CONSTRAINT "indicaciones_organizacion_id_organizaciones_id_fk" FOREIGN KEY ("organizacion_id") REFERENCES "core"."organizaciones"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hce"."indicaciones" ADD CONSTRAINT "indicaciones_consulta_id_consultas_id_fk" FOREIGN KEY ("consulta_id") REFERENCES "hce"."consultas"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hce"."indicaciones" ADD CONSTRAINT "indicaciones_animal_id_animales_id_fk" FOREIGN KEY ("animal_id") REFERENCES "core"."animales"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hce"."indicaciones" ADD CONSTRAINT "indicaciones_producto_id_productos_id_fk" FOREIGN KEY ("producto_id") REFERENCES "farmacia"."productos"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hce"."macros" ADD CONSTRAINT "macros_organizacion_id_organizaciones_id_fk" FOREIGN KEY ("organizacion_id") REFERENCES "core"."organizaciones"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
