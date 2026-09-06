ALTER TABLE "plataforma"."pagos" ADD COLUMN "estado" text DEFAULT 'confirmado' NOT NULL;--> statement-breakpoint
ALTER TABLE "plataforma"."pagos" ADD COLUMN "comprobante_url" text;--> statement-breakpoint
ALTER TABLE "plataforma"."pagos" ADD COLUMN "revisado_por" uuid;--> statement-breakpoint
ALTER TABLE "plataforma"."pagos" ADD COLUMN "revisado_en" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "plataforma"."pagos" ADD COLUMN "motivo_rechazo" text;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "plataforma"."pagos" ADD CONSTRAINT "pagos_revisado_por_usuarios_id_fk" FOREIGN KEY ("revisado_por") REFERENCES "core"."usuarios"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
