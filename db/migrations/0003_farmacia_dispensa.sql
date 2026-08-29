ALTER TABLE "farmacia"."movimientos_stock" ADD COLUMN "consulta_id" uuid;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "farmacia"."movimientos_stock" ADD CONSTRAINT "movimientos_stock_consulta_id_consultas_id_fk" FOREIGN KEY ("consulta_id") REFERENCES "hce"."consultas"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
