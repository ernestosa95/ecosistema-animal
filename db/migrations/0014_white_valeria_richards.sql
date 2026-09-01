ALTER TABLE "core"."organizaciones" ADD COLUMN "huella_activa" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "core"."organizaciones" ADD COLUMN "tropera_activa" boolean DEFAULT false NOT NULL;--> statement-breakpoint
-- Backfill a partir del viejo enum `tipo` (todavía existe en este paso, se
-- elimina en la migración siguiente) — preserva qué solución veía cada
-- organización existente antes del cambio a los dos booleans independientes.
UPDATE "core"."organizaciones" SET
  "huella_activa" = ("tipo" IN ('clinica', 'mixta')),
  "tropera_activa" = ("tipo" IN ('establecimiento', 'mixta'));