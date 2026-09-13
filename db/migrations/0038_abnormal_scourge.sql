ALTER TABLE "plataforma"."interesados" ALTER COLUMN "contacto" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "plataforma"."interesados" ADD COLUMN "email" text;