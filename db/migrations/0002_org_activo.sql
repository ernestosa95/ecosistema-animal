-- 0002_org_activo.sql
-- Ciclo de vida de la veterinaria: bandera de activación (reversible).
-- Idempotente: seguro de aplicar sobre una base existente.

ALTER TABLE core.organizaciones
  ADD COLUMN IF NOT EXISTS activo boolean NOT NULL DEFAULT true;
