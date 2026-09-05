ALTER TABLE "farmacia"."movimientos_stock" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "farmacia"."movimientos_stock" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "farmacia"."stock" ADD COLUMN "deleted_at" timestamp with time zone;