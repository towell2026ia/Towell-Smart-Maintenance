-- ============================================================================
-- ROLLBACK: Calendario Unificado por Proceso (PRD-CAL001-R1)
-- Archivo: rollback_20260909_013_prd_cal001_r1_calendario_unificado_proceso.sql
-- Fecha: 2026-09-09
-- ============================================================================
-- CERO DESTRUCCION: Este script no elimina calendarios, detalles, ordenes_trabajo,
-- maquinas ni historicos. Solo revierte las funciones y politicas añadidas.
-- ============================================================================

-- 1. Eliminar RPC obtener_calendario_unificado_proceso
REVOKE ALL ON FUNCTION public.obtener_calendario_unificado_proceso(VARCHAR, DATE, DATE, VARCHAR) FROM PUBLIC, anon, authenticated, service_role;
DROP FUNCTION IF EXISTS public.obtener_calendario_unificado_proceso(VARCHAR, DATE, DATE, VARCHAR);

-- 2. Eliminar politicas RLS añadidas en calendario_mantenimiento_detalle
DROP POLICY IF EXISTS "p_cal_det_super_admin_all" ON public.calendario_mantenimiento_detalle;
DROP POLICY IF EXISTS "p_cal_det_responsable_proceso_select" ON public.calendario_mantenimiento_detalle;
DROP POLICY IF EXISTS "p_cal_det_mantenimiento_select" ON public.calendario_mantenimiento_detalle;

-- 3. Eliminar politicas RLS añadidas en calendarios_mantenimiento
DROP POLICY IF EXISTS "p_cal_hdr_super_admin_all" ON public.calendarios_mantenimiento;
DROP POLICY IF EXISTS "p_cal_hdr_authenticated_select" ON public.calendarios_mantenimiento;

-- 4. Eliminar indices creados
DROP INDEX IF EXISTS public.idx_cmd_tipo_fecha;
DROP INDEX IF EXISTS public.idx_cmd_id_orden_gen;
DROP INDEX IF EXISTS public.idx_cmd_id_orden_ref;
DROP INDEX IF EXISTS public.idx_maq_depto_area;

-- 5. Confirmacion
DO $$
BEGIN
    RAISE NOTICE '=== ROLLBACK PRD-CAL001-R1 COMPLETADO ===';
    RAISE NOTICE 'Removido: obtener_calendario_unificado_proceso()';
    RAISE NOTICE 'Removido: Politicas RLS en calendarios_mantenimiento y detalle';
    RAISE NOTICE 'Removido: Indices auxiliares de calendario';
    RAISE NOTICE 'Conservado: 100% de datos en calendarios, detalles, OT y maquinas';
    RAISE NOTICE '==========================================';
END $$;
