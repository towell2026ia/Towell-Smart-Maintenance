-- ============================================================================
-- TSM-AI: Módulo de Transferencias y Sesiones Técnicas de OT
-- Archivo: create_orden_trabajo_handoffs_schema.sql
-- PRD: PRD-TECH-HANDOFF-001-R1
-- ============================================================================

-- 1. Tabla de Sesiones Técnicas de OT (1:N)
CREATE TABLE IF NOT EXISTS public.orden_trabajo_sesiones_tecnico (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_orden UUID NOT NULL REFERENCES public.ordenes_trabajo(id_orden) ON DELETE RESTRICT,
    ot_folio VARCHAR(50),
    tecnico_id UUID NOT NULL REFERENCES public.cat_usuarios_roles(id_usuario) ON UPDATE CASCADE ON DELETE RESTRICT,
    nombre_tecnico VARCHAR(150),
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    active_seconds INTEGER DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'ASIGNADA',
    previous_session_id UUID REFERENCES public.orden_trabajo_sesiones_tecnico(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_session_status CHECK (
        status IN ('ASIGNADA', 'ACEPTADA', 'EN_PROCESO', 'TRANSFERIDA', 'FINALIZADA', 'CANCELADA')
    )
);

-- Regla de Unicidad: Máximo 1 sesión en trámite o activa por OT
CREATE UNIQUE INDEX IF NOT EXISTS idx_uniq_active_or_pending_session_per_ot 
    ON public.orden_trabajo_sesiones_tecnico(id_orden) 
    WHERE status IN ('ASIGNADA', 'ACEPTADA', 'EN_PROCESO');

CREATE INDEX IF NOT EXISTS idx_sesiones_tecnico_ot ON public.orden_trabajo_sesiones_tecnico(id_orden);
CREATE INDEX IF NOT EXISTS idx_sesiones_tecnico_user ON public.orden_trabajo_sesiones_tecnico(tecnico_id);
CREATE INDEX IF NOT EXISTS idx_sesiones_tecnico_status ON public.orden_trabajo_sesiones_tecnico(status);

-- 2. Tabla de Flujo de Transferencias (Handoffs)
CREATE TABLE IF NOT EXISTS public.orden_trabajo_handoffs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_orden UUID NOT NULL REFERENCES public.ordenes_trabajo(id_orden) ON DELETE RESTRICT,
    source_session_id UUID NOT NULL REFERENCES public.orden_trabajo_sesiones_tecnico(id),
    requested_by UUID NOT NULL REFERENCES public.cat_usuarios_roles(id_usuario),
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reason VARCHAR(50) NOT NULL,
    handoff_note TEXT NOT NULL,
    specialty_required VARCHAR(50) DEFAULT 'GENERAL',
    status VARCHAR(30) NOT NULL DEFAULT 'SOLICITADA',
    assigned_to UUID REFERENCES public.cat_usuarios_roles(id_usuario),
    assigned_by UUID REFERENCES public.cat_usuarios_roles(id_usuario),
    assigned_at TIMESTAMPTZ,
    accepted_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancelled_by UUID REFERENCES public.cat_usuarios_roles(id_usuario),
    cancellation_reason TEXT,
    client_request_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_handoff_reason CHECK (
        reason IN (
            'CAMBIO_TURNO',
            'CAMBIO_ESPECIALIDAD',
            'AUSENCIA',
            'CARGA_TRABAJO',
            'REASIGNACION_ADMIN',
            'OTRO'
        )
    ),
    CONSTRAINT chk_handoff_status CHECK (
        status IN ('SOLICITADA', 'ASIGNADA', 'ACEPTADA', 'CANCELADA')
    )
);

CREATE INDEX IF NOT EXISTS idx_handoffs_ot ON public.orden_trabajo_handoffs(id_orden);
CREATE INDEX IF NOT EXISTS idx_handoffs_status ON public.orden_trabajo_handoffs(status);
CREATE INDEX IF NOT EXISTS idx_handoffs_requested_by ON public.orden_trabajo_handoffs(requested_by);
CREATE INDEX IF NOT EXISTS idx_handoffs_assigned_to ON public.orden_trabajo_handoffs(assigned_to);

-- 3. Triggers para updated_at automático
CREATE OR REPLACE FUNCTION public.fn_set_updated_at_handoff_tables()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_updated_at_sesiones ON public.orden_trabajo_sesiones_tecnico;
CREATE TRIGGER trg_set_updated_at_sesiones
    BEFORE UPDATE ON public.orden_trabajo_sesiones_tecnico
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_set_updated_at_handoff_tables();

DROP TRIGGER IF EXISTS trg_set_updated_at_handoffs ON public.orden_trabajo_handoffs;
CREATE TRIGGER trg_set_updated_at_handoffs
    BEFORE UPDATE ON public.orden_trabajo_handoffs
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_set_updated_at_handoff_tables();

-- 4. RPC: request_ot_handoff (Solicitud de Transferencia por Técnico Saliente)
CREATE OR REPLACE FUNCTION public.request_ot_handoff(
    p_ot_id TEXT,
    p_reason TEXT,
    p_note TEXT,
    p_specialty TEXT DEFAULT 'GENERAL',
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
    v_new_handoff public.orden_trabajo_handoffs%ROWTYPE;
    v_ended_at TIMESTAMPTZ;
    v_active_worked_secs INT := 0;
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
        RAISE EXCEPTION 'INVALID_OT_STATUS: No se puede transferir una OT que ya se encuentra cerrada o finalizada.';
    END IF;

    IF p_reason IS NULL OR TRIM(p_reason) = '' THEN
        RAISE EXCEPTION 'HANDOFF_REASON_REQUIRED: El motivo de la transferencia es obligatorio.';
    END IF;

    IF p_note IS NULL OR TRIM(p_note) = '' THEN
        RAISE EXCEPTION 'HANDOFF_NOTE_REQUIRED: La nota de entrega técnica es obligatoria.';
    END IF;

    -- Localizar Sesión Activa del Técnico
    SELECT * INTO v_active_session 
    FROM public.orden_trabajo_sesiones_tecnico 
    WHERE id_orden = v_ot_uuid AND status IN ('ACEPTADA', 'EN_PROCESO', 'ASIGNADA')
    FOR UPDATE LIMIT 1;

    v_ended_at := NOW();

    IF v_active_session.id IS NOT NULL THEN
        IF v_active_session.started_at IS NOT NULL THEN
            v_active_worked_secs := GREATEST(1, EXTRACT(EPOCH FROM (v_ended_at - v_active_session.started_at))::INT);
        END IF;

        UPDATE public.orden_trabajo_sesiones_tecnico
        SET ended_at = v_ended_at,
            active_seconds = COALESCE(active_seconds, 0) + v_active_worked_secs,
            status = 'TRANSFERIDA',
            updated_at = v_ended_at
        WHERE id = v_active_session.id
        RETURNING * INTO v_active_session;
    ELSE
        -- Si no existía registro previo formal de sesión, crear el snapshot transferido
        INSERT INTO public.orden_trabajo_sesiones_tecnico (
            id_orden, ot_folio, tecnico_id, nombre_tecnico, assigned_at, accepted_at, started_at, ended_at, active_seconds, status
        ) VALUES (
            v_ot_uuid, v_ot_row.folio, v_user_id, v_user_name, v_ot_row.fecha_hora_inicio, v_ot_row.fecha_hora_inicio, v_ot_row.fecha_hora_inicio, v_ended_at, 0, 'TRANSFERIDA'
        ) RETURNING * INTO v_active_session;
    END IF;

    -- Crear Solicitud de Handoff
    INSERT INTO public.orden_trabajo_handoffs (
        id_orden,
        source_session_id,
        requested_by,
        requested_at,
        reason,
        handoff_note,
        specialty_required,
        status,
        client_request_id
    ) VALUES (
        v_ot_uuid,
        v_active_session.id,
        v_user_id,
        v_ended_at,
        p_reason,
        TRIM(p_note),
        COALESCE(p_specialty, 'GENERAL'),
        'SOLICITADA',
        p_client_request_id
    ) RETURNING * INTO v_new_handoff;

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
        v_ot_row.estatus,
        v_ot_row.estatus,
        v_user_name,
        v_user_role,
        'HANDOFF_REQUESTED',
        format('Transferencia solicitada por %s. Motivo: %s. Nota de entrega: %s', v_user_name, p_reason, p_note)
    );

    RETURN row_to_json(v_new_handoff)::jsonb;
END;
$$;

-- 5. RPC: assign_ot_handoff (Super Admin asigna Técnico B)
CREATE OR REPLACE FUNCTION public.assign_ot_handoff(
    p_handoff_id UUID,
    p_new_tech_id UUID,
    p_admin_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_admin_id UUID;
    v_admin_name TEXT;
    v_admin_role TEXT;
    v_handoff public.orden_trabajo_handoffs%ROWTYPE;
    v_ot_row public.ordenes_trabajo%ROWTYPE;
    v_new_tech_name TEXT;
    v_new_session public.orden_trabajo_sesiones_tecnico%ROWTYPE;
    v_now TIMESTAMPTZ := NOW();
BEGIN
    v_admin_id := auth.uid();
    v_admin_role := COALESCE(auth.jwt() -> 'user_metadata' ->> 'rol', 'ADMINISTRADOR');

    SELECT nombre_completo INTO v_admin_name 
    FROM public.cat_usuarios_roles 
    WHERE id_usuario = v_admin_id LIMIT 1;

    SELECT * INTO v_handoff 
    FROM public.orden_trabajo_handoffs 
    WHERE id = p_handoff_id FOR UPDATE;

    IF v_handoff.id IS NULL THEN
        RAISE EXCEPTION 'HANDOFF_NOT_FOUND: La solicitud de transferencia no existe.';
    END IF;

    IF v_handoff.status != 'SOLICITADA' THEN
        RAISE EXCEPTION 'INVALID_HANDOFF_STATUS: La solicitud ya fue atendida o cancelada.';
    END IF;

    SELECT nombre_completo INTO v_new_tech_name 
    FROM public.cat_usuarios_roles 
    WHERE id_usuario = p_new_tech_id LIMIT 1;

    IF v_new_tech_name IS NULL THEN
        RAISE EXCEPTION 'TECH_NOT_FOUND: El técnico seleccionado no existe en el catálogo.';
    END IF;

    SELECT * INTO v_ot_row 
    FROM public.ordenes_trabajo 
    WHERE id_orden = v_handoff.id_orden FOR UPDATE;

    -- Crear Nueva Sesión ASIGNADA
    INSERT INTO public.orden_trabajo_sesiones_tecnico (
        id_orden,
        ot_folio,
        tecnico_id,
        nombre_tecnico,
        assigned_at,
        status,
        previous_session_id
    ) VALUES (
        v_handoff.id_orden,
        v_ot_row.folio,
        p_new_tech_id,
        v_new_tech_name,
        v_now,
        'ASIGNADA',
        v_handoff.source_session_id
    ) RETURNING * INTO v_new_session;

    -- Actualizar Handoff
    UPDATE public.orden_trabajo_handoffs
    SET status = 'ASIGNADA',
        assigned_to = p_new_tech_id,
        assigned_by = v_admin_id,
        assigned_at = v_now,
        updated_at = v_now
    WHERE id = v_handoff.id
    RETURNING * INTO v_handoff;

    -- Actualizar Asignaciones de Mantenimiento conservando histórico
    UPDATE public.asignaciones_mantenimiento
    SET estatus_asignacion = 'TRANSFERIDA',
        activo = FALSE,
        fecha_fin = v_now
    WHERE id_orden = v_handoff.id_orden AND activo = TRUE;

    INSERT INTO public.asignaciones_mantenimiento (
        id_orden,
        cve_tecnico,
        asignado_por,
        fecha_asignacion,
        estatus_asignacion,
        activo,
        observaciones
    ) VALUES (
        v_handoff.id_orden,
        p_new_tech_id::text,
        v_admin_name,
        v_now,
        'ASIGNADA',
        TRUE,
        COALESCE(p_admin_notes, format('Reasignado tras handoff por %s', v_handoff.reason))
    );

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
        v_handoff.id_orden,
        v_ot_row.estatus,
        v_ot_row.estatus,
        v_admin_name,
        v_admin_role,
        'HANDOFF_ASSIGNED',
        format('OT reasignada a %s por %s. Nota: %s', v_new_tech_name, v_admin_name, COALESCE(p_admin_notes, 'Sin notas adicionales.'))
    );

    RETURN row_to_json(v_handoff)::jsonb;
END;
$$;

-- 6. RPC: accept_ot_handoff (Técnico B acepta responsabilidad)
CREATE OR REPLACE FUNCTION public.accept_ot_handoff(p_handoff_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_user_name TEXT;
    v_user_role TEXT;
    v_handoff public.orden_trabajo_handoffs%ROWTYPE;
    v_session public.orden_trabajo_sesiones_tecnico%ROWTYPE;
    v_ot_row public.ordenes_trabajo%ROWTYPE;
    v_now TIMESTAMPTZ := NOW();
BEGIN
    v_user_id := auth.uid();
    v_user_role := COALESCE(auth.jwt() -> 'user_metadata' ->> 'rol', 'TECNICO');

    SELECT nombre_completo INTO v_user_name 
    FROM public.cat_usuarios_roles 
    WHERE id_usuario = v_user_id LIMIT 1;

    SELECT * INTO v_handoff 
    FROM public.orden_trabajo_handoffs 
    WHERE id = p_handoff_id FOR UPDATE;

    IF v_handoff.id IS NULL THEN
        RAISE EXCEPTION 'HANDOFF_NOT_FOUND: La solicitud de transferencia no existe.';
    END IF;

    IF v_handoff.assigned_to != v_user_id AND v_user_role NOT IN ('SUPER_ADMINISTRADOR', 'ADMINISTRADOR') THEN
        RAISE EXCEPTION 'UNAUTHORIZED_TECH: Solo el técnico asignado puede aceptar esta transferencia.';
    END IF;

    IF v_handoff.status != 'ASIGNADA' THEN
        RAISE EXCEPTION 'INVALID_HANDOFF_STATUS: La transferencia no está en estado ASIGNADA.';
    END IF;

    -- Actualizar Sesión a ACEPTADA (El cronómetro individual NO inicia hasta startWorkOnOT)
    UPDATE public.orden_trabajo_sesiones_tecnico
    SET status = 'ACEPTADA',
        accepted_at = v_now,
        updated_at = v_now
    WHERE id_orden = v_handoff.id_orden AND tecnico_id = v_handoff.assigned_to AND status = 'ASIGNADA'
    RETURNING * INTO v_session;

    -- Actualizar Handoff
    UPDATE public.orden_trabajo_handoffs
    SET status = 'ACEPTADA',
        accepted_at = v_now,
        updated_at = v_now
    WHERE id = v_handoff.id
    RETURNING * INTO v_handoff;

    -- Actualizar cve_atendio y nombre_atendio en ordenes_trabajo
    UPDATE public.ordenes_trabajo
    SET cve_atendio = v_user_id::text,
        nombre_atendio = v_user_name
    WHERE id_orden = v_handoff.id_orden
    RETURNING * INTO v_ot_row;

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
        v_handoff.id_orden,
        v_ot_row.estatus,
        v_ot_row.estatus,
        v_user_name,
        v_user_role,
        'HANDOFF_ACCEPTED',
        format('Transferencia aceptada por el técnico %s. Responsabilidad transferida formalmente.', v_user_name)
    );

    RETURN jsonb_build_object(
        'handoff', row_to_json(v_handoff),
        'session', row_to_json(v_session)
    );
END;
$$;

-- 7. RPC: cancel_ot_handoff (Super Admin cancela transferencia sin reescribir historia)
CREATE OR REPLACE FUNCTION public.cancel_ot_handoff(
    p_handoff_id UUID,
    p_cancellation_reason TEXT DEFAULT 'Cancelación administrativa'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_admin_id UUID;
    v_admin_name TEXT;
    v_admin_role TEXT;
    v_handoff public.orden_trabajo_handoffs%ROWTYPE;
    v_now TIMESTAMPTZ := NOW();
BEGIN
    v_admin_id := auth.uid();
    v_admin_role := COALESCE(auth.jwt() -> 'user_metadata' ->> 'rol', 'ADMINISTRADOR');

    SELECT nombre_completo INTO v_admin_name 
    FROM public.cat_usuarios_roles 
    WHERE id_usuario = v_admin_id LIMIT 1;

    SELECT * INTO v_handoff 
    FROM public.orden_trabajo_handoffs 
    WHERE id = p_handoff_id FOR UPDATE;

    IF v_handoff.id IS NULL THEN
        RAISE EXCEPTION 'HANDOFF_NOT_FOUND: La solicitud de transferencia no existe.';
    END IF;

    IF v_handoff.status = 'ACEPTADA' THEN
        RAISE EXCEPTION 'HANDOFF_ALREADY_ACCEPTED: No se puede cancelar una transferencia que ya fue aceptada. Debe solicitarse un nuevo handoff.';
    END IF;

    UPDATE public.orden_trabajo_handoffs
    SET status = 'CANCELADA',
        cancelled_at = v_now,
        cancelled_by = v_admin_id,
        cancellation_reason = p_cancellation_reason,
        updated_at = v_now
    WHERE id = v_handoff.id
    RETURNING * INTO v_handoff;

    -- Cancelar sesión pendiente si ya había sido asignada
    UPDATE public.orden_trabajo_sesiones_tecnico
    SET status = 'CANCELADA',
        updated_at = v_now
    WHERE id_orden = v_handoff.id_orden AND status = 'ASIGNADA';

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
        v_handoff.id_orden,
        'EN_ESPERA',
        'EN_ESPERA',
        v_admin_name,
        v_admin_role,
        'HANDOFF_CANCELLED',
        format('Transferencia cancelada por %s. Motivo: %s', v_admin_name, p_cancellation_reason)
    );

    RETURN row_to_json(v_handoff)::jsonb;
END;
$$;

-- 8. RPC: get_ot_technician_sessions (Consulta para Auditoría 360°)
CREATE OR REPLACE FUNCTION public.get_ot_technician_sessions(p_ot_id TEXT)
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
            'sessions', '[]'::jsonb,
            'handoffs', '[]'::jsonb,
            'total_active_work_seconds', 0,
            'technicians_count', 0
        );
    END IF;

    SELECT jsonb_build_object(
        'sessions', COALESCE((
            SELECT jsonb_agg(row_to_json(s))
            FROM (
                SELECT * FROM public.orden_trabajo_sesiones_tecnico
                WHERE id_orden = v_ot_uuid
                ORDER BY assigned_at ASC
            ) s
        ), '[]'::jsonb),
        'handoffs', COALESCE((
            SELECT jsonb_agg(row_to_json(h))
            FROM (
                SELECT * FROM public.orden_trabajo_handoffs
                WHERE id_orden = v_ot_uuid
                ORDER BY requested_at ASC
            ) h
        ), '[]'::jsonb),
        'total_active_work_seconds', COALESCE((
            SELECT SUM(active_seconds) FROM public.orden_trabajo_sesiones_tecnico
            WHERE id_orden = v_ot_uuid
        ), 0),
        'technicians_count', (
            SELECT COUNT(DISTINCT tecnico_id) FROM public.orden_trabajo_sesiones_tecnico
            WHERE id_orden = v_ot_uuid
        )
    ) INTO v_result;

    RETURN v_result;
END;
$$;

-- 9. Políticas RLS
ALTER TABLE public.orden_trabajo_sesiones_tecnico ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orden_trabajo_handoffs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sesiones_select_policy" ON public.orden_trabajo_sesiones_tecnico;
CREATE POLICY "sesiones_select_policy" ON public.orden_trabajo_sesiones_tecnico
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "sesiones_insert_denied" ON public.orden_trabajo_sesiones_tecnico;
CREATE POLICY "sesiones_insert_denied" ON public.orden_trabajo_sesiones_tecnico
    FOR INSERT WITH CHECK (
        auth.jwt() -> 'user_metadata' ->> 'rol' IN ('SUPER_ADMINISTRADOR', 'ADMINISTRADOR')
    );

DROP POLICY IF EXISTS "sesiones_update_denied" ON public.orden_trabajo_sesiones_tecnico;
CREATE POLICY "sesiones_update_denied" ON public.orden_trabajo_sesiones_tecnico
    FOR UPDATE USING (
        auth.jwt() -> 'user_metadata' ->> 'rol' IN ('SUPER_ADMINISTRADOR', 'ADMINISTRADOR')
    );

DROP POLICY IF EXISTS "handoffs_select_policy" ON public.orden_trabajo_handoffs;
CREATE POLICY "handoffs_select_policy" ON public.orden_trabajo_handoffs
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "handoffs_insert_denied" ON public.orden_trabajo_handoffs;
CREATE POLICY "handoffs_insert_denied" ON public.orden_trabajo_handoffs
    FOR INSERT WITH CHECK (
        auth.jwt() -> 'user_metadata' ->> 'rol' IN ('SUPER_ADMINISTRADOR', 'ADMINISTRADOR')
    );

DROP POLICY IF EXISTS "handoffs_update_denied" ON public.orden_trabajo_handoffs;
CREATE POLICY "handoffs_update_denied" ON public.orden_trabajo_handoffs
    FOR UPDATE USING (
        auth.jwt() -> 'user_metadata' ->> 'rol' IN ('SUPER_ADMINISTRADOR', 'ADMINISTRADOR')
    );
