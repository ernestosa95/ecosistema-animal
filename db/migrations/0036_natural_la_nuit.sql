CREATE TABLE IF NOT EXISTS "plataforma"."interesados" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" text NOT NULL,
	"contacto" text NOT NULL,
	"nombre_veterinaria" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
