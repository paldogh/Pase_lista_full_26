-- Sincronizar el historial con el esquema actual de Grupo.
-- La columna y su relación ya fueron eliminadas de Neon.

ALTER TABLE "Grupo"
DROP CONSTRAINT IF EXISTS "Grupo_carreraId_fkey";

ALTER TABLE "Grupo"
DROP COLUMN IF EXISTS "carreraId";