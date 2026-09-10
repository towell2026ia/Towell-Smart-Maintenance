-- ============================================================================
-- TSM-AI: Rollback Script para PRD-DB001-R2 (RLS & Security)
-- Archivo: rollback_20260907_009_prd_db001_r2_rls_security.sql
-- Objetivo: Revertir las políticas RLS y funciones añadidas en la migración
--           20260907_009_prd_db001_r2_rls_security.sql SIN tocar datos.
-- ============================================================================

-- 1. Eliminar políticas de ordenes_trabajo añadidas en esta versión
DROP POLICY IF EXISTS "p_ot_super_admin_all" ON public.ordenes_trabajo;
DROP POLICY IF EXISTS "p_ot_mantenimiento_select" ON public.ordenes_trabajo;
DROP POLICY IF EXISTS "p_ot_mantenimiento_update" ON public.ordenes_trabajo;
DROP POLICY IF EXISTS "p_ot_solicitante_select" ON public.ordenes_trabajo;
DROP POLICY IF EXISTS "p_ot_solicitante_insert" ON public.ordenes_trabajo;
DROP POLICY IF EXISTS "p_ot_portal_publico_insert" ON public.ordenes_trabajo;

-- 2. Eliminar políticas de cat_usuarios_roles añadidas en esta versión
DROP POLICY IF EXISTS "p_usr_super_admin_all" ON public.cat_usuarios_roles;
DROP POLICY IF EXISTS "p_usr_self_select" ON public.cat_usuarios_roles;
DROP POLICY IF EXISTS "p_usr_mantenimiento_select" ON public.cat_usuarios_roles;
DROP POLICY IF EXISTS "p_usr_public_verify" ON public.cat_usuarios_roles;

-- 3. Eliminar políticas de bitacora_mantenimiento añadidas en esta versión
DROP POLICY IF EXISTS "p_bit_super_admin_all" ON public.bitacora_mantenimiento;
DROP POLICY IF EXISTS "p_bit_mantenimiento_rw" ON public.bitacora_mantenimiento;

-- 4. Eliminar políticas de fallas_por_maquina añadidas en esta versión
DROP POLICY IF EXISTS "p_fallas_admin_mantenimiento_read" ON public.fallas_por_maquina;

-- 5. Eliminar políticas de stg_telegram_ordenes_telares añadidas en esta versión
DROP POLICY IF EXISTS "p_telegram_admin_mantenimiento_read" ON public.stg_telegram_ordenes_telares;

-- 6. Eliminar funciones auxiliares añadidas
DROP FUNCTION IF EXISTS public.get_current_user_profile();
DROP FUNCTION IF EXISTS public.portal_crear_solicitud(jsonb);

-- NOTA DE INTEGRIDAD:
-- Este script no elimina tablas, columnas, vistas, secuencias ni datos existentes.
