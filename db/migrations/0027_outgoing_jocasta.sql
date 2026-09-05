CREATE TABLE IF NOT EXISTS "farmacia"."vademecum_senasa" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"certificado" text NOT NULL,
	"nombre_comercial" text NOT NULL,
	"empresa" text
);
