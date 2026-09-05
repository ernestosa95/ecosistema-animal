CREATE TABLE IF NOT EXISTS "hce"."catalogo_vacunas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"especie_id" uuid NOT NULL,
	"categoria" text NOT NULL,
	"nombre" text NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hce"."catalogo_vacunas" ADD CONSTRAINT "catalogo_vacunas_especie_id_especies_id_fk" FOREIGN KEY ("especie_id") REFERENCES "core"."especies"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
