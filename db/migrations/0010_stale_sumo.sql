CREATE TYPE "tropera"."resultado_reproductivo" AS ENUM('prenada', 'vacia', 'anestro');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tropera"."evaluaciones_andrologicas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizacion_id" uuid NOT NULL,
	"animal_campo_id" uuid NOT NULL,
	"circunferencia_escrotal_cm" numeric(5, 1) NOT NULL,
	"motilidad_porcentaje" numeric(5, 1) NOT NULL,
	"apto" boolean NOT NULL,
	"fecha" date DEFAULT current_date NOT NULL,
	"observaciones" text,
	"usuario_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tropera"."hallazgos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizacion_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tropera"."muestras" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizacion_id" uuid NOT NULL,
	"establecimiento_id" uuid NOT NULL,
	"animal_campo_id" uuid,
	"caravana" text,
	"tubo_numero" integer NOT NULL,
	"tipo_muestra" text,
	"fecha" date DEFAULT current_date NOT NULL,
	"observaciones" text,
	"usuario_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tropera"."toros_virtuales" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizacion_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"raza" text,
	"proveedor" text,
	"observaciones" text,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "tropera"."eventos" ADD COLUMN "hallazgo_id" uuid;--> statement-breakpoint
ALTER TABLE "tropera"."eventos" ADD COLUMN "resultado_reproductivo" "tropera"."resultado_reproductivo";--> statement-breakpoint
ALTER TABLE "tropera"."eventos" ADD COLUMN "toro_virtual_id" uuid;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tropera"."evaluaciones_andrologicas" ADD CONSTRAINT "evaluaciones_andrologicas_organizacion_id_organizaciones_id_fk" FOREIGN KEY ("organizacion_id") REFERENCES "core"."organizaciones"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tropera"."evaluaciones_andrologicas" ADD CONSTRAINT "evaluaciones_andrologicas_animal_campo_id_animales_campo_id_fk" FOREIGN KEY ("animal_campo_id") REFERENCES "tropera"."animales_campo"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tropera"."evaluaciones_andrologicas" ADD CONSTRAINT "evaluaciones_andrologicas_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "core"."usuarios"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tropera"."hallazgos" ADD CONSTRAINT "hallazgos_organizacion_id_organizaciones_id_fk" FOREIGN KEY ("organizacion_id") REFERENCES "core"."organizaciones"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tropera"."muestras" ADD CONSTRAINT "muestras_organizacion_id_organizaciones_id_fk" FOREIGN KEY ("organizacion_id") REFERENCES "core"."organizaciones"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tropera"."muestras" ADD CONSTRAINT "muestras_establecimiento_id_establecimientos_id_fk" FOREIGN KEY ("establecimiento_id") REFERENCES "tropera"."establecimientos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tropera"."muestras" ADD CONSTRAINT "muestras_animal_campo_id_animales_campo_id_fk" FOREIGN KEY ("animal_campo_id") REFERENCES "tropera"."animales_campo"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tropera"."muestras" ADD CONSTRAINT "muestras_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "core"."usuarios"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tropera"."toros_virtuales" ADD CONSTRAINT "toros_virtuales_organizacion_id_organizaciones_id_fk" FOREIGN KEY ("organizacion_id") REFERENCES "core"."organizaciones"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tropera"."eventos" ADD CONSTRAINT "eventos_hallazgo_id_hallazgos_id_fk" FOREIGN KEY ("hallazgo_id") REFERENCES "tropera"."hallazgos"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tropera"."eventos" ADD CONSTRAINT "eventos_toro_virtual_id_toros_virtuales_id_fk" FOREIGN KEY ("toro_virtual_id") REFERENCES "tropera"."toros_virtuales"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
