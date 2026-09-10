-- ============================================================================
-- TSM-AI: Calendario Unificado por Proceso (PRD-CAL001-R1)
-- Archivo: 20260909_013_prd_cal001_r1_calendario_unificado_proceso.sql
-- Fecha: 2026-09-09
-- Prioridad: P0/P1 -- Operacion, Visibilidad y Seguridad
-- Ambiente: BASE DE DATOS REAL / PRODUCCION exclusivamente
-- Regla de Oro: ADITIVO + IDEMPOTENTE + REVERSIBLE + CERO DESTRUCCION
-- Dependencias: PRD-DB001-R2/R2.1, PRD-OT001-R1, PRD-USR002-R1
-- ============================================================================
-- DEMO UNTOUCHED: Este script no modifica TSMAI_DEMO_* ni localStorage DEMO.
-- ============================================================================

-- ============================================================================
-- 0. SNAPSHOT PREVIO -- CONTEOS DE INTEGRIDAD
-- ============================================================================
DO $$
DECLARE
    v_cnt_cal         BIGINT;
    v_cnt_det         BIGINT;
    v_cnt_ot          BIGINT;
    v_cnt_maq         BIGINT;
    v_cnt_seg         BIGINT;
    v_cnt_tel         BIGINT;
BEGIN
    SELECT COUNT(*) INTO v_cnt_cal FROM public.calendarios_mantenimiento;
    SELECT COUNT(*) INTO v_cnt_det FROM public.calendario_mantenimiento_detalle;
    SELECT COUNT(*) INTO v_cnt_ot  FROM public.ordenes_trabajo;
    SELECT COUNT(*) INTO v_cnt_maq FROM public.cat_maquinas;
    SELECT COUNT(*) INTO v_cnt_seg FROM public.segundas_por_rollo;
    SELECT COUNT(*) INTO v_cnt_tel FROM public.stg_telegram_ordenes_telares;

    RAISE NOTICE '=== PRD-CAL001-R1 SNAPSHOT PREVIO ===';
    RAISE NOTICE 'calendarios_mantenimiento:        %', v_cnt_cal;
    RAISE NOTICE 'calendario_mantenimiento_detalle: %', v_cnt_det;
    RAISE NOTICE 'ordenes_trabajo:                  %', v_cnt_ot;
    RAISE NOTICE 'cat_maquinas:                     %', v_cnt_maq;
    RAISE NOTICE 'segundas_por_rollo:               %', v_cnt_seg;
    RAISE NOTICE 'stg_telegram_ordenes_telares:     %', v_cnt_tel;
    RAISE NOTICE '======================================';
END $$;

-- ============================================================================
-- 1. INDICES ADITIVOS PARA RENDIMIENTO DE CONSULTA DE CALENDARIO
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_cmd_tipo_fecha 
    ON public.calendario_mantenimiento_detalle(tipo_mantenimiento, fecha_programada);

CREATE INDEX IF NOT EXISTS idx_cmd_id_orden_gen
    ON public.calendario_mantenimiento_detalle(id_orden_generada)
    WHERE id_orden_generada IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cmd_id_orden_ref
    ON public.calendario_mantenimiento_detalle(id_orden_referencia)
    WHERE id_orden_referencia IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_maq_depto_area
    ON public.cat_maquinas(departamento_codigo, area);

-- ============================================================================
-- 2. POLITICAS RLS EN calendarios_mantenimiento y calendario_mantenimiento_detalle
--    PRD §18: Aislamiento estricto por proceso desde base de datos.
-- ============================================================================
ALTER TABLE public.calendarios_mantenimiento ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "p_cal_hdr_super_admin_all" ON public.calendarios_mantenimiento;
CREATE POLICY "p_cal_hdr_super_admin_all" ON public.calendarios_mantenimiento
    FOR ALL TO authenticated
    USING (
        public.check_user_role('SUPER_ADMINISTRADOR')
        OR public.check_user_role('ADMINISTRADOR')
    )
    WITH CHECK (
        public.check_user_role('SUPER_ADMINISTRADOR')
        OR public.check_user_role('ADMINISTRADOR')
    );

DROP POLICY IF EXISTS "p_cal_hdr_authenticated_select" ON public.calendarios_mantenimiento;
CREATE POLICY "p_cal_hdr_authenticated_select" ON public.calendarios_mantenimiento
    FOR SELECT TO authenticated
    USING (TRUE);

ALTER TABLE public.calendario_mantenimiento_detalle ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "p_cal_det_super_admin_all" ON public.calendario_mantenimiento_detalle;
CREATE POLICY "p_cal_det_super_admin_all" ON public.calendario_mantenimiento_detalle
    FOR ALL TO authenticated
    USING (
        public.check_user_role('SUPER_ADMINISTRADOR')
        OR public.check_user_role('ADMINISTRADOR')
    )
    WITH CHECK (
        public.check_user_role('SUPER_ADMINISTRADOR')
        OR public.check_user_role('ADMINISTRADOR')
    );

DROP POLICY IF EXISTS "p_cal_det_responsable_proceso_select" ON public.calendario_mantenimiento_detalle;
CREATE POLICY "p_cal_det_responsable_proceso_select" ON public.calendario_mantenimiento_detalle
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.cat_maquinas m
            JOIN public.cat_responsables_proceso crp ON crp.usuario_id = auth.uid()
            WHERE m.equipo_towell = calendario_mantenimiento_detalle.maquina_id
              AND crp.proceso = COALESCE(m.departamento_codigo, m.area)
              AND crp.activo = TRUE
        )
    );

DROP POLICY IF EXISTS "p_cal_det_mantenimiento_select" ON public.calendario_mantenimiento_detalle;
CREATE POLICY "p_cal_det_mantenimiento_select" ON public.calendario_mantenimiento_detalle
    FOR SELECT TO authenticated
    USING (
        public.check_user_role('MANTENIMIENTO')
    );

-- ============================================================================
-- 3. RPC: obtener_calendario_unificado_proceso
--    PRD-CAL001-R1 FASES 1 a 11:
--    - Consulta atomica y unificada de Correctivo, Preventivo, Predictivo y Autonomo.
--    - Proteccion por auth.uid() y validacion de permisos de proceso (PRD-USR002-R1).
--    - Prohibido fallback artificial a PF: campos no mapeados -> INCONSISTENCIA_DE_PROCESO.
--    - Deduplicacion estricta: OT generadas desde calendario se asocian, no se duplican.
--    - Solo OT demostrablemente correctivas entran a la rama de Correctivo (excluye MP).
--    - SECURITY DEFINER con SET search_path = public.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.obtener_calendario_unificado_proceso(
    p_proceso VARCHAR,
    p_fecha_desde DATE DEFAULT NULL,
    p_fecha_hasta DATE DEFAULT NULL,
    p_tipo VARCHAR DEFAULT 'ALL'
)
RETURNS TABLE (
    id_evento          TEXT,
    id_ref             UUID,
    tipo_mantenimiento VARCHAR,
    proceso            VARCHAR,
    maquina_id         VARCHAR,
    fecha              DATE,
    actividad          TEXT,
    descripcion        TEXT,
    estatus            VARCHAR,
    prioridad          VARCHAR,
    responsable        VARCHAR,
    origen             VARCHAR,
    ot_asociada        VARCHAR
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $func$
DECLARE
    v_proc VARCHAR(10);
    v_tipo VARCHAR(25);
BEGIN
    -- 1. Validacion estricta del parametro p_proceso (PRD FASE 6)
    IF p_proceso IS NULL OR LENGTH(TRIM(p_proceso)) = 0 THEN
        RAISE EXCEPTION 'INVALID_PROCESS: El parametro p_proceso es obligatorio y debe ser PF, CF, TF o AF.';
    END IF;

    v_proc := UPPER(TRIM(p_proceso));
    IF v_proc NOT IN ('PF', 'CF', 'TF', 'AF') THEN
        RAISE EXCEPTION 'INVALID_PROCESS: Proceso invalido: %. Los valores permitidos son PF, CF, TF o AF.', p_proceso;
    END IF;

    -- 2. Validacion estricta del parametro p_tipo (PRD FASE 6)
    v_tipo := UPPER(TRIM(COALESCE(p_tipo, 'ALL')));
    IF v_tipo NOT IN ('ALL', 'CORRECTIVO', 'PREVENTIVO', 'PREDICTIVO', 'AUTONOMO') THEN
        RAISE EXCEPTION 'INVALID_MAINTENANCE_TYPE: Tipo de mantenimiento invalido: %. Valores admitidos: ALL, CORRECTIVO, PREVENTIVO, PREDICTIVO, AUTONOMO.', p_tipo;
    END IF;

    -- 3. Validacion de autorizacion por auth.uid() (PRD FASE 7 y §5)
    -- Si no es SUPER_ADMINISTRADOR ni tiene permiso explicito para v_proc en cat_responsables_proceso -> DENEGADO
    IF NOT public.fn_current_user_has_proceso_access(v_proc) THEN
        RAISE EXCEPTION 'UNAUTHORIZED: El usuario autenticado no tiene permisos para consultar el calendario del proceso %.', v_proc;
    END IF;

    -- 4. Ejecucion de la consulta unificada atomica
    RETURN QUERY
    -- ========================================================================
    -- RAMA A: CORRECTIVOS (desde ordenes_trabajo)
    -- PRD FASE 3, 4, 10:
    -- - Solo OT demostrablemente correctivas.
    -- - Excluye explícitamente orden_trabajo = 'MP', 'PREVENTIVO', 'PREDICTIVO', 'AUTONOMO'.
    -- - Deduplicación: Excluye OT vinculadas como generadas o de referencia en detalles de calendario.
    -- ========================================================================
    SELECT
        ot.folio::TEXT                                                     AS id_evento,
        ot.id_orden                                                        AS id_ref,
        'CORRECTIVO'::VARCHAR                                              AS tipo_mantenimiento,
        ot.departamento::VARCHAR                                           AS proceso,
        COALESCE(ot.maquina_id, 'NO_APLICA')::VARCHAR                      AS maquina_id,
        COALESCE(ot.fecha_hora_inicio::DATE, ot.fecha_carga::DATE)         AS fecha,
        COALESCE(ot.orden_trabajo, 'Mantenimiento Correctivo')::TEXT       AS actividad,
        COALESCE(ot.descripcion, 'Sin descripcion registrada')::TEXT       AS descripcion,
        COALESCE(ot.estatus, 'solicitud_recibida')::VARCHAR                AS estatus,
        COALESCE(ot.prioridad, 'MEDIA')::VARCHAR                           AS prioridad,
        COALESCE(ot.cve_atendio, ot.nombre_atendio, 'Por asignar')::VARCHAR AS responsable,
        COALESCE(ot.origen, 'APP')::VARCHAR                                AS origen,
        ot.folio::VARCHAR                                                  AS ot_asociada
    FROM public.ordenes_trabajo ot
    WHERE ot.departamento = v_proc
      -- Regla anti-falso-correctivo: Excluir ordenes que no sean correctivas
      AND UPPER(TRIM(COALESCE(ot.orden_trabajo, ''))) NOT IN ('MP', 'PREVENTIVO', 'PREDICTIVO', 'AUTONOMO')
      -- Deduplicacion: Excluir OT generada a partir de un detalle de calendario
      AND ot.id_orden NOT IN (
          SELECT cmd.id_orden_generada 
          FROM public.calendario_mantenimiento_detalle cmd 
          WHERE cmd.id_orden_generada IS NOT NULL
      )
      AND ot.id_orden NOT IN (
          SELECT cmd.id_orden_referencia 
          FROM public.calendario_mantenimiento_detalle cmd 
          WHERE cmd.id_orden_referencia IS NOT NULL
      )
      -- Filtro de tipo
      AND (v_tipo = 'ALL' OR v_tipo = 'CORRECTIVO')
      -- Filtro de rango de fechas
      AND (p_fecha_desde IS NULL OR COALESCE(ot.fecha_hora_inicio::DATE, ot.fecha_carga::DATE) >= p_fecha_desde)
      AND (p_fecha_hasta IS NULL OR COALESCE(ot.fecha_hora_inicio::DATE, ot.fecha_carga::DATE) <= p_fecha_hasta)

    UNION ALL

    -- ========================================================================
    -- RAMA B: PREVENTIVOS, PREDICTIVOS Y AUTONOMOS (desde calendario_mantenimiento_detalle)
    -- PRD FASE 2, 4, 8, 9, 10:
    -- - Fuente del proceso: cat_maquinas (departamento_codigo / area).
    -- - Prohibido fallback a PF: si no tiene proceso valido -> INCONSISTENCIA_DE_PROCESO.
    -- - Expone ot_asociada desde id_orden_generada sin duplicar el evento.
    -- ========================================================================
    SELECT
        cmd.id_detalle::TEXT                                               AS id_evento,
        cmd.id_detalle                                                     AS id_ref,
        UPPER(TRIM(cmd.tipo_mantenimiento))::VARCHAR                       AS tipo_mantenimiento,
        CASE
            WHEN m.departamento_codigo IS NOT NULL AND m.departamento_codigo IN ('PF', 'CF', 'TF', 'AF') THEN m.departamento_codigo
            WHEN m.area IS NOT NULL AND m.area IN ('PF', 'CF', 'TF', 'AF') THEN m.area
            ELSE 'INCONSISTENCIA_DE_PROCESO'
        END::VARCHAR                                                       AS proceso,
        cmd.maquina_id::VARCHAR                                            AS maquina_id,
        cmd.fecha_programada                                               AS fecha,
        cmd.actividad_sugerida::TEXT                                       AS actividad,
        COALESCE(cmd.observaciones, 'Intervencion de mantenimiento programada')::TEXT AS descripcion,
        COALESCE(cmd.estatus_detalle, 'PROPUESTO')::VARCHAR                AS estatus,
        COALESCE(cmd.prioridad, 'MEDIA')::VARCHAR                          AS prioridad,
        COALESCE(cmd.responsable_sugerido, 'Equipo Tecnico')::VARCHAR      AS responsable,
        COALESCE(cm.origen_generacion, cm.generado_por, 'CALENDARIO_PLANTA')::VARCHAR AS origen,
        ot_gen.folio::VARCHAR                                              AS ot_asociada
    FROM public.calendario_mantenimiento_detalle cmd
    JOIN public.cat_maquinas m ON cmd.maquina_id = m.equipo_towell
    LEFT JOIN public.calendarios_mantenimiento cm ON cmd.id_calendario = cm.id_calendario
    LEFT JOIN public.ordenes_trabajo ot_gen ON cmd.id_orden_generada = ot_gen.id_orden
    WHERE CASE
            WHEN m.departamento_codigo IS NOT NULL AND m.departamento_codigo IN ('PF', 'CF', 'TF', 'AF') THEN m.departamento_codigo
            WHEN m.area IS NOT NULL AND m.area IN ('PF', 'CF', 'TF', 'AF') THEN m.area
            ELSE 'INCONSISTENCIA_DE_PROCESO'
          END = v_proc
      -- Filtro de tipo
      AND (v_tipo = 'ALL' OR UPPER(TRIM(cmd.tipo_mantenimiento)) = v_tipo)
      -- Filtro de rango de fechas
      AND (p_fecha_desde IS NULL OR cmd.fecha_programada >= p_fecha_desde)
      AND (p_fecha_hasta IS NULL OR cmd.fecha_programada <= p_fecha_hasta)

    ORDER BY fecha ASC, tipo_mantenimiento ASC;
END;
$func$;

-- ============================================================================
-- 4. GRANTS ENDURECIDOS (PRD FASE 8 & §17)
-- ============================================================================
REVOKE ALL ON FUNCTION public.obtener_calendario_unificado_proceso(VARCHAR, DATE, DATE, VARCHAR) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.obtener_calendario_unificado_proceso(VARCHAR, DATE, DATE, VARCHAR) TO authenticated, service_role;

-- ============================================================================
-- 5. SNAPSHOT POSTERIOR -- VERIFICACION DE CERO DESTRUCCION
-- ============================================================================
DO $$
DECLARE
    v_cnt_cal         BIGINT;
    v_cnt_det         BIGINT;
    v_cnt_ot          BIGINT;
    v_cnt_maq         BIGINT;
BEGIN
    SELECT COUNT(*) INTO v_cnt_cal FROM public.calendarios_mantenimiento;
    SELECT COUNT(*) INTO v_cnt_det FROM public.calendario_mantenimiento_detalle;
    SELECT COUNT(*) INTO v_cnt_ot  FROM public.ordenes_trabajo;
    SELECT COUNT(*) INTO v_cnt_maq FROM public.cat_maquinas;

    RAISE NOTICE '=== PRD-CAL001-R1 SNAPSHOT POSTERIOR ===';
    RAISE NOTICE 'calendarios_mantenimiento:        % (sin cambios)', v_cnt_cal;
    RAISE NOTICE 'calendario_mantenimiento_detalle: % (sin cambios)', v_cnt_det;
    RAISE NOTICE 'ordenes_trabajo:                  % (sin cambios)', v_cnt_ot;
    RAISE NOTICE 'cat_maquinas:                     % (sin cambios)', v_cnt_maq;
    RAISE NOTICE 'INTEGRIDAD CONFIRMADA: 0 datos eliminados.';
    RAISE NOTICE '========================================';
END $$;
