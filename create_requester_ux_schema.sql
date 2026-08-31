-- ============================================================================
-- TSM-AI: Módulo de Solicitudes UX, Técnico Preferido y Filtro de Máquinas
-- Archivo: create_requester_ux_schema.sql
-- PRD: PRD-REQ-UX-001-R1
-- ============================================================================

-- 1. Extensión de solicitudes_mantenimiento
ALTER TABLE public.solicitudes_mantenimiento
    ADD COLUMN IF NOT EXISTS requested_technician_id UUID REFERENCES public.cat_usuarios_roles(id_usuario),
    ADD COLUMN IF NOT EXISTS nombre_solicitante_reporta VARCHAR(150);

-- 2. Extensión de ordenes_trabajo para snapshot histórico inmutable de preferencia
ALTER TABLE public.ordenes_trabajo
    ADD COLUMN IF NOT EXISTS requested_technician_id UUID REFERENCES public.cat_usuarios_roles(id_usuario),
    ADD COLUMN IF NOT EXISTS nombre_solicitante_reporta VARCHAR(150);

CREATE INDEX IF NOT EXISTS idx_solic_req_tech ON public.solicitudes_mantenimiento(requested_technician_id);
CREATE INDEX IF NOT EXISTS idx_ot_req_tech ON public.ordenes_trabajo(requested_technician_id);

-- 3. Función de validación de asignación administrativa
CREATE OR REPLACE FUNCTION public.assign_maintenance_request_with_preference(
    p_folio TEXT,
    p_assigned_tech_id UUID,
    p_admin_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_ot_row public.ordenes_trabajo%ROWTYPE;
    v_assigned_tech_name TEXT;
    v_requested_tech_name TEXT;
    v_admin_id UUID;
    v_admin_name TEXT;
    v_admin_role TEXT;
    v_active_session_count INT;
BEGIN
    v_admin_id := auth.uid();
    v_admin_role := COALESCE(auth.jwt() -> 'user_metadata' ->> 'rol', 'ADMINISTRADOR');

    IF v_admin_role NOT IN ('SUPER_ADMINISTRADOR', 'ADMINISTRADOR') THEN
        RAISE EXCEPTION 'UNAUTHORIZED_ADMIN: Solo un administrador puede asignar solicitudes.';
    END IF;

    SELECT nombre_completo INTO v_admin_name 
    FROM public.cat_usuarios_roles 
    WHERE id_usuario = v_admin_id LIMIT 1;

    SELECT nombre_completo INTO v_assigned_tech_name 
    FROM public.cat_usuarios_roles 
    WHERE id_usuario = p_assigned_tech_id AND rol IN ('MANTENIMIENTO', 'TECNICO') AND activo = TRUE LIMIT 1;

    IF v_assigned_tech_name IS NULL THEN
        RAISE EXCEPTION 'INVALID_TECHNICIAN: El técnico seleccionado no existe o no se encuentra activo.';
    END IF;

    SELECT * INTO v_ot_row FROM public.ordenes_trabajo WHERE folio = p_folio FOR UPDATE;
    IF v_ot_row.id_orden IS NULL THEN
        RAISE EXCEPTION 'OT_NOT_FOUND: La orden o solicitud no existe.';
    END IF;

    -- Validar si ya tiene sesión activa (en cuyo caso requiere HANDOFF)
    SELECT COUNT(*) INTO v_active_session_count 
    FROM public.orden_trabajo_sesiones_tecnico 
    WHERE id_orden = v_ot_row.id_orden AND status IN ('ACEPTADA', 'EN_PROCESO');

    IF v_active_session_count > 0 THEN
        RAISE EXCEPTION 'ACTIVE_SESSION_EXISTS: La orden ya tiene una sesión técnica en curso. Para cambiar técnico utilice la función de transferencia/handoff.';
    END IF;

    IF v_ot_row.requested_technician_id IS NOT NULL THEN
        SELECT nombre_completo INTO v_requested_tech_name 
        FROM public.cat_usuarios_roles 
        WHERE id_usuario = v_ot_row.requested_technician_id LIMIT 1;
    END IF;

    -- Actualizar orden de trabajo
    UPDATE public.ordenes_trabajo
    SET cve_atendio = p_assigned_tech_id::TEXT,
        nombre_atendio = v_assigned_tech_name,
        estatus = 'ASIGNADA'
    WHERE id_orden = v_ot_row.id_orden;

    -- Registrar en bitácora si hubo cambio respecto a la preferencia
    INSERT INTO public.bitacora_orden_trabajo (
        id_orden,
        estatus_anterior,
        estatus_nuevo,
        usuario_evento,
        rol_usuario,
        tipo_evento,
        comentario
    ) VALUES (
        v_ot_row.id_orden,
        v_ot_row.estatus,
        'ASIGNADA',
        v_admin_name,
        v_admin_role,
        'ASIGNACION_TECNICO',
        format('Técnico asignado: %s. Técnico preferido original: %s. Asignado por: %s', 
            v_assigned_tech_name, 
            COALESCE(v_requested_tech_name, 'Sin preferencia'), 
            v_admin_name
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'folio', p_folio,
        'assigned_tech', v_assigned_tech_name,
        'requested_tech', COALESCE(v_requested_tech_name, 'Sin preferencia')
    );
END;
$$;
