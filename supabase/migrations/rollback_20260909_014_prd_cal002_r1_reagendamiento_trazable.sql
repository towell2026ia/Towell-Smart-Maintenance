-- ============================================================================
-- ROLLBACK: Reagendamiento Integral, Seguro y Trazable de Maquinaria
-- Archivo: rollback_20260909_014_prd_cal002_r1_reagendamiento_trazable.sql
-- Código: PRD-CAL002-R1
-- Fecha: 2026-09-09
-- ============================================================================
-- CERO DESTRUCCION: Este script no elimina calendarios, detalles, maquinas ni OTs.
-- Solo revierte la RPC, politicas, triggers y estructuras auxiliares añadidas.
-- ============================================================================

-- 1. Eliminar RPC reagendar_mantenimiento_maquinaria
REVOKE ALL ON FUNCTION public.reagendar_mantenimiento_maquinaria(UUID, DATE, VARCHAR, TEXT) FROM PUBLIC, anon, authenticated, service_role;
DROP FUNCTION IF EXISTS public.reagendar_mantenimiento_maquinaria(UUID, DATE, VARCHAR, TEXT);

-- 2. Eliminar trigger y función de inmutabilidad
DROP TRIGGER IF EXISTS trg_historial_reagendamientos_immutable ON public.historial_reagendamientos;
DROP FUNCTION IF EXISTS public.fn_historial_reagendamientos_immutable();

-- 3. Eliminar políticas RLS e índices de historial_reagendamientos
DROP POLICY IF EXISTS "p_hist_reag_select" ON public.historial_reagendamientos;
DROP POLICY IF EXISTS "p_hist_reag_insert" ON public.historial_reagendamientos;
DROP POLICY IF EXISTS "p_hist_reag_no_update" ON public.historial_reagendamientos;
DROP POLICY IF EXISTS "p_hist_reag_no_delete" ON public.historial_reagendamientos;

DROP INDEX IF EXISTS public.idx_hist_reag_detalle;
DROP INDEX IF EXISTS public.idx_hist_reag_maquina;
DROP INDEX IF EXISTS public.idx_hist_reag_proceso;
DROP INDEX IF EXISTS public.idx_hist_reag_fecha_nueva;
DROP INDEX IF EXISTS public.idx_hist_reag_usuario;

-- 4. Eliminar tablas creadas (si procede en rollback)
DROP TABLE IF EXISTS public.historial_reagendamientos;
DROP TABLE IF EXISTS public.cat_motivos_reagendamiento;

DO $$
BEGIN
    RAISE NOTICE '=== ROLLBACK PRD-CAL002-R1 COMPLETADO ===';
    RAISE NOTICE 'Removido: RPC reagendar_mantenimiento_maquinaria()';
    RAISE NOTICE 'Removido: Trigger y políticas RLS de inmutabilidad';
    RAISE NOTICE 'Removido: Tablas historial_reagendamientos y cat_motivos_reagendamiento';
    RAISE NOTICE 'Integridad de calendarios y catálogo: PRESERVADA';
END $$;
