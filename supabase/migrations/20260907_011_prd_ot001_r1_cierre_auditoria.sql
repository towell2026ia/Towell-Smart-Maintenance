-- ============================================================================
-- TSM-AI: Módulo de Cierre, Validación, Calificación y Auditoría (PRD-OT001-R1)
-- Archivo: 20260907_011_prd_ot001_r1_cierre_auditoria.sql
-- Fecha: 2026-09-07
-- Prioridad: P0 — Crítica funcional
-- Regla de Oro: Cero Destrucción, Idempotente, Aditivo, Reversible
-- ============================================================================

-- 1. CAMPOS ADITIVOS EN ordenes_trabajo
-- ============================================================================
DO $$
BEGIN
  -- Campo para fecha y hora de cierre formal (independiente de finalización técnica fecha_fin)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'ordenes_trabajo' 
      AND column_name = 'cerrada_en'
  ) THEN
    ALTER TABLE public.ordenes_trabajo ADD COLUMN cerrada_en TIMESTAMPTZ;
  END IF;

  -- Indicador de validación por solicitante original
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'ordenes_trabajo' 
      AND column_name = 'validado_por_solicitante'
  ) THEN
    ALTER TABLE public.ordenes_trabajo ADD COLUMN validado_por_solicitante BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Constraint de calificación 1 a 5 estrellas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_ot_calidad_1_5'
  ) THEN
    ALTER TABLE public.ordenes_trabajo
      ADD CONSTRAINT chk_ot_calidad_1_5
      CHECK (calidad IS NULL OR (calidad >= 1 AND calidad <= 5));
  END IF;
END $$;

-- 2. TABLA DE AUDITORÍA APPEND-ONLY (auditoria_cierre_ot)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.auditoria_cierre_ot (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    orden_trabajo_id UUID NOT NULL REFERENCES public.ordenes_trabajo(id_orden) ON DELETE RESTRICT,
    folio VARCHAR(50) NOT NULL,
    accion VARCHAR(50) NOT NULL,
    estado_anterior VARCHAR(50),
    estado_nuevo VARCHAR(50),
    usuario_id UUID,
    usuario_nombre VARCHAR(150),
    rol_usuario VARCHAR(50),
    fecha_hora TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    codigo_motivo VARCHAR(50),
    comentario TEXT,
    numero_ciclo INTEGER NOT NULL DEFAULT 1,
    origen VARCHAR(50) NOT NULL DEFAULT 'App',
    correlation_id UUID DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices de consulta rápida y auditoría
CREATE INDEX IF NOT EXISTS idx_audit_cierre_folio ON public.auditoria_cierre_ot(folio);
CREATE INDEX IF NOT EXISTS idx_audit_cierre_ot_id ON public.auditoria_cierre_ot(orden_trabajo_id);
CREATE INDEX IF NOT EXISTS idx_audit_cierre_fecha ON public.auditoria_cierre_ot(fecha_hora DESC);

-- 3. INMUTABILIDAD DE AUDITORÍA (BARRERA 3: TRIGGER CONTRA UPDATE/DELETE)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.fn_prevent_audit_mutation()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'AUDIT_LOG_IMMUTABLE: Los registros de auditoría son inmutables (APPEND-ONLY). Queda estrictamente prohibido realizar UPDATE o DELETE.';
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_auditoria_cierre_mutation ON public.auditoria_cierre_ot;
CREATE TRIGGER trg_prevent_auditoria_cierre_mutation
    BEFORE UPDATE OR DELETE ON public.auditoria_cierre_ot
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_prevent_audit_mutation();

-- 4. SEGURIDAD RLS Y GRANTS EN auditoria_cierre_ot
-- ============================================================================
ALTER TABLE public.auditoria_cierre_ot ENABLE ROW LEVEL SECURITY;

-- BARRERA 2: Revocar UPDATE y DELETE en permisos de base
REVOKE UPDATE, DELETE ON public.auditoria_cierre_ot FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.auditoria_cierre_ot FROM anon;

-- BARRERA 1: Políticas RLS
DROP POLICY IF EXISTS "p_audit_select_auth" ON public.auditoria_cierre_ot;
CREATE POLICY "p_audit_select_auth" ON public.auditoria_cierre_ot
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS "p_audit_insert_auth" ON public.auditoria_cierre_ot;
CREATE POLICY "p_audit_insert_auth" ON public.auditoria_cierre_ot
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- 5. RPC: finalizar_trabajo_tecnico (Finalización Técnica != Cierre)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.finalizar_trabajo_tecnico(
    p_folio TEXT,
    p_actividad TEXT DEFAULT NULL,
    p_diagnostico TEXT DEFAULT NULL,
    p_observaciones TEXT DEFAULT NULL,
    p_refacciones TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_user_email TEXT;
    v_actor RECORD;
    v_ot RECORD;
    v_desc_cierre TEXT;
    v_now TIMESTAMPTZ := NOW();
BEGIN
    v_user_id := auth.uid();
    v_user_email := auth.jwt()->>'email';

    -- Resolución confiable del actor (NO confía en parámetros del frontend)
    IF auth.role() = 'service_role' THEN
        SELECT * INTO v_actor FROM public.cat_usuarios_roles WHERE rol = 'SUPER_ADMINISTRADOR' AND activo = TRUE LIMIT 1;
    ELSE
        SELECT * INTO v_actor 
        FROM public.cat_usuarios_roles 
        WHERE (id_usuario = v_user_id OR LOWER(TRIM(correo)) = LOWER(TRIM(v_user_email))) 
          AND activo = TRUE 
        LIMIT 1;
    END IF;

    IF v_actor IS NULL THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Usuario no autenticado o no registrado en cat_usuarios_roles.';
    END IF;

    -- Validar que sea rol de mantenimiento, técnico o administrador
    IF v_actor.rol NOT IN ('MANTENIMIENTO', 'SUPER_ADMINISTRADOR') AND v_actor.puede_atender_orden IS NOT TRUE THEN
        RAISE EXCEPTION 'FORBIDDEN: Solo personal de mantenimiento o administradores pueden finalizar trabajos técnicos.';
    END IF;

    -- Bloqueo atómico de la orden
    SELECT * INTO v_ot FROM public.ordenes_trabajo WHERE folio = p_folio FOR UPDATE;
    IF v_ot IS NULL THEN
        RAISE EXCEPTION 'OT_NOT_FOUND: La orden con folio % no existe.', p_folio;
    END IF;

    IF v_ot.estatus = 'cerrada' THEN
        RETURN jsonb_build_object('success', false, 'code', 'ALREADY_CLOSED', 'message', 'La orden ya se encuentra cerrada.');
    END IF;

    -- Construir descripción técnica si se provee
    v_desc_cierre := TRIM(COALESCE(
        'Diagnóstico: ' || COALESCE(p_diagnostico, 'Revisión técnica') || 
        ' | Actividad: ' || COALESCE(p_actividad, 'Intervención realizada') || 
        ' | Observaciones: ' || COALESCE(p_observaciones, 'Ninguna'),
        v_ot.observacion_cierre,
        'Trabajo técnico finalizado'
    ));

    -- Actualización de la OT: pasa a lista_para_validacion
    -- Si ya tenía fecha_fin histórica (ej. las 9 legacy), SE PRESERVA. Si no, se asigna ahora.
    UPDATE public.ordenes_trabajo
    SET
        estatus = 'lista_para_validacion',
        fecha_fin = COALESCE(v_ot.fecha_fin, CURRENT_DATE),
        hora_fin = COALESCE(v_ot.hora_fin, CURRENT_TIME),
        fecha_hora_fin = COALESCE(v_ot.fecha_hora_fin, v_now),
        observacion_cierre = v_desc_cierre,
        cve_atendio = COALESCE(v_ot.cve_atendio, v_actor.cve_tecnico, v_actor.cve_empleado),
        nombre_atendio = COALESCE(v_ot.nombre_atendio, v_actor.nombre_completo)
    WHERE folio = p_folio;

    -- Registro en bitácora técnica
    BEGIN
        INSERT INTO public.bitacora_mantenimiento (
            id_orden,
            cve_tecnico,
            nombre_tecnico,
            area,
            maquina_id,
            fecha_hora_inicio,
            fecha_hora_fin,
            descripcion_actividad,
            refacciones_usadas,
            observaciones,
            activo
        ) VALUES (
            v_ot.id_orden,
            COALESCE(v_actor.cve_tecnico, v_actor.cve_empleado, 'TEC'),
            v_actor.nombre_completo,
            v_ot.departamento,
            v_ot.maquina_id,
            COALESCE(v_ot.fecha_hora_inicio, v_now),
            v_now,
            COALESCE(p_actividad, 'Finalización técnica de OT'),
            p_refacciones,
            COALESCE(p_observaciones, 'Trabajo completado y listo para validación'),
            true
        );
    EXCEPTION WHEN OTHERS THEN
        -- No bloqueante si hay inconsistencia de FK secundaria
    END;

    -- Inserción de auditoría (Acción: FINALIZACION_TECNICA)
    INSERT INTO public.auditoria_cierre_ot (
        orden_trabajo_id,
        folio,
        accion,
        estado_anterior,
        estado_nuevo,
        usuario_id,
        usuario_nombre,
        rol_usuario,
        fecha_hora,
        codigo_motivo,
        comentario,
        numero_ciclo,
        origen
    ) VALUES (
        v_ot.id_orden,
        v_ot.folio,
        'FINALIZACION_TECNICA',
        v_ot.estatus,
        'lista_para_validacion',
        v_actor.id_usuario,
        v_actor.nombre_completo,
        v_actor.rol,
        v_now,
        'TRABAJO_CONCLUIDO',
        COALESCE(p_actividad, 'Técnico concluyó intervención técnica. Lista para validación.'),
        1,
        'App'
    );

    RETURN jsonb_build_object(
        'success', true,
        'folio', p_folio,
        'estatus', 'lista_para_validacion',
        'mensaje', 'Trabajo finalizado con éxito. Orden lista para validación del solicitante o jefatura.'
    );
END;
$$;

-- 6. RPC: cerrar_o_rechazar_ot (Validación, Calificación, Cierre y Retrabajo)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.cerrar_o_rechazar_ot(
    p_folio TEXT,
    p_accion TEXT, -- 'APROBAR' o 'RECHAZAR'
    p_calificacion INT DEFAULT NULL, -- 1 a 5 (obligatorio si APROBAR)
    p_codigo_motivo TEXT DEFAULT NULL, -- Obligatorio si rechazo o cierre sustituto
    p_comentario TEXT DEFAULT NULL, -- Obligatorio si motivo es OTRO
    p_correlation_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_user_email TEXT;
    v_actor RECORD;
    v_ot RECORD;
    v_es_solicitante_original BOOLEAN := FALSE;
    v_es_sustituto BOOLEAN := FALSE;
    v_accion_cierre TEXT;
    v_corr UUID;
    v_ciclo INT := 1;
    v_now TIMESTAMPTZ := NOW();
BEGIN
    v_corr := COALESCE(p_correlation_id, gen_random_uuid());
    v_user_id := auth.uid();
    v_user_email := auth.jwt()->>'email';

    -- 1. Resolución confiable del actor (NO confía en datos enviados por cliente)
    IF auth.role() = 'service_role' THEN
        SELECT * INTO v_actor FROM public.cat_usuarios_roles WHERE rol = 'SUPER_ADMINISTRADOR' AND activo = TRUE LIMIT 1;
    ELSE
        SELECT * INTO v_actor 
        FROM public.cat_usuarios_roles 
        WHERE (id_usuario = v_user_id OR LOWER(TRIM(correo)) = LOWER(TRIM(v_user_email))) 
          AND activo = TRUE 
        LIMIT 1;
    END IF;

    IF v_actor IS NULL THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Usuario no autenticado o no encontrado en el catálogo de personal.';
    END IF;

    -- 2. Bloqueo atómico contra concurrencia (SELECT ... FOR UPDATE)
    SELECT * INTO v_ot FROM public.ordenes_trabajo WHERE folio = p_folio FOR UPDATE;
    IF v_ot IS NULL THEN
        RAISE EXCEPTION 'OT_NOT_FOUND: La orden con folio % no existe.', p_folio;
    END IF;

    -- 3. Idempotencia y Prevención de Doble Cierre
    IF v_ot.estatus = 'cerrada' THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'ALREADY_CLOSED',
            'message', 'La orden de trabajo ya se encuentra cerrada. No se duplicaron acciones ni auditorías.'
        );
    END IF;

    -- 4. Determinar si el actor es el solicitante original
    IF (v_ot.cve_solicitante IS NOT NULL AND (v_ot.cve_solicitante = v_actor.cve_empleado OR v_ot.cve_solicitante = v_actor.id_usuario::text))
       OR (v_ot.nombre_solicitante IS NOT NULL AND LOWER(TRIM(v_ot.nombre_solicitante)) = LOWER(TRIM(v_actor.nombre_completo)))
       OR (LOWER(TRIM(v_actor.correo)) = LOWER(TRIM(COALESCE(v_ot.cve_solicitante, '')))) THEN
        v_es_solicitante_original := TRUE;
    ELSE
        -- Validar autorización como sustituto (Jefe o Super Administrador)
        IF v_actor.rol IN ('SUPER_ADMINISTRADOR', 'SUPERVISOR') 
           OR v_actor.puede_validar_cierre IS TRUE 
           OR v_actor.puede_cerrar_orden IS TRUE THEN
            v_es_sustituto := TRUE;
        ELSE
            RAISE EXCEPTION 'UNAUTHORIZED: No tienes permisos para validar o cerrar esta orden de trabajo.';
        END IF;
    END IF;

    -- 5. Calcular número de ciclo actual de validación
    SELECT COALESCE(MAX(numero_ciclo), 1) INTO v_ciclo 
    FROM public.auditoria_cierre_ot 
    WHERE orden_trabajo_id = v_ot.id_orden;

    -- =========================================================================
    -- FLUJO A: APROBACIÓN Y CIERRE DEFINITIVO
    -- =========================================================================
    IF UPPER(TRIM(p_accion)) = 'APROBAR' THEN
        -- Validación de calificación (1 a 5 estrellas obligatoria)
        IF p_calificacion IS NULL OR p_calificacion < 1 OR p_calificacion > 5 THEN
            RAISE EXCEPTION 'INVALID_RATING: La calificación de satisfacción es obligatoria y debe ser un valor entre 1 y 5 estrellas.';
        END IF;

        -- Validación de cierre sustituto (exige motivo obligatorio)
        IF NOT v_es_solicitante_original THEN
            IF p_codigo_motivo IS NULL OR LENGTH(TRIM(p_codigo_motivo)) = 0 THEN
                RAISE EXCEPTION 'MOTIVO_REQUIRED: Se requiere un motivo obligatorio para cierre realizado por jefatura o administración.';
            END IF;

            IF UPPER(TRIM(p_codigo_motivo)) = 'OTRO' AND (p_comentario IS NULL OR LENGTH(TRIM(p_comentario)) = 0) THEN
                RAISE EXCEPTION 'COMENTARIO_REQUIRED: Se requiere un comentario detallado cuando el motivo de cierre sustituto es OTRO.';
            END IF;
        END IF;

        -- Identificar acción de auditoría
        IF v_es_solicitante_original THEN
            v_accion_cierre := 'CIERRE_SOLICITANTE';
        ELSIF v_actor.rol = 'SUPER_ADMINISTRADOR' THEN
            v_accion_cierre := 'CIERRE_SUPER_ADMIN';
        ELSE
            v_accion_cierre := 'CIERRE_JEFE';
        END IF;

        -- Actualizar ordenes_trabajo: CERRADA
        -- Importante: fecha_fin y fecha_hora_fin conservan la finalización técnica intacta.
        UPDATE public.ordenes_trabajo
        SET
            estatus = 'cerrada',
            cerrada_en = v_now,
            calidad = p_calificacion,
            observacion_cierre = COALESCE(p_comentario, observacion_cierre, 'Trabajo validado y aceptado'),
            validado_por_solicitante = v_es_solicitante_original
        WHERE folio = p_folio;

        -- Insertar en cierres_orden_trabajo para reportes y compatibilidad
        BEGIN
            INSERT INTO public.cierres_orden_trabajo (
                id_orden,
                fecha_cierre,
                cve_tecnico,
                nombre_tecnico,
                usuario_valida,
                fecha_validacion,
                observacion_cierre,
                calidad,
                requiere_retrabajo,
                validado_por_solicitante,
                estatus_cierre,
                fecha_alta,
                fecha_actualizacion
            ) VALUES (
                v_ot.id_orden,
                v_now,
                v_ot.cve_atendio,
                v_ot.nombre_atendio,
                v_actor.nombre_completo,
                v_now,
                p_comentario,
                p_calificacion,
                false,
                v_es_solicitante_original,
                'CERRADA_SATISFACTORIA',
                v_now,
                v_now
            );
        EXCEPTION WHEN OTHERS THEN
            -- No bloqueante si hay constraint menor en tabla secundaria
        END;

        -- Auditoría Evento 1: VALIDACION_APROBADA
        INSERT INTO public.auditoria_cierre_ot (
            orden_trabajo_id, folio, accion, estado_anterior, estado_nuevo,
            usuario_id, usuario_nombre, rol_usuario, fecha_hora, codigo_motivo,
            comentario, numero_ciclo, origen, correlation_id
        ) VALUES (
            v_ot.id_orden, v_ot.folio, 'VALIDACION_APROBADA', v_ot.estatus, 'cerrada',
            v_actor.id_usuario, v_actor.nombre_completo, v_actor.rol, v_now,
            COALESCE(p_codigo_motivo, 'VALIDACION_CONFORME'),
            COALESCE(p_comentario, 'Trabajo validado satisfactoriamente.'),
            v_ciclo, 'App', v_corr
        );

        -- Auditoría Evento 2: CALIFICACION_REGISTRADA
        INSERT INTO public.auditoria_cierre_ot (
            orden_trabajo_id, folio, accion, estado_anterior, estado_nuevo,
            usuario_id, usuario_nombre, rol_usuario, fecha_hora, codigo_motivo,
            comentario, numero_ciclo, origen, correlation_id
        ) VALUES (
            v_ot.id_orden, v_ot.folio, 'CALIFICACION_REGISTRADA', 'cerrada', 'cerrada',
            v_actor.id_usuario, v_actor.nombre_completo, v_actor.rol, v_now,
            'CALIFICACION_ESTRELLAS',
            'Calificación asignada: ' || p_calificacion || ' / 5 estrellas.',
            v_ciclo, 'App', v_corr
        );

        -- Auditoría Evento 3: CIERRE (CIERRE_SOLICITANTE / CIERRE_JEFE / CIERRE_SUPER_ADMIN)
        INSERT INTO public.auditoria_cierre_ot (
            orden_trabajo_id, folio, accion, estado_anterior, estado_nuevo,
            usuario_id, usuario_nombre, rol_usuario, fecha_hora, codigo_motivo,
            comentario, numero_ciclo, origen, correlation_id
        ) VALUES (
            v_ot.id_orden, v_ot.folio, v_accion_cierre, v_ot.estatus, 'cerrada',
            v_actor.id_usuario, v_actor.nombre_completo, v_actor.rol, v_now,
            p_codigo_motivo,
            p_comentario,
            v_ciclo, 'App', v_corr
        );

        RETURN jsonb_build_object(
            'success', true,
            'folio', p_folio,
            'estatus', 'cerrada',
            'accion_cierre', v_accion_cierre,
            'calidad', p_calificacion,
            'cerrada_en', v_now,
            'mensaje', 'Orden de trabajo validada, calificada y cerrada formalmente.'
        );

    -- =========================================================================
    -- FLUJO B: RECHAZO / DEVOLUCIÓN A MANTENIMIENTO PARA RETRABAJO
    -- =========================================================================
    ELSIF UPPER(TRIM(p_accion)) = 'RECHAZAR' THEN
        -- Motivo y comentario obligatorios para rechazo
        IF p_codigo_motivo IS NULL OR LENGTH(TRIM(p_codigo_motivo)) = 0 THEN
            RAISE EXCEPTION 'MOTIVO_REQUIRED: El motivo del rechazo es estrictamente obligatorio.';
        END IF;

        IF p_comentario IS NULL OR LENGTH(TRIM(p_comentario)) = 0 THEN
            RAISE EXCEPTION 'COMENTARIO_REQUIRED: El detalle del problema observado es obligatorio.';
        END IF;

        -- Incrementar ciclo de validación
        v_ciclo := v_ciclo + 1;

        -- Actualizar ordenes_trabajo a en_revision (estado canónico de retrabajo en cat_estatus_orden)
        UPDATE public.ordenes_trabajo
        SET
            estatus = 'en_revision',
            requerimiento_retrabajo = true,
            motivo_retrabajo = p_codigo_motivo || ': ' || p_comentario
        WHERE folio = p_folio;

        -- Auditoría Evento 1: VALIDACION_RECHAZADA
        INSERT INTO public.auditoria_cierre_ot (
            orden_trabajo_id, folio, accion, estado_anterior, estado_nuevo,
            usuario_id, usuario_nombre, rol_usuario, fecha_hora, codigo_motivo,
            comentario, numero_ciclo, origen, correlation_id
        ) VALUES (
            v_ot.id_orden, v_ot.folio, 'VALIDACION_RECHAZADA', v_ot.estatus, 'en_revision',
            v_actor.id_usuario, v_actor.nombre_completo, v_actor.rol, v_now,
            p_codigo_motivo,
            p_comentario,
            v_ciclo, 'App', v_corr
        );

        -- Auditoría Evento 2: REAPERTURA (Devolución a mantenimiento)
        INSERT INTO public.auditoria_cierre_ot (
            orden_trabajo_id, folio, accion, estado_anterior, estado_nuevo,
            usuario_id, usuario_nombre, rol_usuario, fecha_hora, codigo_motivo,
            comentario, numero_ciclo, origen, correlation_id
        ) VALUES (
            v_ot.id_orden, v_ot.folio, 'REAPERTURA', 'en_revision', 'en_revision',
            v_actor.id_usuario, v_actor.nombre_completo, v_actor.rol, v_now,
            p_codigo_motivo,
            'Orden devuelta a mantenimiento para nuevo ciclo de atención técnica.',
            v_ciclo, 'App', v_corr
        );

        RETURN jsonb_build_object(
            'success', true,
            'folio', p_folio,
            'estatus', 'en_revision',
            'ciclo', v_ciclo,
            'mensaje', 'Entrega técnica rechazada. La orden regresó a mantenimiento para retrabajo (Ciclo ' || v_ciclo || ').'
        );
    ELSE
        RAISE EXCEPTION 'INVALID_ACTION: Acción no reconocida: %. Solo se admite APROBAR o RECHAZAR.', p_accion;
    END IF;
END;
$$;

-- 7. PERMISOS DE EJECUCIÓN
-- ============================================================================
REVOKE ALL ON FUNCTION public.finalizar_trabajo_tecnico(TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.finalizar_trabajo_tecnico(TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.cerrar_o_rechazar_ot(TEXT, TEXT, INT, TEXT, TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cerrar_o_rechazar_ot(TEXT, TEXT, INT, TEXT, TEXT, UUID) TO authenticated, service_role;
