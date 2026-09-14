CREATE TABLE IF NOT EXISTS "plataforma"."configuracion" (
	"id" text PRIMARY KEY DEFAULT 'global' NOT NULL,
	"aprobacion_automatica" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
