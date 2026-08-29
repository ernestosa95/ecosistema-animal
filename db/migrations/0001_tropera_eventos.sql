CREATE TYPE "tropera"."tipo_evento" AS ENUM('vacunacion', 'desparasitacion', 'tratamiento', 'servicio', 'diagnostico_prenez', 'destete');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tropera"."eventos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizacion_id" uuid NOT NULL,
	"establecimiento_id" uuid NOT NULL,
	"tipo" "tropera"."tipo_evento" NOT NULL,
	"categoria" "tropera"."categoria_hacienda",
	"cantidad" integer,
	"producto" text,
	"fecha" date DEFAULT current_date NOT NULL,
	"observaciones" text,
	"usuario_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tropera"."eventos" ADD CONSTRAINT "eventos_organizacion_id_organizaciones_id_fk" FOREIGN KEY ("organizacion_id") REFERENCES "core"."organizaciones"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tropera"."eventos" ADD CONSTRAINT "eventos_establecimiento_id_establecimientos_id_fk" FOREIGN KEY ("establecimiento_id") REFERENCES "tropera"."establecimientos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tropera"."eventos" ADD CONSTRAINT "eventos_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "core"."usuarios"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
