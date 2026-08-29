CREATE SCHEMA "caja";
--> statement-breakpoint
CREATE TYPE "caja"."estado_auditoria_caja" AS ENUM('pendiente', 'aceptado', 'en_revision', 'rechazado');--> statement-breakpoint
CREATE TYPE "caja"."estado_caja" AS ENUM('abierta', 'cerrada');--> statement-breakpoint
ALTER TYPE "farmacia"."tipo_movimiento_stock" ADD VALUE 'venta';--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "caja"."cajas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizacion_id" uuid NOT NULL,
	"abierta_por_usuario_id" uuid,
	"cerrada_por_usuario_id" uuid,
	"monto_inicial" numeric(12, 2) DEFAULT '0' NOT NULL,
	"monto_declarado" numeric(12, 2),
	"monto_calculado" numeric(12, 2),
	"diferencia" numeric(12, 2),
	"observaciones_cierre" text,
	"estado" "caja"."estado_caja" DEFAULT 'abierta' NOT NULL,
	"estado_auditoria" "caja"."estado_auditoria_caja",
	"observaciones_auditoria" text,
	"auditada_por_usuario_id" uuid,
	"abierta_en" timestamp with time zone DEFAULT now() NOT NULL,
	"cerrada_en" timestamp with time zone,
	"auditada_en" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "caja"."cobros" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizacion_id" uuid NOT NULL,
	"caja_id" uuid NOT NULL,
	"usuario_id" uuid,
	"veterinario_id" uuid,
	"concepto" text NOT NULL,
	"monto" numeric(12, 2) NOT NULL,
	"metodo_pago" text,
	"producto_id" uuid,
	"cantidad" integer,
	"consulta_id" uuid,
	"liquidado" boolean DEFAULT false NOT NULL,
	"liquidado_en" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "caja"."egresos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizacion_id" uuid NOT NULL,
	"caja_id" uuid NOT NULL,
	"usuario_id" uuid,
	"concepto" text NOT NULL,
	"monto" numeric(12, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "farmacia"."productos" ADD COLUMN "precio" numeric(12, 2);--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "caja"."cajas" ADD CONSTRAINT "cajas_organizacion_id_organizaciones_id_fk" FOREIGN KEY ("organizacion_id") REFERENCES "core"."organizaciones"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "caja"."cajas" ADD CONSTRAINT "cajas_abierta_por_usuario_id_usuarios_id_fk" FOREIGN KEY ("abierta_por_usuario_id") REFERENCES "core"."usuarios"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "caja"."cajas" ADD CONSTRAINT "cajas_cerrada_por_usuario_id_usuarios_id_fk" FOREIGN KEY ("cerrada_por_usuario_id") REFERENCES "core"."usuarios"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "caja"."cajas" ADD CONSTRAINT "cajas_auditada_por_usuario_id_usuarios_id_fk" FOREIGN KEY ("auditada_por_usuario_id") REFERENCES "core"."usuarios"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "caja"."cobros" ADD CONSTRAINT "cobros_organizacion_id_organizaciones_id_fk" FOREIGN KEY ("organizacion_id") REFERENCES "core"."organizaciones"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "caja"."cobros" ADD CONSTRAINT "cobros_caja_id_cajas_id_fk" FOREIGN KEY ("caja_id") REFERENCES "caja"."cajas"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "caja"."cobros" ADD CONSTRAINT "cobros_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "core"."usuarios"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "caja"."cobros" ADD CONSTRAINT "cobros_veterinario_id_usuarios_id_fk" FOREIGN KEY ("veterinario_id") REFERENCES "core"."usuarios"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "caja"."cobros" ADD CONSTRAINT "cobros_producto_id_productos_id_fk" FOREIGN KEY ("producto_id") REFERENCES "farmacia"."productos"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "caja"."cobros" ADD CONSTRAINT "cobros_consulta_id_consultas_id_fk" FOREIGN KEY ("consulta_id") REFERENCES "hce"."consultas"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "caja"."egresos" ADD CONSTRAINT "egresos_organizacion_id_organizaciones_id_fk" FOREIGN KEY ("organizacion_id") REFERENCES "core"."organizaciones"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "caja"."egresos" ADD CONSTRAINT "egresos_caja_id_cajas_id_fk" FOREIGN KEY ("caja_id") REFERENCES "caja"."cajas"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "caja"."egresos" ADD CONSTRAINT "egresos_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "core"."usuarios"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
