ALTER TABLE "farmacia"."productos" ADD COLUMN "precio_compra" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "farmacia"."productos" ADD COLUMN "es_medicamento" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "farmacia"."productos" ADD COLUMN "es_fraccionable" boolean DEFAULT false NOT NULL;