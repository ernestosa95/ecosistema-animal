CREATE TABLE IF NOT EXISTS "plataforma"."mensaje_respuestas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mensaje_id" uuid NOT NULL,
	"pregunta_id" text NOT NULL,
	"usuario_id" uuid NOT NULL,
	"organizacion_id" uuid NOT NULL,
	"respuesta" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "plataforma"."mensajes" ADD COLUMN "preguntas" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "plataforma"."mensaje_respuestas" ADD CONSTRAINT "mensaje_respuestas_mensaje_id_mensajes_id_fk" FOREIGN KEY ("mensaje_id") REFERENCES "plataforma"."mensajes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "plataforma"."mensaje_respuestas" ADD CONSTRAINT "mensaje_respuestas_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "core"."usuarios"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "plataforma"."mensaje_respuestas" ADD CONSTRAINT "mensaje_respuestas_organizacion_id_organizaciones_id_fk" FOREIGN KEY ("organizacion_id") REFERENCES "core"."organizaciones"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
