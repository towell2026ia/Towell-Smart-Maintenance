-- ============================================================================
-- TSM-AI: Rollback de PRD-OT003-R1
-- Archivo: rollback_20260909_015_prd_ot003_r1_validacion_calificacion_seguimiento.sql
-- Código: PRD-OT003-R1
-- Fecha: 2026-09-09
-- ============================================================================

-- 1. Eliminar funciones RPC creadas
DROP FUNCTION IF EXISTS public.cerrar_o_rechazar_ot(TEXT, TEXT, INT, TEXT, TEXT, UUID);
DROP FUNCTION IF EXISTS public.finalizar_trabajo_tecnico(TEXT, TEXT, TEXT, TEXT, TEXT);

-- 2. Eliminar trigger y función de inmutabilidad de auditoría
DROP TRIGGER IF EXISTS trg_prevent_auditoria_cierre_mutation ON public.auditoria_cierre_ot;
DROP FUNCTION IF EXISTS public.fn_prevent_auditoria_cierre_mutation();

-- 3. Eliminar tabla de auditoría
DROP TABLE IF EXISTS public.auditoria_cierre_ot;

-- 4. Eliminar catálogo de motivos de rechazo
DROP TABLE IF EXISTS public.cat_motivos_rechazo_ot;

-- 5. Eliminar constraint de calidad 1-5 si aplica
ALTER TABLE public.ordenes_trabajo DROP CONSTRAINT IF EXISTS chk_ot_calidad_1_5;

-- 6. Las columnas aditivas en ordenes_trabajo y solicitudes_mantenimiento
-- se conservan o se eliminan de forma segura si no tienen dependencias:
DO $$
BEGIN
    ALTER TABLE public.ordenes_trabajo DROP COLUMN IF EXISTS cerrada_en;
    ALTER TABLE public.ordenes_trabajo DROP COLUMN IF EXISTS validado_por_solicitante;
    ALTER TABLE public.ordenes_trabajo DROP COLUMN IF EXISTS orden_origen_id;
    ALTER TABLE public.ordenes_trabajo DROP COLUMN IF EXISTS orden_raiz_id;
    ALTER TABLE public.ordenes_trabajo DROP COLUMN IF EXISTS folio_origen;
    ALTER TABLE public.ordenes_trabajo DROP COLUMN IF EXISTS numero_ciclo;
    ALTER TABLE public.ordenes_trabajo DROP COLUMN IF EXISTS codigo_motivo_rechazo;
    ALTER TABLE public.ordenes_trabajo DROP COLUMN IF EXISTS comentario_rechazo;

    ALTER TABLE public.solicitudes_mantenimiento DROP COLUMN IF EXISTS solicitud_origen_id;
    ALTER TABLE public.solicitudes_mantenimiento DROP COLUMN IF EXISTS solicitud_raiz_id;
    ALTER TABLE public.solicitudes_mantenimiento DROP COLUMN IF EXISTS folio_origen;
    ALTER TABLE public.solicitudes_mantenimiento DROP COLUMN IF EXISTS numero_ciclo;
    ALTER TABLE public.solicitudes_mantenimiento DROP COLUMN IF EXISTS motivo_rechazo_previo;
END $$;
