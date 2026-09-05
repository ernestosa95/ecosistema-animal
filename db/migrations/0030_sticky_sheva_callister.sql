CREATE TYPE "plataforma"."tipo_evento_uso" AS ENUM('pantalla', 'accion');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "plataforma"."eventos_uso" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizacion_id" uuid NOT NULL,
	"usuario_id" uuid,
	"tipo" "plataforma"."tipo_evento_uso" NOT NULL,
	"nombre" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "plataforma"."eventos_uso" ADD CONSTRAINT "eventos_uso_organizacion_id_organizaciones_id_fk" FOREIGN KEY ("organizacion_id") REFERENCES "core"."organizaciones"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "plataforma"."eventos_uso" ADD CONSTRAINT "eventos_uso_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "core"."usuarios"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
