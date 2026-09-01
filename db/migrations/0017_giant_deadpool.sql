CREATE TYPE "hce"."tipo_excepcion_agenda" AS ENUM('cierre', 'apertura_extra');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hce"."agenda_bloques" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agenda_id" uuid NOT NULL,
	"dia_semana" integer NOT NULL,
	"hora_inicio" time NOT NULL,
	"hora_fin" time NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hce"."agenda_excepciones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agenda_id" uuid NOT NULL,
	"fecha" date NOT NULL,
	"tipo" "hce"."tipo_excepcion_agenda" NOT NULL,
	"hora_inicio" time,
	"hora_fin" time,
	"motivo" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hce"."agendas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizacion_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"usuario_id" uuid,
	"duracion_turno_minutos" integer DEFAULT 30 NOT NULL,
	"color" text,
	"activa" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "hce"."turnos" ADD COLUMN "agenda_id" uuid;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hce"."agenda_bloques" ADD CONSTRAINT "agenda_bloques_agenda_id_agendas_id_fk" FOREIGN KEY ("agenda_id") REFERENCES "hce"."agendas"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hce"."agenda_excepciones" ADD CONSTRAINT "agenda_excepciones_agenda_id_agendas_id_fk" FOREIGN KEY ("agenda_id") REFERENCES "hce"."agendas"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hce"."agendas" ADD CONSTRAINT "agendas_organizacion_id_organizaciones_id_fk" FOREIGN KEY ("organizacion_id") REFERENCES "core"."organizaciones"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hce"."agendas" ADD CONSTRAINT "agendas_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "core"."usuarios"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hce"."turnos" ADD CONSTRAINT "turnos_agenda_id_agendas_id_fk" FOREIGN KEY ("agenda_id") REFERENCES "hce"."agendas"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
-- Backfill: sintetiza una agenda por cada veterinario_id distinto usado en
-- turnos existentes (todavía presente en esta migración, se elimina en la
-- siguiente) y reasigna esos turnos a la agenda correspondiente — preserva
-- la asignación de profesional que ya existía antes de reemplazar
-- veterinario_id por agenda_id.
INSERT INTO "hce"."agendas" ("organizacion_id", "nombre", "usuario_id")
SELECT DISTINCT t.organizacion_id,
  COALESCE(NULLIF(TRIM(COALESCE(u.nombre, '') || ' ' || COALESCE(u.apellido, '')), ''), u.email),
  t.veterinario_id
FROM "hce"."turnos" t
JOIN "core"."usuarios" u ON u.id = t.veterinario_id
WHERE t.veterinario_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "hce"."agendas" a
    WHERE a.organizacion_id = t.organizacion_id AND a.usuario_id = t.veterinario_id
  );
--> statement-breakpoint
UPDATE "hce"."turnos" t
SET agenda_id = a.id
FROM "hce"."agendas" a
WHERE a.organizacion_id = t.organizacion_id
  AND a.usuario_id = t.veterinario_id
  AND t.veterinario_id IS NOT NULL;
