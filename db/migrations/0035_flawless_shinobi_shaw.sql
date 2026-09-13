CREATE TABLE IF NOT EXISTS "core"."portal_codigos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"persona_id" uuid NOT NULL,
	"organizacion_id" uuid NOT NULL,
	"codigo_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"intentos_fallidos" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "core"."portal_codigos" ADD CONSTRAINT "portal_codigos_persona_id_personas_id_fk" FOREIGN KEY ("persona_id") REFERENCES "core"."personas"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "core"."portal_codigos" ADD CONSTRAINT "portal_codigos_organizacion_id_organizaciones_id_fk" FOREIGN KEY ("organizacion_id") REFERENCES "core"."organizaciones"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
