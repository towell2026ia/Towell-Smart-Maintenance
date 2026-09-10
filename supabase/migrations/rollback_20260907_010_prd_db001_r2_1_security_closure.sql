-- ============================================================================
-- TSM-AI: Rollback para PRD-DB001-R2.1 (Cierre de Seguridad Post-RLS)
-- Archivo: rollback_20260907_010_prd_db001_r2_1_security_closure.sql
-- Objetivo: Restaurar las políticas previas de R2 si fuera necesario.
-- ============================================================================

-- 1. Restaurar política de inserción pública en ordenes_trabajo si se requiere
DROP POLICY IF EXISTS "p_ot_portal_publico_insert" ON public.ordenes_trabajo;
CREATE POLICY "p_ot_portal_publico_insert" ON public.ordenes_trabajo
  FOR INSERT TO anon
  WITH CHECK (estatus = 'solicitud_recibida' AND origen = 'App');

-- 2. Restaurar política de verificación pública en cat_usuarios_roles si se requiere
DROP POLICY IF EXISTS "p_usr_public_verify" ON public.cat_usuarios_roles;
CREATE POLICY "p_usr_public_verify" ON public.cat_usuarios_roles
  FOR SELECT TO anon
  USING (activo = TRUE);

-- 3. Eliminar función auxiliar de verificación de recuperación
DROP FUNCTION IF EXISTS public.verificar_usuario_recuperacion(TEXT);
