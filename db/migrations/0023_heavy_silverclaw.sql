CREATE TABLE IF NOT EXISTS "plataforma"."pagos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizacion_id" uuid NOT NULL,
	"periodo" date NOT NULL,
	"monto" numeric(12, 2) NOT NULL,
	"fecha_pago" timestamp with time zone DEFAULT now() NOT NULL,
	"medio_pago" text,
	"observaciones" text,
	"registrado_por" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "core"."organizaciones" ADD COLUMN "fecha_activacion" timestamp with time zone;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "plataforma"."pagos" ADD CONSTRAINT "pagos_organizacion_id_organizaciones_id_fk" FOREIGN KEY ("organizacion_id") REFERENCES "core"."organizaciones"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "plataforma"."pagos" ADD CONSTRAINT "pagos_registrado_por_usuarios_id_fk" FOREIGN KEY ("registrado_por") REFERENCES "core"."usuarios"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
