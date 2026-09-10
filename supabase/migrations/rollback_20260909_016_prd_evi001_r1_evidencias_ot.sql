-- ============================================================================
-- TSM-AI: Rollback de Módulo de Evidencias Fotográficas y Auditoría 360
-- Archivo: rollback_20260909_016_prd_evi001_r1_evidencias_ot.sql
-- Código: PRD-EVI001-R1
-- Fecha: 2026-09-09
-- ============================================================================

DROP FUNCTION IF EXISTS public.obtener_evidencias_ot(TEXT);
DROP VIEW IF EXISTS public.vw_ot_evidencias_360 CASCADE;

DROP POLICY IF EXISTS "evidencias_orden_select_policy" ON public.evidencias_orden;
DROP POLICY IF EXISTS "evidencias_orden_insert_policy" ON public.evidencias_orden;

ALTER TABLE public.evidencias_orden DROP CONSTRAINT IF EXISTS chk_tipo_evidencia;

DROP INDEX IF EXISTS public.idx_evidencias_orden_ot_tipo;
DROP INDEX IF EXISTS public.idx_evidencias_orden_ciclo;
DROP INDEX IF EXISTS public.idx_evidencias_orden_maquina;
DROP INDEX IF EXISTS public.idx_evidencias_orden_captured;
