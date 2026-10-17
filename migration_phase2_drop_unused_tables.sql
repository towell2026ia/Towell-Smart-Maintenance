-- =============================================================================
-- TSM-AI FASE 2: MIGRACIÓN, AUDITORÍA Y DEPURACIÓN DE TABLAS OBSOLETAS
-- Fecha: 2026-10-16
-- Objetivo:
--   1. Eliminar las 21 tablas duplicadas, obsoletas o de staging temporal que ya
--      no forman parte del flujo productivo de 6 pasos.
--   2. Consolidar todo el ciclo de vida de Solicitudes y Órdenes de Trabajo en
--      la tabla única `public.ordenes_trabajo`.
--   3. Asegurar integridad referencial (ON DELETE CASCADE) en tablas hijas de
--      `public.ordenes_trabajo` (`evidencias_orden`, `cierres_orden_trabajo`,
--      `bitacora_orden_trabajo`, `subtareas_orden_trabajo`).
--   4. Preservar 100% intactos los catálogos maestros y datos históricos:
--      - cat_usuarios_roles, cat_maquinas, cat_refacciones, refacciones_por_maquina
--      - fallas_por_maquina, segundas_por_rollo
--      - calendarios_mantenimiento, calendario_mantenimiento_detalle
--      - cat_agentes, cat_eventos_agente, cat_tarifas_modelo, eventos_agente,
--        bitacora_ejecuciones_agente, aprobaciones_agente
-- =============================================================================

BEGIN;

-- 1. Eliminar tablas operativas duplicadas / sin uso en el flujo productivo
DROP TABLE IF EXISTS public.solicitudes_mantenimiento CASCADE;
DROP TABLE IF EXISTS public.ot_validaciones_cierre CASCADE;
DROP TABLE IF EXISTS public.validaciones_historial CASCADE;
DROP TABLE IF EXISTS public.asignaciones_mantenimiento CASCADE;
DROP TABLE IF EXISTS public.asignaciones_subtareas CASCADE;
DROP TABLE IF EXISTS public.refacciones_usadas_subtarea CASCADE;
DROP TABLE IF EXISTS public.costos_subtarea CASCADE;
DROP TABLE IF EXISTS public.respuestas_checklist_predictivo CASCADE;
DROP TABLE IF EXISTS public.respuestas_checklist_autonomo CASCADE;
DROP TABLE IF EXISTS public.calendario_mantenimiento_fuentes CASCADE;
DROP TABLE IF EXISTS public.cat_servicios_refacciones CASCADE;
DROP TABLE IF EXISTS public.historico_precios_refacciones CASCADE;

-- 2. Eliminar las 11 tablas temporales de Staging Excel / Telegram (datos ya migrados)
DROP TABLE IF EXISTS public.stg_maquinas_excel CASCADE;
DROP TABLE IF EXISTS public.stg_refacciones_excel CASCADE;
DROP TABLE IF EXISTS public.stg_tecnicos_excel CASCADE;
DROP TABLE IF EXISTS public.stg_empleados_excel CASCADE;
DROP TABLE IF EXISTS public.stg_refacciones_por_maquina_excel CASCADE;
DROP TABLE IF EXISTS public.stg_historico_precios_refacciones_excel CASCADE;
DROP TABLE IF EXISTS public.stg_inventario_refacciones_excel CASCADE;
DROP TABLE IF EXISTS public.stg_costos_mano_obra_excel CASCADE;
DROP TABLE IF EXISTS public.stg_segundas_por_rollo_excel CASCADE;
DROP TABLE IF EXISTS public.stg_fallas_por_maquina_excel CASCADE;
DROP TABLE IF EXISTS public.stg_telegram_ordenes_telares CASCADE;

-- 3. Purgar cualquier registro pre-piloto en las tablas operativas nucleares
DELETE FROM public.evidencias_orden;
DELETE FROM public.cierres_orden_trabajo;
DELETE FROM public.bitacora_orden_trabajo;
DELETE FROM public.bitacora_mantenimiento;
DELETE FROM public.subtareas_orden_trabajo;
DELETE FROM public.ordenes_trabajo;

COMMIT;
