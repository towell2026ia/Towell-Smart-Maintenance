-- ============================================================================
-- TSM-AI: Módulo de Validación de Entrega y Cierre por el Solicitante (1:N)
-- Archivo: create_ot_validaciones_cierre_schema.sql
-- PRD: PRD-REQ-CLOSE-001-R1
-- ============================================================================

-- 1. Tabla de Intentos de Validación de Cierre (1:N)
CREATE TABLE IF NOT EXISTS public.ot_validaciones_cierre (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_orden UUID NOT NULL REFERENCES public.ordenes_trabajo(id_orden) ON DELETE RESTRICT,
    ot_folio VARCHAR(50),
    attempt_number INTEGER NOT NULL DEFAULT 1,
    technical_session_id UUID REFERENCES public.orden_trabajo_sesiones_tecnico(id),
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    requested_by UUID REFERENCES public.cat_usuarios_roles(id_usuario),
    authorized_requester_id UUID REFERENCES public.cat_usuarios_roles(id_usuario),
    decision VARCHAR(30) NOT NULL DEFAULT 'PENDIENTE',
    decision_at TIMESTAMPTZ,
    comentario TEXT,
    motivo_rechazo VARCHAR(50),
    detalle_rechazo TEXT,
    validation_seconds INTEGER DEFAULT 0,
    decision_actor_id UUID REFERENCES public.cat_usuarios_roles(id_usuario),
    decision_actor_type VARCHAR(50) DEFAULT 'REQUESTER',
    closure_mode VARCHAR(50),
    override_reason TEXT,
    first_time_fix_failed BOOLEAN DEFAULT FALSE,
    client_request_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_val_decision CHECK (
        decision IN ('PENDIENTE', 'ACEPTADA', 'RECHAZADA', 'CANCELADA')
    ),
    CONSTRAINT chk_val_motivo_rechazo CHECK (
        motivo_rechazo IS NULL OR motivo_rechazo IN (
            'FALLA_PERSISTE',
            'FALLA_REAPARECIO',
            'TRABAJO_INCOMPLETO',
            'EQUIPO_NO_OPERATIVO',
            'OTRO'
        )
    ),
    CONSTRAINT chk_val_closure_mode CHECK (
        closure_mode IS NULL OR closure_mode IN ('REQUESTER_ACCEPTANCE', 'ADMIN_OVERRIDE')
    )
);

-- Regla de Unicidad: Máximo 1 validación PENDIENTE por OT
CREATE UNIQUE INDEX IF NOT EXISTS idx_uniq_pending_validation_per_ot 
    ON public.ot_validaciones_cierre(id_orden) 
    WHERE decision = 'PENDIENTE';

CREATE INDEX IF NOT EXISTS idx_val_cierre_ot ON public.ot_validaciones_cierre(id_orden);
CREATE INDEX IF NOT EXISTS idx_val_cierre_decision ON public.ot_validaciones_cierre(decision);
CREATE INDEX IF NOT EXISTS idx_val_cierre_requester ON public.ot_validaciones_cierre(authorized_requester_id);

-- 2. Trigger para updated_at automático
CREATE OR REPLACE FUNCTION public.fn_set_updated_at_ot_validaciones_cierre()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_updated_at_ot_validaciones_cierre ON public.ot_validaciones_cierre;
CREATE TRIGGER trg_set_updated_at_ot_validaciones_cierre
    BEFORE UPDATE ON public.ot_validaciones_cierre
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_set_updated_at_ot_validaciones_cierre();

-- 3. RPC: submit_ot_for_requester_validation (Técnico finaliza intervención)
CREATE OR REPLACE FUNCTION public.submit_ot_for_requester_validation(
    p_ot_id TEXT,
    p_activity_notes TEXT DEFAULT NULL,
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
    v_active_session public.orden_trabajo_sesiones_tecnico%ROWTYPE;
    v_active_wait_id UUID;
    v_pending_handoff_id UUID;
    v_new_attempt_num INT;
    v_val_row public.ot_validaciones_cierre%ROWTYPE;
    v_now TIMESTAMPTZ := NOW();
    v_worked_secs INT := 0;
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

    IF v_ot_row.estatus IN ('Cerrada', 'Cancelada', 'Validada', 'EJECUTADA', 'CERRADA', 'VALIDADA') THEN
        RAISE EXCEPTION 'INVALID_OT_STATUS: La orden de trabajo ya se encuentra cerrada o finalizada.';
    END IF;

    -- Validar que no haya espera activa
    SELECT id INTO v_active_wait_id 
    FROM public.orden_trabajo_esperas 
    WHERE id_orden = v_ot_uuid AND status = 'ACTIVA' LIMIT 1;

    IF v_active_wait_id IS NOT NULL THEN
        RAISE EXCEPTION 'ACTIVE_WAIT_EXISTS: No se puede finalizar una OT con un periodo de espera activo. Debe reanudarse previamente.';
    END IF;

    -- Validar que no haya transferencia pendiente
    SELECT id INTO v_pending_handoff_id 
    FROM public.orden_trabajo_handoffs 
    WHERE id_orden = v_ot_uuid AND status IN ('SOLICITADA', 'ASIGNADA') LIMIT 1;

    IF v_pending_handoff_id IS NOT NULL THEN
        RAISE EXCEPTION 'PENDING_HANDOFF_EXISTS: Existe una solicitud de transferencia en trámite para esta OT.';
    END IF;

    -- Finalizar sesión técnica actual
    SELECT * INTO v_active_session 
    FROM public.orden_trabajo_sesiones_tecnico 
    WHERE id_orden = v_ot_uuid AND status IN ('ACEPTADA', 'EN_PROCESO') 
    FOR UPDATE LIMIT 1;

    IF v_active_session.id IS NOT NULL THEN
        IF v_active_session.started_at IS NOT NULL THEN
            v_worked_secs := GREATEST(1, EXTRACT(EPOCH FROM (v_now - v_active_session.started_at))::INT);
        END IF;

        UPDATE public.orden_trabajo_sesiones_tecnico
        SET ended_at = v_now,
            active_seconds = COALESCE(active_seconds, 0) + v_worked_secs,
            status = 'FINALIZADA',
            updated_at = v_now
        WHERE id = v_active_session.id;
    END IF;

    -- Calcular attempt_number
    SELECT COALESCE(MAX(attempt_number), 0) + 1 INTO v_new_attempt_num 
    FROM public.ot_validaciones_cierre 
    WHERE id_orden = v_ot_uuid;

    -- Crear nuevo intento de validación 1:N
    INSERT INTO public.ot_validaciones_cierre (
        id_orden,
        ot_folio,
        attempt_number,
        technical_session_id,
        requested_at,
        requested_by,
        authorized_requester_id,
        decision,
        client_request_id
    ) VALUES (
        v_ot_uuid,
        v_ot_row.folio,
        v_new_attempt_num,
        v_active_session.id,
        v_now,
        v_user_id,
        v_ot_row.cve_solicitante::UUID,
        'PENDIENTE',
        p_client_request_id
    ) RETURNING * INTO v_val_row;

    -- Actualizar estatus de OT
    UPDATE public.ordenes_trabajo
    SET estatus = 'PENDIENTE_VALIDACION'
    WHERE id_orden = v_ot_uuid;

    -- Bitácora
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
        'PENDIENTE_VALIDACION',
        v_user_name,
        v_user_role,
        'OT_VALIDATION_REQUESTED',
        format('Intervención técnica finalizada (Intento #%s). Enviada a validación del solicitante. Notas: %s', v_new_attempt_num, COALESCE(p_activity_notes, 'Trabajo completado'))
    );

    RETURN row_to_json(v_val_row)::jsonb;
END;
$$;

-- 4. RPC: accept_ot_resolution (Solicitante confirma solución y cierra formalmente la OT)
CREATE OR REPLACE FUNCTION public.accept_ot_resolution(
    p_ot_id TEXT,
    p_comments TEXT DEFAULT NULL,
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
    v_val_row public.ot_validaciones_cierre%ROWTYPE;
    v_now TIMESTAMPTZ := NOW();
    v_val_secs INT;
BEGIN
    v_user_id := auth.uid();
    v_user_role := COALESCE(auth.jwt() -> 'user_metadata' ->> 'rol', 'SOLICITANTE');

    SELECT nombre_completo INTO v_user_name 
    FROM public.cat_usuarios_roles 
    WHERE id_usuario = v_user_id LIMIT 1;

    IF v_user_name IS NULL THEN
        v_user_name := COALESCE(auth.jwt() -> 'user_metadata' ->> 'nombre_completo', 'Solicitante de Planta');
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

    IF v_ot_row.estatus IN ('Cerrada', 'CERRADA') THEN
        RAISE EXCEPTION 'ALREADY_CLOSED: La orden de trabajo ya se encuentra cerrada.';
    END IF;

    -- Localizar intento PENDIENTE
    SELECT * INTO v_val_row 
    FROM public.ot_validaciones_cierre 
    WHERE id_orden = v_ot_uuid AND decision = 'PENDIENTE' 
    FOR UPDATE LIMIT 1;

    IF v_val_row.id IS NULL THEN
        RAISE EXCEPTION 'NO_PENDING_VALIDATION: No se encontró una solicitud de validación pendiente para esta orden.';
    END IF;

    v_val_secs := GREATEST(1, EXTRACT(EPOCH FROM (v_now - v_val_row.requested_at))::INT);

    -- Actualizar intento a ACEPTADA
    UPDATE public.ot_validaciones_cierre
    SET decision = 'ACEPTADA',
        decision_at = v_now,
        comentario = p_comments,
        validation_seconds = v_val_secs,
        decision_actor_id = v_user_id,
        decision_actor_type = 'REQUESTER',
        closure_mode = 'REQUESTER_ACCEPTANCE',
        updated_at = v_now
    WHERE id = v_val_row.id
    RETURNING * INTO v_val_row;

    -- Actualizar estatus de OT a CERRADA
    UPDATE public.ordenes_trabajo
    SET estatus = 'CERRADA',
        fecha_hora_fin = v_now,
        observacion_cierre = COALESCE(p_comments, 'Entrega validada y aceptada por el solicitante')
    WHERE id_orden = v_ot_uuid;

    -- Bitácora
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
        'PENDIENTE_VALIDACION',
        'CERRADA',
        v_user_name,
        v_user_role,
        'OT_VALIDATION_ACCEPTED',
        format('Entrega confirmada y aceptada por el solicitante %s. Orden cerrada formalmente.', v_user_name)
    );

    RETURN row_to_json(v_val_row)::jsonb;
END;
$$;

-- 5. RPC: reject_ot_resolution (Solicitante reporta que el problema persiste)
CREATE OR REPLACE FUNCTION public.reject_ot_resolution(
    p_ot_id TEXT,
    p_rejection_reason TEXT,
    p_rejection_detail TEXT,
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
    v_val_row public.ot_validaciones_cierre%ROWTYPE;
    v_now TIMESTAMPTZ := NOW();
    v_val_secs INT;
BEGIN
    v_user_id := auth.uid();
    v_user_role := COALESCE(auth.jwt() -> 'user_metadata' ->> 'rol', 'SOLICITANTE');

    SELECT nombre_completo INTO v_user_name 
    FROM public.cat_usuarios_roles 
    WHERE id_usuario = v_user_id LIMIT 1;

    IF v_user_name IS NULL THEN
        v_user_name := COALESCE(auth.jwt() -> 'user_metadata' ->> 'nombre_completo', 'Solicitante de Planta');
    END IF;

    IF p_rejection_reason IS NULL OR TRIM(p_rejection_reason) = '' THEN
        RAISE EXCEPTION 'REJECTION_REASON_REQUIRED: El motivo del rechazo es obligatorio.';
    END IF;

    IF p_rejection_detail IS NULL OR TRIM(p_rejection_detail) = '' THEN
        RAISE EXCEPTION 'REJECTION_DETAIL_REQUIRED: El detalle explicativo de por qué persiste la falla es obligatorio.';
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

    -- Localizar intento PENDIENTE
    SELECT * INTO v_val_row 
    FROM public.ot_validaciones_cierre 
    WHERE id_orden = v_ot_uuid AND decision = 'PENDIENTE' 
    FOR UPDATE LIMIT 1;

    IF v_val_row.id IS NULL THEN
        RAISE EXCEPTION 'NO_PENDING_VALIDATION: No se encontró una solicitud de validación pendiente para esta orden.';
    END IF;

    v_val_secs := GREATEST(1, EXTRACT(EPOCH FROM (v_now - v_val_row.requested_at))::INT);

    -- Actualizar intento a RECHAZADA (conservando histórico inmutable)
    UPDATE public.ot_validaciones_cierre
    SET decision = 'RECHAZADA',
        decision_at = v_now,
        motivo_rechazo = p_rejection_reason,
        detalle_rechazo = TRIM(p_rejection_detail),
        validation_seconds = v_val_secs,
        decision_actor_id = v_user_id,
        decision_actor_type = 'REQUESTER',
        first_time_fix_failed = (v_val_row.attempt_number = 1),
        updated_at = v_now
    WHERE id = v_val_row.id
    RETURNING * INTO v_val_row;

    -- Actualizar estatus de OT a REQUIERE_REVISION
    UPDATE public.ordenes_trabajo
    SET estatus = 'REQUIERE_REVISION'
    WHERE id_orden = v_ot_uuid;

    -- Bitácora
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
        'PENDIENTE_VALIDACION',
        'REQUIERE_REVISION',
        v_user_name,
        v_user_role,
        'OT_VALIDATION_REJECTED',
        format('Entrega rechazada por el solicitante %s (Intento #%s). Motivo: %s. Detalle: %s', v_user_name, v_val_row.attempt_number, p_rejection_reason, p_rejection_detail)
    );

    RETURN row_to_json(v_val_row)::jsonb;
END;
$$;

-- 6. RPC: admin_override_ot_closure (Super Admin cierra administrativamente con motivo justificado)
CREATE OR REPLACE FUNCTION public.admin_override_ot_closure(
    p_ot_id TEXT,
    p_override_reason TEXT,
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
    v_admin_id UUID;
    v_admin_name TEXT;
    v_admin_role TEXT;
    v_val_row public.ot_validaciones_cierre%ROWTYPE;
    v_now TIMESTAMPTZ := NOW();
    v_val_secs INT := 0;
BEGIN
    v_admin_id := auth.uid();
    v_admin_role := COALESCE(auth.jwt() -> 'user_metadata' ->> 'rol', 'ADMINISTRADOR');

    IF v_admin_role NOT IN ('SUPER_ADMINISTRADOR', 'ADMINISTRADOR') THEN
        RAISE EXCEPTION 'UNAUTHORIZED_ADMIN: Solo un administrador puede ejecutar un cierre administrativo override.';
    END IF;

    IF p_override_reason IS NULL OR TRIM(p_override_reason) = '' THEN
        RAISE EXCEPTION 'OVERRIDE_REASON_REQUIRED: El motivo del cierre administrativo es obligatorio.';
    END IF;

    SELECT nombre_completo INTO v_admin_name 
    FROM public.cat_usuarios_roles 
    WHERE id_usuario = v_admin_id LIMIT 1;

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

    -- Localizar o crear intento
    SELECT * INTO v_val_row 
    FROM public.ot_validaciones_cierre 
    WHERE id_orden = v_ot_uuid AND decision = 'PENDIENTE' 
    FOR UPDATE LIMIT 1;

    IF v_val_row.id IS NOT NULL THEN
        v_val_secs := GREATEST(1, EXTRACT(EPOCH FROM (v_now - v_val_row.requested_at))::INT);
        UPDATE public.ot_validaciones_cierre
        SET decision = 'ACEPTADA',
            decision_at = v_now,
            validation_seconds = v_val_secs,
            decision_actor_id = v_admin_id,
            decision_actor_type = 'ADMIN_OVERRIDE',
            closure_mode = 'ADMIN_OVERRIDE',
            override_reason = TRIM(p_override_reason),
            updated_at = v_now
        WHERE id = v_val_row.id
        RETURNING * INTO v_val_row;
    ELSE
        INSERT INTO public.ot_validaciones_cierre (
            id_orden, ot_folio, attempt_number, requested_at, decision, decision_at,
            decision_actor_id, decision_actor_type, closure_mode, override_reason, client_request_id
        ) VALUES (
            v_ot_uuid, v_ot_row.folio, 1, v_now, 'ACEPTADA', v_now,
            v_admin_id, 'ADMIN_OVERRIDE', 'ADMIN_OVERRIDE', TRIM(p_override_reason), p_client_request_id
        ) RETURNING * INTO v_val_row;
    END IF;

    UPDATE public.ordenes_trabajo
    SET estatus = 'CERRADA',
        fecha_hora_fin = v_now,
        observacion_cierre = format('Cierre administrativo por %s: %s', v_admin_name, p_override_reason)
    WHERE id_orden = v_ot_uuid;

    -- Bitácora
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
        'CERRADA',
        v_admin_name,
        v_admin_role,
        'OT_ADMIN_OVERRIDE_CLOSED',
        format('Cierre administrativo override efectuado por %s. Motivo: %s', v_admin_name, p_override_reason)
    );

    RETURN row_to_json(v_val_row)::jsonb;
END;
$$;

-- 7. RPC: get_ot_validation_history (Consulta para Auditoría 360°)
CREATE OR REPLACE FUNCTION public.get_ot_validation_history(p_ot_id TEXT)
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
            'attempts', '[]'::jsonb,
            'total_attempts_count', 0,
            'has_pending_validation', false,
            'is_closed', false
        );
    END IF;

    SELECT jsonb_build_object(
        'attempts', COALESCE((
            SELECT jsonb_agg(row_to_json(v))
            FROM (
                SELECT * FROM public.ot_validaciones_cierre
                WHERE id_orden = v_ot_uuid
                ORDER BY attempt_number ASC
            ) v
        ), '[]'::jsonb),
        'total_attempts_count', (
            SELECT COUNT(*) FROM public.ot_validaciones_cierre WHERE id_orden = v_ot_uuid
        ),
        'has_pending_validation', EXISTS(
            SELECT 1 FROM public.ot_validaciones_cierre WHERE id_orden = v_ot_uuid AND decision = 'PENDIENTE'
        ),
        'is_closed', EXISTS(
            SELECT 1 FROM public.ordenes_trabajo WHERE id_orden = v_ot_uuid AND estatus IN ('CERRADA', 'Cerrada')
        )
    ) INTO v_result;

    RETURN v_result;
END;
$$;

-- 8. Políticas RLS
ALTER TABLE public.ot_validaciones_cierre ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "validaciones_cierre_select_policy" ON public.ot_validaciones_cierre;
CREATE POLICY "validaciones_cierre_select_policy" ON public.ot_validaciones_cierre
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "validaciones_cierre_insert_denied" ON public.ot_validaciones_cierre;
CREATE POLICY "validaciones_cierre_insert_denied" ON public.ot_validaciones_cierre
    FOR INSERT WITH CHECK (
        auth.jwt() -> 'user_metadata' ->> 'rol' IN ('SUPER_ADMINISTRADOR', 'ADMINISTRADOR')
    );

DROP POLICY IF EXISTS "validaciones_cierre_update_denied" ON public.ot_validaciones_cierre;
CREATE POLICY "validaciones_cierre_update_denied" ON public.ot_validaciones_cierre
    FOR UPDATE USING (
        auth.jwt() -> 'user_metadata' ->> 'rol' IN ('SUPER_ADMINISTRADOR', 'ADMINISTRADOR')
    );
