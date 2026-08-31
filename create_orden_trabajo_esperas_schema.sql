-- ============================================================================
-- TSM-AI: Módulo de Estado EN ESPERA con Motivo, Trazabilidad y Seguimiento
-- Archivo: create_orden_trabajo_esperas_schema.sql
-- PRD: PRD-TECH-WAIT-001-R1
-- ============================================================================

-- 1. Tabla Relacional 1:N de Periodos de Espera
CREATE TABLE IF NOT EXISTS public.orden_trabajo_esperas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_orden UUID NOT NULL REFERENCES public.ordenes_trabajo(id_orden) ON DELETE RESTRICT,
    ot_folio VARCHAR(50),
    maquina_id VARCHAR(50) REFERENCES public.cat_maquinas(equipo_towell) ON UPDATE CASCADE ON DELETE RESTRICT,
    tecnico_id UUID REFERENCES public.cat_usuarios_roles(id_usuario) ON UPDATE CASCADE ON DELETE RESTRICT,
    nombre_tecnico VARCHAR(150),
    motivo VARCHAR(50) NOT NULL,
    categoria_motivo VARCHAR(50) NOT NULL DEFAULT 'OPERACIONAL',
    observacion TEXT NOT NULL,
    refaccion_codigo VARCHAR(100),
    refaccion_cantidad NUMERIC(10,2),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    duration_seconds INTEGER DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVA',
    resolved_by UUID REFERENCES public.cat_usuarios_roles(id_usuario),
    resolution_note TEXT,
    client_request_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_espera_motivo CHECK (
        motivo IN (
            'REFACCION',
            'AUTORIZACION',
            'PRODUCCION',
            'HERRAMIENTA',
            'PROVEEDOR',
            'SEGURIDAD',
            'INFORMACION',
            'OTRO'
        )
    ),
    CONSTRAINT chk_espera_status CHECK (
        status IN ('ACTIVA', 'RESUELTA', 'CANCELADA')
    )
);

-- 2. Índices de Rendimiento y Regla de Unicidad
CREATE UNIQUE INDEX IF NOT EXISTS idx_uniq_active_wait_per_ot 
    ON public.orden_trabajo_esperas(id_orden) 
    WHERE status = 'ACTIVA';

CREATE INDEX IF NOT EXISTS idx_orden_trabajo_esperas_ot ON public.orden_trabajo_esperas(id_orden);
CREATE INDEX IF NOT EXISTS idx_orden_trabajo_esperas_maquina ON public.orden_trabajo_esperas(maquina_id);
CREATE INDEX IF NOT EXISTS idx_orden_trabajo_esperas_motivo ON public.orden_trabajo_esperas(motivo);
CREATE INDEX IF NOT EXISTS idx_orden_trabajo_esperas_started ON public.orden_trabajo_esperas(started_at);
CREATE INDEX IF NOT EXISTS idx_orden_trabajo_esperas_client_req ON public.orden_trabajo_esperas(client_request_id);

-- 3. Trigger para updated_at automático
CREATE OR REPLACE FUNCTION public.fn_set_updated_at_orden_trabajo_esperas()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_updated_at_orden_trabajo_esperas ON public.orden_trabajo_esperas;
CREATE TRIGGER trg_set_updated_at_orden_trabajo_esperas
    BEFORE UPDATE ON public.orden_trabajo_esperas
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_set_updated_at_orden_trabajo_esperas();

-- 4. RPC: set_ot_waiting (Transaccional, Atómica y con Bloqueo de Fila)
CREATE OR REPLACE FUNCTION public.set_ot_waiting(
    p_ot_id TEXT,
    p_motivo TEXT,
    p_observacion TEXT,
    p_refaccion_codigo TEXT DEFAULT NULL,
    p_refaccion_cantidad NUMERIC DEFAULT NULL,
    p_client_request_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_ot_row public.ordenes_trabajo%ROWTYPE;
    v_ot_uuid UUID;
    v_user_id UUID;
    v_user_name TEXT;
    v_user_role TEXT;
    v_categoria TEXT;
    v_existing_wait UUID;
    v_new_wait public.orden_trabajo_esperas%ROWTYPE;
BEGIN
    -- 1. Identificar usuario autenticado
    v_user_id := auth.uid();
    v_user_role := COALESCE(auth.jwt() -> 'user_metadata' ->> 'rol', 'TECNICO');
    
    SELECT nombre_completo INTO v_user_name 
    FROM public.cat_usuarios_roles 
    WHERE id_usuario = v_user_id LIMIT 1;
    
    IF v_user_name IS NULL THEN
        v_user_name := COALESCE(auth.jwt() -> 'user_metadata' ->> 'nombre_completo', 'Técnico de Mantenimiento');
    END IF;

    -- 2. Resolver OT y Bloquear Fila (FOR UPDATE)
    IF p_ot_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        SELECT * INTO v_ot_row FROM public.ordenes_trabajo WHERE id_orden = p_ot_id::UUID FOR UPDATE;
    ELSE
        SELECT * INTO v_ot_row FROM public.ordenes_trabajo WHERE folio = p_ot_id FOR UPDATE;
    END IF;

    IF v_ot_row.id_orden IS NULL THEN
        RAISE EXCEPTION 'OT_NOT_FOUND: La orden de trabajo no existe.';
    END IF;

    v_ot_uuid := v_ot_row.id_orden;

    -- 3. Validar Estados Permitidos
    IF v_ot_row.estatus IN ('Cerrada', 'Cancelada', 'Validada', 'EJECUTADA', 'CERRADA', 'VALIDADA') THEN
        RAISE EXCEPTION 'INVALID_OT_STATUS: No se puede poner en espera una OT que ya se encuentra cerrada o finalizada.';
    END IF;

    -- 4. Validar Idempotencia con client_request_id
    IF p_client_request_id IS NOT NULL THEN
        SELECT id INTO v_existing_wait 
        FROM public.orden_trabajo_esperas 
        WHERE client_request_id = p_client_request_id LIMIT 1;

        IF v_existing_wait IS NOT NULL THEN
            SELECT * INTO v_new_wait FROM public.orden_trabajo_esperas WHERE id = v_existing_wait;
            RETURN row_to_json(v_new_wait)::jsonb;
        END IF;
    END IF;

    -- 5. Validar que no exista ya una espera ACTIVA
    SELECT id INTO v_existing_wait 
    FROM public.orden_trabajo_esperas 
    WHERE id_orden = v_ot_uuid AND status = 'ACTIVA' LIMIT 1;

    IF v_existing_wait IS NOT NULL THEN
        RAISE EXCEPTION 'WAIT_ALREADY_ACTIVE: Esta orden de trabajo ya tiene un periodo de espera activo.';
    END IF;

    -- 6. Validar Motivo y Observación Obligatorios
    IF p_motivo IS NULL OR TRIM(p_motivo) = '' THEN
        RAISE EXCEPTION 'MOTIVO_REQUIRED: El motivo de espera es obligatorio.';
    END IF;

    IF p_observacion IS NULL OR TRIM(p_observacion) = '' THEN
        RAISE EXCEPTION 'OBSERVATION_REQUIRED: La observación explicativa de la espera es obligatoria.';
    END IF;

    -- 7. Derivar Categoría Server-Side
    IF p_motivo IN ('REFACCION', 'AUTORIZACION', 'PRODUCCION', 'PROVEEDOR') THEN
        v_categoria := 'EXTERNA';
    ELSIF p_motivo IN ('HERRAMIENTA', 'SEGURIDAD', 'INFORMACION') THEN
        v_categoria := 'OPERACIONAL';
    ELSE
        v_categoria := 'SIN_CLASIFICAR';
    END IF;

    -- 8. Insertar Periodo de Espera
    INSERT INTO public.orden_trabajo_esperas (
        id_orden,
        ot_folio,
        maquina_id,
        tecnico_id,
        nombre_tecnico,
        motivo,
        categoria_motivo,
        observacion,
        refaccion_codigo,
        refaccion_cantidad,
        started_at,
        status,
        client_request_id
    ) VALUES (
        v_ot_uuid,
        v_ot_row.folio,
        v_ot_row.maquina_id,
        v_user_id,
        v_user_name,
        p_motivo,
        v_categoria,
        TRIM(p_observacion),
        p_refaccion_codigo,
        p_refaccion_cantidad,
        NOW(),
        'ACTIVA',
        p_client_request_id
    ) RETURNING * INTO v_new_wait;

    -- 9. Actualizar Estatus de la OT a EN_ESPERA
    UPDATE public.ordenes_trabajo
    SET estatus = 'EN_ESPERA'
    WHERE id_orden = v_ot_uuid;

    -- 10. Registrar en Bitácora de Movimientos
    INSERT INTO public.bitacora_orden_trabajo (
        id_orden,
        estatus_anterior,
        estatus_nuevo,
        usuario_evento,
        rol_usuario,
        tipo_evento,
        comentario
    ) VALUES (
        v_ot_uuid,
        v_ot_row.estatus,
        'EN_ESPERA',
        v_user_name,
        v_user_role,
        'CAMBIO_ESTADO_ESPERA',
        format('Trabajo pausado (En espera). Motivo: %s. Observación: %s', p_motivo, p_observacion)
    );

    RETURN row_to_json(v_new_wait)::jsonb;
END;
$$;

-- 5. RPC: resume_ot_waiting (Cierra Espera, Calcula Duración y Pone OT en EN_PROCESO)
CREATE OR REPLACE FUNCTION public.resume_ot_waiting(
    p_ot_id TEXT,
    p_resolution_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_ot_row public.ordenes_trabajo%ROWTYPE;
    v_ot_uuid UUID;
    v_user_id UUID;
    v_user_name TEXT;
    v_user_role TEXT;
    v_active_wait public.orden_trabajo_esperas%ROWTYPE;
    v_ended_at TIMESTAMPTZ;
    v_duration_secs INT;
BEGIN
    v_user_id := auth.uid();
    v_user_role := COALESCE(auth.jwt() -> 'user_metadata' ->> 'rol', 'TECNICO');

    SELECT nombre_completo INTO v_user_name 
    FROM public.cat_usuarios_roles 
    WHERE id_usuario = v_user_id LIMIT 1;
    
    IF v_user_name IS NULL THEN
        v_user_name := COALESCE(auth.jwt() -> 'user_metadata' ->> 'nombre_completo', 'Técnico de Mantenimiento');
    END IF;

    -- Resolver OT y Bloquear Fila
    IF p_ot_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        SELECT * INTO v_ot_row FROM public.ordenes_trabajo WHERE id_orden = p_ot_id::UUID FOR UPDATE;
    ELSE
        SELECT * INTO v_ot_row FROM public.ordenes_trabajo WHERE folio = p_ot_id FOR UPDATE;
    END IF;

    IF v_ot_row.id_orden IS NULL THEN
        RAISE EXCEPTION 'OT_NOT_FOUND: La orden de trabajo no existe.';
    END IF;

    v_ot_uuid := v_ot_row.id_orden;

    -- Localizar Espera ACTIVA
    SELECT * INTO v_active_wait 
    FROM public.orden_trabajo_esperas 
    WHERE id_orden = v_ot_uuid AND status = 'ACTIVA' 
    FOR UPDATE LIMIT 1;

    IF v_active_wait.id IS NULL THEN
        RAISE EXCEPTION 'NO_ACTIVE_WAIT: No se encontró un periodo de espera activo para reanudar esta orden.';
    END IF;

    v_ended_at := NOW();
    v_duration_secs := GREATEST(1, EXTRACT(EPOCH FROM (v_ended_at - v_active_wait.started_at))::INT);

    -- Cerrar Espera
    UPDATE public.orden_trabajo_esperas
    SET ended_at = v_ended_at,
        duration_seconds = v_duration_secs,
        status = 'RESUELTA',
        resolved_by = v_user_id,
        resolution_note = p_resolution_note,
        updated_at = v_ended_at
    WHERE id = v_active_wait.id
    RETURNING * INTO v_active_wait;

    -- Actualizar Estatus de OT a EN_PROCESO
    UPDATE public.ordenes_trabajo
    SET estatus = 'EN_PROCESO'
    WHERE id_orden = v_ot_uuid;

    -- Registrar en Bitácora
    INSERT INTO public.bitacora_orden_trabajo (
        id_orden,
        estatus_anterior,
        estatus_nuevo,
        usuario_evento,
        rol_usuario,
        tipo_evento,
        comentario
    ) VALUES (
        v_ot_uuid,
        'EN_ESPERA',
        'EN_PROCESO',
        v_user_name,
        v_user_role,
        'REANUDACION_TRABAJO',
        format('Trabajo reanudado. Espera concluida tras %s segundos (%s). Resolución: %s', 
               v_duration_secs, 
               v_active_wait.motivo, 
               COALESCE(p_resolution_note, 'Reanudación normal'))
    );

    RETURN row_to_json(v_active_wait)::jsonb;
END;
$$;

-- 6. RPC: get_ot_wait_history (Consulta para Auditoría 360° y Expediente)
CREATE OR REPLACE FUNCTION public.get_ot_wait_history(p_ot_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_ot_uuid UUID;
    v_result JSONB;
BEGIN
    IF p_ot_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        v_ot_uuid := p_ot_id::UUID;
    ELSE
        SELECT id_orden INTO v_ot_uuid FROM public.ordenes_trabajo WHERE folio = p_ot_id LIMIT 1;
    END IF;

    IF v_ot_uuid IS NULL THEN
        RETURN jsonb_build_object(
            'wait_periods', '[]'::jsonb,
            'total_wait_seconds', 0,
            'total_waits_count', 0,
            'has_active_wait', false
        );
    END IF;

    SELECT jsonb_build_object(
        'wait_periods', COALESCE((
            SELECT jsonb_agg(row_to_json(w))
            FROM (
                SELECT * FROM public.orden_trabajo_esperas
                WHERE id_orden = v_ot_uuid
                ORDER BY started_at ASC
            ) w
        ), '[]'::jsonb),
        'total_wait_seconds', COALESCE((
            SELECT SUM(duration_seconds) FROM public.orden_trabajo_esperas 
            WHERE id_orden = v_ot_uuid AND status = 'RESUELTA'
        ), 0),
        'total_waits_count', (
            SELECT COUNT(*) FROM public.orden_trabajo_esperas WHERE id_orden = v_ot_uuid
        ),
        'has_active_wait', EXISTS(
            SELECT 1 FROM public.orden_trabajo_esperas WHERE id_orden = v_ot_uuid AND status = 'ACTIVA'
        )
    ) INTO v_result;

    RETURN v_result;
END;
$$;

-- 7. Políticas RLS para orden_trabajo_esperas
ALTER TABLE public.orden_trabajo_esperas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "orden_trabajo_esperas_select_policy" ON public.orden_trabajo_esperas;
CREATE POLICY "orden_trabajo_esperas_select_policy" ON public.orden_trabajo_esperas
    FOR SELECT
    USING (
        (auth.jwt() -> 'user_metadata' ->> 'rol' IN ('SUPER_ADMINISTRADOR', 'ADMINISTRADOR'))
        OR
        EXISTS (
            SELECT 1 FROM public.ordenes_trabajo ot
            WHERE ot.id_orden = public.orden_trabajo_esperas.id_orden
              AND (
                  ot.cve_atendio = (auth.jwt() -> 'user_metadata' ->> 'cve_tecnico')
                  OR ot.cve_atendio = (auth.jwt() ->> 'sub')
                  OR public.orden_trabajo_esperas.tecnico_id::text = (auth.jwt() ->> 'sub')
              )
        )
    );

DROP POLICY IF EXISTS "orden_trabajo_esperas_direct_insert_denied" ON public.orden_trabajo_esperas;
CREATE POLICY "orden_trabajo_esperas_direct_insert_denied" ON public.orden_trabajo_esperas
    FOR INSERT
    WITH CHECK (
        auth.jwt() -> 'user_metadata' ->> 'rol' IN ('SUPER_ADMINISTRADOR', 'ADMINISTRADOR')
    );

DROP POLICY IF EXISTS "orden_trabajo_esperas_direct_update_denied" ON public.orden_trabajo_esperas;
CREATE POLICY "orden_trabajo_esperas_direct_update_denied" ON public.orden_trabajo_esperas
    FOR UPDATE
    USING (
        auth.jwt() -> 'user_metadata' ->> 'rol' IN ('SUPER_ADMINISTRADOR', 'ADMINISTRADOR')
    );
