ALTER TABLE "plataforma"."planes" RENAME COLUMN "precio" TO "precio_mensual";--> statement-breakpoint
ALTER TABLE "plataforma"."planes" ADD COLUMN "precio_anual" numeric(12, 2);