-- Rol único -> roles apilables (arreglo). USING envuelve el valor existente
-- en un arreglo de 1 elemento: cero pérdida de datos, cada membresía queda
-- con exactamente el rol que ya tenía.
ALTER TABLE "core"."membresias"
  ALTER COLUMN "rol" TYPE "core"."rol_membresia"[]
  USING ARRAY["rol"]::"core"."rol_membresia"[];
