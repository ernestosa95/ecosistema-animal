ALTER TABLE "hce"."turnos" DROP CONSTRAINT "turnos_veterinario_id_usuarios_id_fk";
--> statement-breakpoint
ALTER TABLE "hce"."turnos" DROP COLUMN IF EXISTS "veterinario_id";