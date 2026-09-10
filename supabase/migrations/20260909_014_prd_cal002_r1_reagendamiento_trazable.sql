-- ============================================================================
-- TSM-AI: Reagendamiento Integral, Seguro y Trazable de Maquinaria
-- Archivo: 20260909_014_prd_cal002_r1_reagendamiento_trazable.sql
-- Código: PRD-CAL002-R1
-- Fecha: 2026-09-09
-- Prioridad: P0/P1 — Seguridad, Operación y Auditoría
-- Ambiente: BASE DE DATOS REAL / PRODUCCIÓN exclusivamente
-- Regla de Oro: ADITIVO + IDEMPOTENTE + REVERSIBLE + CERO DESTRUCCION
-- Dependencias: PRD-DB001-R2/R2.1, PRD-OT001-R1, PRD-USR002-R1, PRD-CAL001-R1, PRD-CAL002-AUD-R1
-- Origen: Hallazgos F-001, F-002, F-003, F-004, F-005
-- ============================================================================
-- REGLA DE AUTORIZACION ABSOLUTA (P0):
-- REAGENDAR = EXCLUSIVAMENTE SUPER_ADMINISTRADOR
-- Ningún otro rol (Responsables de Proceso, Técnicos, Solicitantes) puede reagendar.
-- ============================================================================

-- ============================================================================
-- 0. SNAPSHOT PREVIO — CONTEOS DE INTEGRIDAD
-- ============================================================================
DO $$
DECLARE
    v_cnt_maq BIGINT;
    v_cnt_cal BIGINT;
    v_cnt_det BIGINT;
    v_cnt_ot  BIGINT;
    v_cnt_bit BIGINT;
    v_cnt_seg BIGINT;
BEGIN
    SELECT COUNT(*) INTO v_cnt_maq FROM public.cat_maquinas;
    SELECT COUNT(*) INTO v_cnt_cal FROM public.calendarios_mantenimiento;
    SELECT COUNT(*) INTO v_cnt_det FROM public.calendario_mantenimiento_detalle;
    SELECT COUNT(*) INTO v_cnt_ot  FROM public.ordenes_trabajo;
    SELECT COUNT(*) INTO v_cnt_bit FROM public.bitacora_mantenimiento;
    SELECT COUNT(*) INTO v_cnt_seg FROM public.segundas_por_rollo;

    RAISE NOTICE '=== PRD-CAL002-R1 SNAPSHOT PREVIO ===';
    RAISE NOTICE 'cat_maquinas:                     %', v_cnt_maq;
    RAISE NOTICE 'calendarios_mantenimiento:        %', v_cnt_cal;
    RAISE NOTICE 'calendario_mantenimiento_detalle: %', v_cnt_det;
    RAISE NOTICE 'ordenes_trabajo:                  %', v_cnt_ot;
    RAISE NOTICE 'bitacora_mantenimiento:           %', v_cnt_bit;
    RAISE NOTICE 'segundas_por_rollo:               %', v_cnt_seg;

    IF v_cnt_maq != 135 THEN
        RAISE EXCEPTION 'PRD-CAL002-R1 ABORT: Universo de máquinas alterado (esperado 135, actual %)', v_cnt_maq;
    END IF;
END $$;

-- ============================================================================
-- 1. CATALOGO DE MOTIVOS DE REAGENDAMIENTO: cat_motivos_reagendamiento
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.cat_motivos_reagendamiento (
    codigo              VARCHAR(50) PRIMARY KEY,
    descripcion         TEXT NOT NULL,
    requiere_comentario BOOLEAN NOT NULL DEFAULT FALSE,
    orden               INT NOT NULL DEFAULT 0,
    activo              BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed idempotente de los 9 motivos certificados por PRD-CAL002-R1 §22-24
INSERT INTO public.cat_motivos_reagendamiento (codigo, descripcion, requiere_comentario, orden, activo)
VALUES
    ('MAQUINA_EN_PRODUCCION',  'Máquina en producción activa o requerida por programa prioritario', FALSE, 1, TRUE),
    ('NO_AUTORIZADA_PARADA',   'Parada no autorizada por operaciones o gerencia de planta',        FALSE, 2, TRUE),
    ('FALTA_REFACCION',        'Falta de refacción, componente crítico o consumible en almacén',   FALSE, 3, TRUE),
    ('FALTA_TECNICO',          'Falta de personal técnico calificado o ausencia por turno',        FALSE, 4, TRUE),
    ('CAMBIO_PLAN_PRODUCCION', 'Cambio imprevisto en plan de producción o pedidos urgentes',       FALSE, 5, TRUE),
    ('PRIORIDAD_OPERATIVA',    'Reasignación de recursos a falla correctiva o emergencia',          FALSE, 6, TRUE),
    ('VENTANA_MANTENIMIENTO',  'Reubicación en ventana de paro general o fin de semana',           FALSE, 7, TRUE),
    ('OTRA_EMERGENCIA',        'Falla de suministros generales (energía, vapor, agua, aire)',      FALSE, 8, TRUE),
    ('OTRO',                   'Otro motivo operacional (especificar en comentario)',              TRUE,  9, TRUE)
ON CONFLICT (codigo) DO UPDATE SET
    descripcion         = EXCLUDED.descripcion,
    requiere_comentario = EXCLUDED.requiere_comentario,
    orden               = EXCLUDED.orden,
    activo              = EXCLUDED.activo;

-- Permisos catálogo
GRANT SELECT ON public.cat_motivos_reagendamiento TO anon, authenticated, service_role;

-- ============================================================================
-- 2. TABLA DEDICADA DE AUDITORIA: historial_reagendamientos (APPEND-ONLY)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.historial_reagendamientos (
    id_reagendamiento     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_detalle            UUID NOT NULL REFERENCES public.calendario_mantenimiento_detalle(id_detalle) ON DELETE RESTRICT,
    id_calendario         UUID REFERENCES public.calendarios_mantenimiento(id_calendario) ON DELETE RESTRICT,
    maquina_id            VARCHAR(100) NOT NULL,
    proceso               VARCHAR(10) NOT NULL,
    tipo_mantenimiento    VARCHAR(50) NOT NULL,
    fecha_original        DATE NOT NULL,
    fecha_anterior        DATE NOT NULL,
    fecha_nueva           DATE NOT NULL,
    codigo_motivo         VARCHAR(50) NOT NULL REFERENCES public.cat_motivos_reagendamiento(codigo),
    comentario            TEXT,
    usuario_id            UUID NOT NULL,
    numero_reagendamiento INT NOT NULL DEFAULT 1,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    correlation_id        TEXT
);

-- Indices de rendimiento para consultas y trazabilidad
CREATE INDEX IF NOT EXISTS idx_hist_reag_detalle      ON public.historial_reagendamientos(id_detalle);
CREATE INDEX IF NOT EXISTS idx_hist_reag_maquina      ON public.historial_reagendamientos(maquina_id);
CREATE INDEX IF NOT EXISTS idx_hist_reag_proceso      ON public.historial_reagendamientos(proceso);
CREATE INDEX IF NOT EXISTS idx_hist_reag_fecha_nueva  ON public.historial_reagendamientos(fecha_nueva);
CREATE INDEX IF NOT EXISTS idx_hist_reag_usuario      ON public.historial_reagendamientos(usuario_id);

-- ============================================================================
-- 3. INMUTABILIDAD TRIGGER (APPEND-ONLY DEFENSE-IN-DEPTH)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.fn_historial_reagendamientos_immutable()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'HISTORIAL_APPEND_ONLY: Operaciones UPDATE y DELETE estrictamente prohibidas en historial_reagendamientos (PRD-CAL002-R1 §21).';
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_historial_reagendamientos_immutable ON public.historial_reagendamientos;
CREATE TRIGGER trg_historial_reagendamientos_immutable
BEFORE UPDATE OR DELETE ON public.historial_reagendamientos
FOR EACH ROW EXECUTE FUNCTION public.fn_historial_reagendamientos_immutable();

-- ============================================================================
-- 4. POLÍTICAS RLS EN historial_reagendamientos
-- ============================================================================
ALTER TABLE public.historial_reagendamientos ENABLE ROW LEVEL SECURITY;

-- SELECT: Lectura permitida a usuarios autenticados para auditoría y visualización
DROP POLICY IF EXISTS "p_hist_reag_select" ON public.historial_reagendamientos;
CREATE POLICY "p_hist_reag_select"
    ON public.historial_reagendamientos
    FOR SELECT
    TO authenticated
    USING (TRUE);

-- INSERT: Permitido vía authenticated (la RPC la gestiona como SECURITY DEFINER)
DROP POLICY IF EXISTS "p_hist_reag_insert" ON public.historial_reagendamientos;
CREATE POLICY "p_hist_reag_insert"
    ON public.historial_reagendamientos
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE / DELETE: Prohibidos explícitamente a nivel de RLS
DROP POLICY IF EXISTS "p_hist_reag_no_update" ON public.historial_reagendamientos;
CREATE POLICY "p_hist_reag_no_update"
    ON public.historial_reagendamientos
    FOR UPDATE
    TO authenticated
    USING (FALSE);

DROP POLICY IF EXISTS "p_hist_reag_no_delete" ON public.historial_reagendamientos;
CREATE POLICY "p_hist_reag_no_delete"
    ON public.historial_reagendamientos
    FOR DELETE
    TO authenticated
    USING (FALSE);

GRANT SELECT, INSERT ON public.historial_reagendamientos TO authenticated, service_role;

-- ============================================================================
-- 5. RPC TRANSACCIONAL Y SEGURA: reagendar_mantenimiento_maquinaria
-- ============================================================================
CREATE OR REPLACE FUNCTION public.reagendar_mantenimiento_maquinaria(
    p_id_detalle     UUID,
    p_nueva_fecha    DATE,
    p_codigo_motivo  VARCHAR,
    p_comentario     TEXT DEFAULT NULL
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $rpc$
DECLARE
    v_actor_id        UUID;
    v_user_role       VARCHAR;
    v_user_email      VARCHAR;
    v_detalle         RECORD;
    v_maq             RECORD;
    v_proceso         VARCHAR(10);
    v_fecha_orig      DATE;
    v_num_reag        INT;
    v_req_comentario  BOOLEAN;
    v_new_obs         JSONB;
    v_correlation_id  TEXT;
    v_result          JSONB;
BEGIN
    -- 1. Identificación del Actor autenticado
    v_actor_id := auth.uid();
    IF v_actor_id IS NULL THEN
        RAISE EXCEPTION 'UNAUTHENTICATED: No existe sesión de usuario activa (PRD-CAL002-R1 §26).';
    END IF;

    -- 2. Validación estricta de Rol en Backend (P0: Exclusivo SUPER_ADMINISTRADOR)
    SELECT rol, correo INTO v_user_role, v_user_email
    FROM public.cat_usuarios_roles
    WHERE (id_usuario = v_actor_id OR correo = auth.jwt()->>'email')
      AND rol = 'SUPER_ADMINISTRADOR'
      AND activo = TRUE
    LIMIT 1;

    IF v_user_role IS NULL THEN
        RAISE EXCEPTION 'UNAUTHORIZED: El usuario autenticado (%) no posee el rol SUPER_ADMINISTRADOR requerido para reagendar maquinaria (PRD-CAL002-R1 §1, §3).', v_actor_id;
    END IF;

    -- 3. Parámetro de fecha obligatorio
    IF p_nueva_fecha IS NULL THEN
        RAISE EXCEPTION 'INVALID_DATE: La nueva fecha programada no puede ser nula (PRD-CAL002-R1 §35).';
    END IF;

    -- 4. Validación de motivo
    IF p_codigo_motivo IS NULL OR trim(p_codigo_motivo) = '' THEN
        RAISE EXCEPTION 'INVALID_MOTIVO: El código de motivo de reagendamiento es obligatorio (PRD-CAL002-R1 §23).';
    END IF;

    SELECT requiere_comentario INTO v_req_comentario
    FROM public.cat_motivos_reagendamiento
    WHERE codigo = p_codigo_motivo AND activo = TRUE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'INVALID_MOTIVO: El motivo "%" no existe en cat_motivos_reagendamiento o está inactivo.', p_codigo_motivo;
    END IF;

    IF (v_req_comentario OR p_codigo_motivo = 'OTRO') AND (p_comentario IS NULL OR trim(p_comentario) = '') THEN
        RAISE EXCEPTION 'COMMENT_REQUIRED: Se requiere un comentario explicativo cuando el motivo es "%" (PRD-CAL002-R1 §24).', p_codigo_motivo;
    END IF;

    -- 5. Bloqueo transaccional del detalle de calendario
    SELECT * INTO v_detalle
    FROM public.calendario_mantenimiento_detalle
    WHERE id_detalle = p_id_detalle
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'NOT_FOUND: No se encontró el registro con id_detalle %.', p_id_detalle;
    END IF;

    -- 6. Validación de cambio real de fecha (evitar falso historial)
    IF v_detalle.fecha_programada = p_nueva_fecha THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'status', 'NO_CHANGE',
            'mensaje', 'La fecha seleccionada es idéntica a la fecha actualmente programada.',
            'id_detalle', p_id_detalle,
            'fecha_programada', v_detalle.fecha_programada
        );
    END IF;

    -- 7. Resolución estructurada de máquina y proceso
    SELECT * INTO v_maq
    FROM public.cat_maquinas
    WHERE equipo_towell = v_detalle.maquina_id
       OR id_maquina::TEXT = v_detalle.maquina_id
       OR clave = v_detalle.maquina_id
    LIMIT 1;

    IF FOUND THEN
        v_proceso := COALESCE(v_maq.departamento_codigo, v_maq.area);
    ELSE
        -- Fallback a observaciones de detalle si existe
        IF v_detalle.observaciones IS NOT NULL AND (v_detalle.observaciones ? 'area' OR v_detalle.observaciones ? 'proceso') THEN
            v_proceso := COALESCE(v_detalle.observaciones->>'area', v_detalle.observaciones->>'proceso');
        ELSE
            v_proceso := 'INCONSISTENCIA_DE_PROCESO';
        END IF;
    END IF;

    IF v_proceso IS NULL OR v_proceso NOT IN ('PF', 'CF', 'TF', 'AF') THEN
        RAISE EXCEPTION 'INVALID_MACHINE_PROCESS: No fue posible resolver un proceso válido (PF/CF/TF/AF) para la máquina % (PRD-CAL002-R1 §34).', v_detalle.maquina_id;
    END IF;

    -- 8. Determinación de FECHA ORIGINAL inmutable
    SELECT fecha_original INTO v_fecha_orig
    FROM public.historial_reagendamientos
    WHERE id_detalle = p_id_detalle
    ORDER BY numero_reagendamiento ASC
    LIMIT 1;

    IF v_fecha_orig IS NULL THEN
        -- Si no hay historial previo, consultar observaciones o tomar la fecha programada actual como original
        IF v_detalle.observaciones IS NOT NULL AND v_detalle.observaciones ? 'fecha_original' THEN
            v_fecha_orig := (v_detalle.observaciones->>'fecha_original')::DATE;
        ELSE
            v_fecha_orig := v_detalle.fecha_programada;
        END IF;
    END IF;

    -- 9. Cálculo del número de reagendamiento correlativo
    SELECT COALESCE(MAX(numero_reagendamiento), 0) + 1 INTO v_num_reag
    FROM public.historial_reagendamientos
    WHERE id_detalle = p_id_detalle;

    v_correlation_id := 'REAG-' || to_char(NOW(), 'YYYYMMDD-HH24MISS') || '-' || substring(gen_random_uuid()::TEXT from 1 for 8);

    -- 10. INSERT en historial_reagendamientos
    INSERT INTO public.historial_reagendamientos (
        id_detalle,
        id_calendario,
        maquina_id,
        proceso,
        tipo_mantenimiento,
        fecha_original,
        fecha_anterior,
        fecha_nueva,
        codigo_motivo,
        comentario,
        usuario_id,
        numero_reagendamiento,
        created_at,
        correlation_id
    ) VALUES (
        p_id_detalle,
        v_detalle.id_calendario,
        v_detalle.maquina_id,
        v_proceso,
        v_detalle.tipo_mantenimiento,
        v_fecha_orig,
        v_detalle.fecha_programada,
        p_nueva_fecha,
        p_codigo_motivo,
        trim(p_comentario),
        v_actor_id,
        v_num_reag,
        NOW(),
        v_correlation_id
    );

    -- 11. Actualización atómica de calendario_mantenimiento_detalle
    -- Preservar estructura JSONB previa y adjuntar metadatos inmutables
    v_new_obs := COALESCE(v_detalle.observaciones, '{}'::JSONB);
    v_new_obs := jsonb_set(v_new_obs, '{fecha_original}', to_jsonb(to_char(v_fecha_orig, 'YYYY-MM-DD')));
    v_new_obs := jsonb_set(v_new_obs, '{reagendado}', 'true'::JSONB);
    v_new_obs := jsonb_set(v_new_obs, '{ultimo_reagendamiento}', jsonb_build_object(
        'numero', v_num_reag,
        'fecha_anterior', to_char(v_detalle.fecha_programada, 'YYYY-MM-DD'),
        'fecha_nueva', to_char(p_nueva_fecha, 'YYYY-MM-DD'),
        'codigo_motivo', p_codigo_motivo,
        'comentario', trim(p_comentario),
        'usuario_id', v_actor_id,
        'timestamp', NOW(),
        'correlation_id', v_correlation_id
    ));

    UPDATE public.calendario_mantenimiento_detalle
    SET fecha_programada     = p_nueva_fecha,
        fecha_actualizacion  = NOW(),
        observaciones        = v_new_obs
    WHERE id_detalle = p_id_detalle;

    -- 12. Retorno de confirmación estructurada
    v_result := jsonb_build_object(
        'success', TRUE,
        'status', 'REAGENDADO_EXITOSO',
        'id_detalle', p_id_detalle,
        'id_calendario', v_detalle.id_calendario,
        'maquina_id', v_detalle.maquina_id,
        'proceso', v_proceso,
        'tipo_mantenimiento', v_detalle.tipo_mantenimiento,
        'prioridad', v_detalle.prioridad,
        'fecha_original', to_char(v_fecha_orig, 'YYYY-MM-DD'),
        'fecha_anterior', to_char(v_detalle.fecha_programada, 'YYYY-MM-DD'),
        'fecha_nueva', to_char(p_nueva_fecha, 'YYYY-MM-DD'),
        'numero_reagendamiento', v_num_reag,
        'codigo_motivo', p_codigo_motivo,
        'comentario', trim(p_comentario),
        'usuario_id', v_actor_id,
        'correlation_id', v_correlation_id
    );

    RETURN v_result;
END;
$rpc$;

-- Grants controlados para la RPC
REVOKE ALL ON FUNCTION public.reagendar_mantenimiento_maquinaria(UUID, DATE, VARCHAR, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reagendar_mantenimiento_maquinaria(UUID, DATE, VARCHAR, TEXT) TO authenticated, service_role;

-- ============================================================================
-- 6. CONFIRMACIÓN Y CIERRE
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '=== PRD-CAL002-R1 MIGRACION APLICADA EXITOSAMENTE ===';
    RAISE NOTICE 'Tabla cat_motivos_reagendamiento: 9 motivos certificados creados';
    RAISE NOTICE 'Tabla historial_reagendamientos:  Append-Only con RLS y Trigger activo';
    RAISE NOTICE 'RPC reagendar_mantenimiento_maquinaria: Exclusiva para SUPER_ADMINISTRADOR';
END $$;
