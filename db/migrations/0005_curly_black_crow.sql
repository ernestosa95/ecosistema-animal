CREATE SCHEMA "plataforma";
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "plataforma"."grupos_organizaciones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" text NOT NULL,
	"descripcion" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "plataforma"."mensajes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"titulo" text NOT NULL,
	"cuerpo" text NOT NULL,
	"destinatario_tipo" text NOT NULL,
	"organizacion_id" uuid,
	"grupo_id" uuid,
	"creado_por" uuid,
	"publicado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "plataforma"."mensajes_leidos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mensaje_id" uuid NOT NULL,
	"usuario_id" uuid NOT NULL,
	"leido_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "plataforma"."planes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" text NOT NULL,
	"precio" numeric(12, 2),
	"descripcion" text,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "core"."organizaciones" ADD COLUMN "grupo_id" uuid;--> statement-breakpoint
ALTER TABLE "core"."organizaciones" ADD COLUMN "plan_id" uuid;--> statement-breakpoint
ALTER TABLE "core"."organizaciones" ADD COLUMN "acceso_hasta" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "core"."organizaciones" ADD COLUMN "es_demo" boolean DEFAULT false NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "plataforma"."mensajes" ADD CONSTRAINT "mensajes_organizacion_id_organizaciones_id_fk" FOREIGN KEY ("organizacion_id") REFERENCES "core"."organizaciones"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "plataforma"."mensajes" ADD CONSTRAINT "mensajes_grupo_id_grupos_organizaciones_id_fk" FOREIGN KEY ("grupo_id") REFERENCES "plataforma"."grupos_organizaciones"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "plataforma"."mensajes" ADD CONSTRAINT "mensajes_creado_por_usuarios_id_fk" FOREIGN KEY ("creado_por") REFERENCES "core"."usuarios"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "plataforma"."mensajes_leidos" ADD CONSTRAINT "mensajes_leidos_mensaje_id_mensajes_id_fk" FOREIGN KEY ("mensaje_id") REFERENCES "plataforma"."mensajes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "plataforma"."mensajes_leidos" ADD CONSTRAINT "mensajes_leidos_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "core"."usuarios"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
