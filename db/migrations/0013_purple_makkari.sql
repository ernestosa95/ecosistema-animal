ALTER TABLE "core"."organizaciones" ADD COLUMN "direccion" text;--> statement-breakpoint
ALTER TABLE "core"."organizaciones" ADD COLUMN "localidad" text;--> statement-breakpoint
ALTER TABLE "core"."organizaciones" ADD COLUMN "provincia" text;--> statement-breakpoint
ALTER TABLE "core"."organizaciones" ADD COLUMN "telefono" text;--> statement-breakpoint
ALTER TABLE "core"."organizaciones" ADD COLUMN "email" text;--> statement-breakpoint
ALTER TABLE "core"."solicitudes" ADD COLUMN "dni" text;--> statement-breakpoint
ALTER TABLE "core"."solicitudes" ADD COLUMN "direccion_organizacion" text;--> statement-breakpoint
ALTER TABLE "core"."solicitudes" ADD COLUMN "localidad_organizacion" text;--> statement-breakpoint
ALTER TABLE "core"."solicitudes" ADD COLUMN "provincia_organizacion" text;--> statement-breakpoint
ALTER TABLE "core"."solicitudes" ADD COLUMN "telefono_organizacion" text;--> statement-breakpoint
ALTER TABLE "core"."solicitudes" ADD COLUMN "email_organizacion" text;--> statement-breakpoint
ALTER TABLE "core"."usuarios" ADD COLUMN "dni" text;