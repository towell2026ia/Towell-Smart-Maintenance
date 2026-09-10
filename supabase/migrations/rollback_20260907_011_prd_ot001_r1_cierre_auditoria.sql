-- ============================================================================
-- TSM-AI: Rollback Oficial de PRD-OT001-R1
-- Archivo: rollback_20260907_011_prd_ot001_r1_cierre_auditoria.sql
-- Fecha: 2026-09-07
-- Regla Especial: NO BORRA registros de auditoria_cierre_ot creados en producción.
-- Revierte exclusivamente funciones, triggers y políticas añadidas.
-- ============================================================================

-- 1. REVERSIÓN DE FUNCIONES RPC
DROP FUNCTION IF EXISTS public.cerrar_o_rechazar_ot(TEXT, TEXT, INT, TEXT, TEXT, UUID);
DROP FUNCTION IF EXISTS public.finalizar_trabajo_tecnico(TEXT, TEXT, TEXT, TEXT, TEXT);

-- 2. REVERSIÓN DE TRIGGER DE INMUTABILIDAD
DROP TRIGGER IF EXISTS trg_prevent_auditoria_cierre_mutation ON public.auditoria_cierre_ot;
DROP FUNCTION IF EXISTS public.fn_prevent_audit_mutation();

-- 3. REVERSIÓN DE POLÍTICAS RLS EN auditoria_cierre_ot
DROP POLICY IF EXISTS "p_audit_select_auth" ON public.auditoria_cierre_ot;
DROP POLICY IF EXISTS "p_audit_insert_auth" ON public.auditoria_cierre_ot;

-- 4. REVERSIÓN DE CONSTRAINT EN ordenes_trabajo
ALTER TABLE public.ordenes_trabajo DROP CONSTRAINT IF EXISTS chk_ot_calidad_1_5;
