-- ============================================================================
-- TSM-AI: Corregir o Eliminar Restricción check_area_solicitante en cat_usuarios_roles
-- Ejecutar en: Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ============================================================================

-- Eliminar la restricción restrictiva para permitir cualquier departamento/área
ALTER TABLE public.cat_usuarios_roles DROP CONSTRAINT IF EXISTS check_area_solicitante;

-- (Opcional) Recrear con todas las áreas permitidas si se desea validación en base de datos:
-- ALTER TABLE public.cat_usuarios_roles 
--   ADD CONSTRAINT check_area_solicitante 
--   CHECK (area IS NULL OR area IN ('PF', 'CF', 'TF', 'AF', 'General', 'Mantenimiento'));
