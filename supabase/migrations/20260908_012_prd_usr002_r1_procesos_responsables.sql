-- ============================================================================
-- TSM-AI: Visibilidad y autorizacion de responsables por proceso (PRD-USR002-R1)
-- Archivo: 20260908_012_prd_usr002_r1_procesos_responsables.sql
-- Fecha: 2026-09-08
-- Prioridad: P0/P1 -- Seguridad y operacion
-- Ambiente: BASE DE DATOS REAL / PRODUCCION exclusivamente
-- Regla de Oro: ADITIVO + IDEMPOTENTE + REVERSIBLE + CERO DESTRUCCION
-- Dependencia: PRD-DB001-R2/R2.1 (009, 010) y PRD-OT001-R1 (011)
-- ============================================================================
-- DEMO UNTOUCHED: Este script no toca TSMAI_DEMO_* ni localStorage DEMO.
-- ============================================================================

-- ============================================================================
-- 0. SNAPSHOT PREVIO -- CONTEOS DE INTEGRIDAD
-- ============================================================================
DO $$
DECLARE
    v_cnt_ot           BIGINT;
    v_cnt_usuarios     BIGINT;
    v_cnt_bitacora     BIGINT;
    v_cnt_auditoria    BIGINT;
BEGIN
    SELECT COUNT(*) INTO v_cnt_ot       FROM public.ordenes_trabajo;
    SELECT COUNT(*) INTO v_cnt_usuarios FROM public.cat_usuarios_roles;
    SELECT COUNT(*) INTO v_cnt_bitacora FROM public.bitacora_mantenimiento;
    SELECT COUNT(*) INTO v_cnt_auditoria FROM public.auditoria_cierre_ot;

    RAISE NOTICE '=== PRD-USR002-R1 SNAPSHOT PREVIO ===';
    RAISE NOTICE 'ordenes_trabajo:    %', v_cnt_ot;
    RAISE NOTICE 'cat_usuarios_roles: %', v_cnt_usuarios;
    RAISE NOTICE 'bitacora_mant.:     %', v_cnt_bitacora;
    RAISE NOTICE 'auditoria_cierre:   %', v_cnt_auditoria;
    RAISE NOTICE '======================================';
END $$;

-- ============================================================================
-- 1. TABLA: cat_responsables_proceso
--    Relacion muchos-a-muchos usuario <-> proceso operativo (PF/CF/TF/AF).
--    Idempotente: IF NOT EXISTS en tabla y constraints.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.cat_responsables_proceso (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id      UUID NOT NULL REFERENCES public.cat_usuarios_roles(id_usuario)
                        ON UPDATE CASCADE ON DELETE RESTRICT,
    proceso         VARCHAR(5) NOT NULL,
    activo          BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    creado_por      UUID REFERENCES public.cat_usuarios_roles(id_usuario)
                        ON UPDATE CASCADE ON DELETE SET NULL,
    actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_por UUID REFERENCES public.cat_usuarios_roles(id_usuario)
                        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT chk_crp_proceso
        CHECK (proceso IN ('PF', 'CF', 'TF', 'AF')),
    CONSTRAINT uq_crp_usuario_proceso
        UNIQUE (usuario_id, proceso)
);

COMMENT ON TABLE public.cat_responsables_proceso IS
    'PRD-USR002-R1: Relacion muchos-a-muchos usuario REAL <-> proceso operativo (PF/CF/TF/AF). Usar activo=FALSE para revocar sin borrar historial.';

CREATE INDEX IF NOT EXISTS idx_crp_usuario_id ON public.cat_responsables_proceso(usuario_id);
CREATE INDEX IF NOT EXISTS idx_crp_proceso    ON public.cat_responsables_proceso(proceso);
CREATE INDEX IF NOT EXISTS idx_crp_activo     ON public.cat_responsables_proceso(activo);

-- ============================================================================
-- 2. RLS EN cat_responsables_proceso
-- ============================================================================
ALTER TABLE public.cat_responsables_proceso ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "p_crp_super_admin_all" ON public.cat_responsables_proceso;
CREATE POLICY "p_crp_super_admin_all" ON public.cat_responsables_proceso
    FOR ALL TO authenticated
    USING (
        public.check_user_role('SUPER_ADMINISTRADOR')
        OR public.check_user_role('ADMINISTRADOR')
    )
    WITH CHECK (
        public.check_user_role('SUPER_ADMINISTRADOR')
        OR public.check_user_role('ADMINISTRADOR')
    );

DROP POLICY IF EXISTS "p_crp_self_select" ON public.cat_responsables_proceso;
CREATE POLICY "p_crp_self_select" ON public.cat_responsables_proceso
    FOR SELECT TO authenticated
    USING (usuario_id = auth.uid());

DROP POLICY IF EXISTS "p_crp_mantenimiento_select" ON public.cat_responsables_proceso;
CREATE POLICY "p_crp_mantenimiento_select" ON public.cat_responsables_proceso
    FOR SELECT TO authenticated
    USING (public.check_user_role('MANTENIMIENTO'));

-- ============================================================================
-- 3. FUNCION: fn_current_user_procesos()
-- ============================================================================
CREATE OR REPLACE FUNCTION public.fn_current_user_procesos()
RETURNS TABLE (proceso VARCHAR)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $func$
BEGIN
    IF EXISTS (
        SELECT 1 FROM public.cat_usuarios_roles
        WHERE (id_usuario = auth.uid() OR correo = auth.jwt()->>'email')
          AND rol IN ('SUPER_ADMINISTRADOR', 'ADMINISTRADOR')
          AND activo = TRUE
    ) THEN
        RETURN QUERY VALUES ('PF'::VARCHAR), ('CF'::VARCHAR), ('TF'::VARCHAR), ('AF'::VARCHAR);
        RETURN;
    END IF;

    RETURN QUERY
    SELECT crp.proceso
    FROM public.cat_responsables_proceso crp
    WHERE crp.usuario_id = auth.uid()
      AND crp.activo = TRUE;
END;
$func$;

REVOKE ALL ON FUNCTION public.fn_current_user_procesos() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_current_user_procesos() TO authenticated, service_role;

-- ============================================================================
-- 4. FUNCION: fn_current_user_has_proceso_access(p_proceso VARCHAR)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.fn_current_user_has_proceso_access(p_proceso VARCHAR)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $func$
BEGIN
    IF public.check_user_role('SUPER_ADMINISTRADOR')
       OR public.check_user_role('ADMINISTRADOR') THEN
        RETURN TRUE;
    END IF;

    RETURN EXISTS (
        SELECT 1
        FROM public.cat_responsables_proceso
        WHERE usuario_id = auth.uid()
          AND proceso = p_proceso
          AND activo = TRUE
    );
END;
$func$;

REVOKE ALL ON FUNCTION public.fn_current_user_has_proceso_access(VARCHAR) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_current_user_has_proceso_access(VARCHAR) TO authenticated, service_role;

-- ============================================================================
-- 5. POLITICA RLS ADITIVA EN ordenes_trabajo (no borra politicas existentes)
-- ============================================================================
DROP POLICY IF EXISTS "p_ot_responsable_proceso_select" ON public.ordenes_trabajo;
CREATE POLICY "p_ot_responsable_proceso_select" ON public.ordenes_trabajo
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.cat_responsables_proceso crp
            WHERE crp.usuario_id = auth.uid()
              AND crp.proceso = ordenes_trabajo.departamento
              AND crp.activo = TRUE
        )
    );

-- ============================================================================
-- 6. EXTENSION DE cerrar_o_rechazar_ot -- RAMA RESPONSABLE_PROCESO
--    Conserva intacta la logica original. Agrega Via B antes del RAISE EXCEPTION.
--    Responsables pueden APROBAR y RECHAZAR (confirmado por usuario - PRD S31).
-- ============================================================================
CREATE OR REPLACE FUNCTION public.cerrar_o_rechazar_ot(
    p_folio TEXT,
    p_accion TEXT,
    p_calificacion INT DEFAULT NULL,
    p_codigo_motivo TEXT DEFAULT NULL,
    p_comentario TEXT DEFAULT NULL,
    p_correlation_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
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
    v_es_responsable_proceso BOOLEAN := FALSE;
BEGIN
    v_corr := COALESCE(p_correlation_id, gen_random_uuid());
    v_user_id := auth.uid();
    v_user_email := auth.jwt()->>'email';

    -- 1. Resolucion confiable del actor (NO confia en datos del cliente)
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
        RAISE EXCEPTION 'UNAUTHORIZED: Usuario no autenticado o no encontrado en el catalogo de personal.';
    END IF;

    -- 2. Bloqueo atomico contra concurrencia
    SELECT * INTO v_ot FROM public.ordenes_trabajo WHERE folio = p_folio FOR UPDATE;
    IF v_ot IS NULL THEN
        RAISE EXCEPTION 'OT_NOT_FOUND: La orden con folio % no existe.', p_folio;
    END IF;

    -- 3. Idempotencia y Prevencion de Doble Cierre
    IF v_ot.estatus = 'cerrada' THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'ALREADY_CLOSED',
            'message', 'La orden de trabajo ya se encuentra cerrada. No se duplicaron acciones ni auditorias.'
        );
    END IF;

    -- 4. Determinar si el actor es el solicitante original
    IF (v_ot.cve_solicitante IS NOT NULL AND (v_ot.cve_solicitante = v_actor.cve_empleado OR v_ot.cve_solicitante = v_actor.id_usuario::text))
       OR (v_ot.nombre_solicitante IS NOT NULL AND LOWER(TRIM(v_ot.nombre_solicitante)) = LOWER(TRIM(v_actor.nombre_completo)))
       OR (LOWER(TRIM(v_actor.correo)) = LOWER(TRIM(COALESCE(v_ot.cve_solicitante, '')))) THEN
        v_es_solicitante_original := TRUE;
    ELSE
        -- Via A: Supervisor / puede_validar_cierre / puede_cerrar_orden (logica original intacta)
        IF v_actor.rol IN ('SUPER_ADMINISTRADOR', 'SUPERVISOR')
           OR v_actor.puede_validar_cierre IS TRUE
           OR v_actor.puede_cerrar_orden IS TRUE THEN
            v_es_sustituto := TRUE;

        -- Via B (NUEVA -- PRD-USR002-R1): Responsable del proceso de la OT
        --   Autorizacion deriva exclusivamente de auth.uid() -> cat_responsables_proceso.
        --   Nunca de parametros enviados por frontend.
        ELSIF EXISTS (
            SELECT 1
            FROM public.cat_responsables_proceso crp
            WHERE crp.usuario_id = v_actor.id_usuario
              AND crp.proceso = v_ot.departamento
              AND crp.activo = TRUE
        ) THEN
            v_es_sustituto := TRUE;
            v_es_responsable_proceso := TRUE;

        ELSE
            RAISE EXCEPTION 'UNAUTHORIZED: No tienes permisos para validar o cerrar esta orden de trabajo.';
        END IF;
    END IF;

    -- 5. Calcular ciclo actual
    SELECT COALESCE(MAX(numero_ciclo), 1) INTO v_ciclo
    FROM public.auditoria_cierre_ot
    WHERE orden_trabajo_id = v_ot.id_orden;

    -- =========================================================================
    -- FLUJO A: APROBACION Y CIERRE DEFINITIVO
    -- =========================================================================
    IF UPPER(TRIM(p_accion)) = 'APROBAR' THEN
        IF p_calificacion IS NULL OR p_calificacion < 1 OR p_calificacion > 5 THEN
            RAISE EXCEPTION 'INVALID_RATING: La calificacion es obligatoria y debe ser entre 1 y 5 estrellas.';
        END IF;

        IF NOT v_es_solicitante_original THEN
            IF p_codigo_motivo IS NULL OR LENGTH(TRIM(p_codigo_motivo)) = 0 THEN
                RAISE EXCEPTION 'MOTIVO_REQUIRED: Se requiere motivo para cierre por jefatura, administracion o responsable de proceso.';
            END IF;
            IF UPPER(TRIM(p_codigo_motivo)) = 'OTRO' AND (p_comentario IS NULL OR LENGTH(TRIM(p_comentario)) = 0) THEN
                RAISE EXCEPTION 'COMENTARIO_REQUIRED: Se requiere comentario cuando el motivo de cierre sustituto es OTRO.';
            END IF;
        END IF;

        IF v_es_solicitante_original THEN
            v_accion_cierre := 'CIERRE_SOLICITANTE';
        ELSIF v_actor.rol = 'SUPER_ADMINISTRADOR' THEN
            v_accion_cierre := 'CIERRE_SUPER_ADMIN';
        ELSIF v_es_responsable_proceso THEN
            v_accion_cierre := 'CIERRE_RESPONSABLE_PROCESO';
        ELSE
            v_accion_cierre := 'CIERRE_JEFE';
        END IF;

        UPDATE public.ordenes_trabajo
        SET
            estatus = 'cerrada',
            cerrada_en = v_now,
            calidad = p_calificacion,
            observacion_cierre = COALESCE(p_comentario, observacion_cierre, 'Trabajo validado y aceptado'),
            validado_por_solicitante = v_es_solicitante_original
        WHERE folio = p_folio;

        BEGIN
            INSERT INTO public.cierres_orden_trabajo (
                id_orden, fecha_cierre, cve_tecnico, nombre_tecnico,
                usuario_valida, fecha_validacion, observacion_cierre, calidad,
                requiere_retrabajo, validado_por_solicitante, estatus_cierre,
                fecha_alta, fecha_actualizacion
            ) VALUES (
                v_ot.id_orden, v_now, v_ot.cve_atendio, v_ot.nombre_atendio,
                v_actor.nombre_completo, v_now, p_comentario, p_calificacion,
                false, v_es_solicitante_original, 'CERRADA_SATISFACTORIA',
                v_now, v_now
            );
        EXCEPTION WHEN OTHERS THEN NULL;
        END;

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

        INSERT INTO public.auditoria_cierre_ot (
            orden_trabajo_id, folio, accion, estado_anterior, estado_nuevo,
            usuario_id, usuario_nombre, rol_usuario, fecha_hora, codigo_motivo,
            comentario, numero_ciclo, origen, correlation_id
        ) VALUES (
            v_ot.id_orden, v_ot.folio, 'CALIFICACION_REGISTRADA', 'cerrada', 'cerrada',
            v_actor.id_usuario, v_actor.nombre_completo, v_actor.rol, v_now,
            'CALIFICACION_ESTRELLAS',
            'Calificacion asignada: ' || p_calificacion || ' / 5 estrellas.',
            v_ciclo, 'App', v_corr
        );

        INSERT INTO public.auditoria_cierre_ot (
            orden_trabajo_id, folio, accion, estado_anterior, estado_nuevo,
            usuario_id, usuario_nombre, rol_usuario, fecha_hora, codigo_motivo,
            comentario, numero_ciclo, origen, correlation_id
        ) VALUES (
            v_ot.id_orden, v_ot.folio, v_accion_cierre, v_ot.estatus, 'cerrada',
            v_actor.id_usuario, v_actor.nombre_completo, v_actor.rol, v_now,
            p_codigo_motivo, p_comentario,
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
    -- FLUJO B: RECHAZO / DEVOLUCION A MANTENIMIENTO PARA RETRABAJO
    -- =========================================================================
    ELSIF UPPER(TRIM(p_accion)) = 'RECHAZAR' THEN
        IF p_codigo_motivo IS NULL OR LENGTH(TRIM(p_codigo_motivo)) = 0 THEN
            RAISE EXCEPTION 'MOTIVO_REQUIRED: El motivo del rechazo es estrictamente obligatorio.';
        END IF;
        IF p_comentario IS NULL OR LENGTH(TRIM(p_comentario)) = 0 THEN
            RAISE EXCEPTION 'COMENTARIO_REQUIRED: El detalle del problema observado es obligatorio.';
        END IF;

        v_ciclo := v_ciclo + 1;

        UPDATE public.ordenes_trabajo
        SET
            estatus = 'en_revision',
            requerimiento_retrabajo = true,
            motivo_retrabajo = p_codigo_motivo || ': ' || p_comentario
        WHERE folio = p_folio;

        INSERT INTO public.auditoria_cierre_ot (
            orden_trabajo_id, folio, accion, estado_anterior, estado_nuevo,
            usuario_id, usuario_nombre, rol_usuario, fecha_hora, codigo_motivo,
            comentario, numero_ciclo, origen, correlation_id
        ) VALUES (
            v_ot.id_orden, v_ot.folio, 'VALIDACION_RECHAZADA', v_ot.estatus, 'en_revision',
            v_actor.id_usuario, v_actor.nombre_completo, v_actor.rol, v_now,
            p_codigo_motivo, p_comentario,
            v_ciclo, 'App', v_corr
        );

        INSERT INTO public.auditoria_cierre_ot (
            orden_trabajo_id, folio, accion, estado_anterior, estado_nuevo,
            usuario_id, usuario_nombre, rol_usuario, fecha_hora, codigo_motivo,
            comentario, numero_ciclo, origen, correlation_id
        ) VALUES (
            v_ot.id_orden, v_ot.folio, 'REAPERTURA', 'en_revision', 'en_revision',
            v_actor.id_usuario, v_actor.nombre_completo, v_actor.rol, v_now,
            p_codigo_motivo,
            'Orden devuelta a mantenimiento para nuevo ciclo de atencion tecnica.',
            v_ciclo, 'App', v_corr
        );

        RETURN jsonb_build_object(
            'success', true,
            'folio', p_folio,
            'estatus', 'en_revision',
            'ciclo', v_ciclo,
            'mensaje', 'Entrega tecnica rechazada. La orden regreso a mantenimiento para retrabajo (Ciclo ' || v_ciclo || ').'
        );
    ELSE
        RAISE EXCEPTION 'INVALID_ACTION: Accion no reconocida: %. Solo se admite APROBAR o RECHAZAR.', p_accion;
    END IF;
END;
$func$;

REVOKE ALL ON FUNCTION public.cerrar_o_rechazar_ot(TEXT, TEXT, INT, TEXT, TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cerrar_o_rechazar_ot(TEXT, TEXT, INT, TEXT, TEXT, UUID) TO authenticated, service_role;

-- ============================================================================
-- ============================================================================
-- 7. INSERCION IDEMPOTENTE DE LA MATRIZ INICIAL (4 RESPONSABLES OPERATIVOS)
--    Resolucion por correo (inequivoco, sin hardcode de nombre ni ID).
--    NOTA: Francisco Hernandez (f.hernandez@towell.com.mx) queda EXCLUIDO
--    de cat_responsables_proceso por ser SUPER_ADMINISTRADOR, lo cual ya le otorga
--    acceso global a todos los procesos (PF, CF, TF, AF) sin requerir fila explicita (PRD S21).
-- ============================================================================
DO $seed$
DECLARE
    v_ernesto    UUID;
    v_miguel     UUID;
    v_gustavo    UUID;
    v_jorge      UUID;
    v_cnt        INT;
    v_admin_id   UUID;
BEGIN
    SELECT id_usuario INTO v_admin_id
    FROM public.cat_usuarios_roles
    WHERE rol = 'SUPER_ADMINISTRADOR' AND activo = TRUE
    ORDER BY fecha_alta ASC LIMIT 1;

    -- Ernesto -> PF
    SELECT COUNT(*) INTO v_cnt FROM public.cat_usuarios_roles
    WHERE LOWER(TRIM(correo)) = 'ehernandez@towell.com.mx' AND activo = TRUE;
    IF v_cnt = 0 THEN RAISE EXCEPTION 'PRD-USR002-R1 ABORT: No encontrado ehernandez@towell.com.mx'; END IF;
    IF v_cnt > 1 THEN RAISE EXCEPTION 'PRD-USR002-R1 ABORT: Ambiguedad en ehernandez@towell.com.mx (% registros)', v_cnt; END IF;
    SELECT id_usuario INTO v_ernesto FROM public.cat_usuarios_roles
    WHERE LOWER(TRIM(correo)) = 'ehernandez@towell.com.mx' AND activo = TRUE;

    -- Miguel -> TF
    SELECT COUNT(*) INTO v_cnt FROM public.cat_usuarios_roles
    WHERE LOWER(TRIM(correo)) = 'mportillo@towelmex.com' AND activo = TRUE;
    IF v_cnt = 0 THEN RAISE EXCEPTION 'PRD-USR002-R1 ABORT: No encontrado mportillo@towelmex.com'; END IF;
    IF v_cnt > 1 THEN RAISE EXCEPTION 'PRD-USR002-R1 ABORT: Ambiguedad en mportillo@towelmex.com (% registros)', v_cnt; END IF;
    SELECT id_usuario INTO v_miguel FROM public.cat_usuarios_roles
    WHERE LOWER(TRIM(correo)) = 'mportillo@towelmex.com' AND activo = TRUE;

    -- Gustavo -> CF
    SELECT COUNT(*) INTO v_cnt FROM public.cat_usuarios_roles
    WHERE LOWER(TRIM(correo)) = 'gmotte@towell.com.mx' AND activo = TRUE;
    IF v_cnt = 0 THEN RAISE EXCEPTION 'PRD-USR002-R1 ABORT: No encontrado gmotte@towell.com.mx'; END IF;
    IF v_cnt > 1 THEN RAISE EXCEPTION 'PRD-USR002-R1 ABORT: Ambiguedad en gmotte@towell.com.mx (% registros)', v_cnt; END IF;
    SELECT id_usuario INTO v_gustavo FROM public.cat_usuarios_roles
    WHERE LOWER(TRIM(correo)) = 'gmotte@towell.com.mx' AND activo = TRUE;

    -- Jorge Cruz -> AF
    SELECT COUNT(*) INTO v_cnt FROM public.cat_usuarios_roles
    WHERE LOWER(TRIM(correo)) = 'jcruz@towell.com.mx' AND activo = TRUE;
    IF v_cnt = 0 THEN RAISE EXCEPTION 'PRD-USR002-R1 ABORT: No encontrado jcruz@towell.com.mx'; END IF;
    IF v_cnt > 1 THEN RAISE EXCEPTION 'PRD-USR002-R1 ABORT: Ambiguedad en jcruz@towell.com.mx (% registros)', v_cnt; END IF;
    SELECT id_usuario INTO v_jorge FROM public.cat_usuarios_roles
    WHERE LOWER(TRIM(correo)) = 'jcruz@towell.com.mx' AND activo = TRUE;

    -- INSERT idempotente: ON CONFLICT reactiva si estaba inactivo
    INSERT INTO public.cat_responsables_proceso (usuario_id, proceso, activo, creado_por, actualizado_por)
    VALUES
        (v_ernesto,   'PF', TRUE, v_admin_id, v_admin_id),
        (v_miguel,    'TF', TRUE, v_admin_id, v_admin_id),
        (v_gustavo,   'CF', TRUE, v_admin_id, v_admin_id),
        (v_jorge,     'AF', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (usuario_id, proceso)
    DO UPDATE SET
        activo          = TRUE,
        actualizado_en  = NOW(),
        actualizado_por = EXCLUDED.creado_por;

    RAISE NOTICE '=== PRD-USR002-R1: Matriz inicial aplicada (4 responsables) ===';
    RAISE NOTICE 'Ernesto   (ehernandez@towell.com.mx)  -> PF  [%]', v_ernesto;
    RAISE NOTICE 'Miguel    (mportillo@towelmex.com)    -> TF  [%]', v_miguel;
    RAISE NOTICE 'Gustavo   (gmotte@towell.com.mx)      -> CF  [%]', v_gustavo;
    RAISE NOTICE 'Jorge     (jcruz@towell.com.mx)       -> AF  [%]', v_jorge;
    RAISE NOTICE 'Francisco Hernandez (f.hernandez@towell.com.mx) -> SUPER_ADMIN (acceso global retenido, fuera de tabla de procesos)';
END $seed$;

-- ============================================================================
-- 8. TABLA DEDICADA DE AUDITORIA: auditoria_responsables_proceso (APPEND-ONLY)
--    PRD-USR002-R1 S22-24: Trazabilidad completa de asignaciones y revocaciones.
--    Acciones: ASIGNADO, REVOCADO, REACTIVADO.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.auditoria_responsables_proceso (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id      UUID NOT NULL REFERENCES public.cat_usuarios_roles(id_usuario) ON DELETE RESTRICT,
    proceso         VARCHAR(5) NOT NULL,
    accion          VARCHAR(20) NOT NULL,
    actor_id        UUID REFERENCES public.cat_usuarios_roles(id_usuario) ON DELETE SET NULL,
    actor_nombre    VARCHAR(150),
    actor_rol       VARCHAR(50),
    fecha_hora      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    estado_anterior BOOLEAN,
    estado_nuevo    BOOLEAN NOT NULL,
    comentario      TEXT,
    correlation_id  UUID DEFAULT gen_random_uuid(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_arp_proceso CHECK (proceso IN ('PF', 'CF', 'TF', 'AF')),
    CONSTRAINT chk_arp_accion CHECK (accion IN ('ASIGNADO', 'REVOCADO', 'REACTIVADO'))
);

COMMENT ON TABLE public.auditoria_responsables_proceso IS
    'PRD-USR002-R1: Registro historico inmutable (APPEND-ONLY) de asignaciones, revocaciones y reactivaciones de permisos por proceso.';

CREATE INDEX IF NOT EXISTS idx_arp_usuario_id ON public.auditoria_responsables_proceso(usuario_id);
CREATE INDEX IF NOT EXISTS idx_arp_proceso    ON public.auditoria_responsables_proceso(proceso);
CREATE INDEX IF NOT EXISTS idx_arp_fecha      ON public.auditoria_responsables_proceso(fecha_hora DESC);

-- Trigger de inmutabilidad append-only para auditoria_responsables_proceso
CREATE OR REPLACE FUNCTION public.fn_prevent_audit_responsables_mutation()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'AUDIT_RESPONSABLES_IMMUTABLE: Los registros de auditoria de permisos son inmutables (APPEND-ONLY). Prohibido UPDATE o DELETE.';
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_auditoria_responsables_mutation ON public.auditoria_responsables_proceso;
CREATE TRIGGER trg_prevent_auditoria_responsables_mutation
    BEFORE UPDATE OR DELETE ON public.auditoria_responsables_proceso
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_prevent_audit_responsables_mutation();

ALTER TABLE public.auditoria_responsables_proceso ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "p_arp_super_admin_select" ON public.auditoria_responsables_proceso;
CREATE POLICY "p_arp_super_admin_select" ON public.auditoria_responsables_proceso
    FOR SELECT TO authenticated
    USING (public.check_user_role('SUPER_ADMINISTRADOR') OR public.check_user_role('ADMINISTRADOR'));

DROP POLICY IF EXISTS "p_arp_self_select" ON public.auditoria_responsables_proceso;
CREATE POLICY "p_arp_self_select" ON public.auditoria_responsables_proceso
    FOR SELECT TO authenticated
    USING (usuario_id = auth.uid());

REVOKE UPDATE, DELETE ON public.auditoria_responsables_proceso FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.auditoria_responsables_proceso FROM anon;
GRANT SELECT ON public.auditoria_responsables_proceso TO authenticated;
GRANT INSERT ON public.auditoria_responsables_proceso TO authenticated, service_role;

-- Insercion inicial en auditoria_responsables_proceso
DO $audit$
DECLARE
    v_admin_id   UUID;
    v_admin_name VARCHAR;
    v_rec        RECORD;
BEGIN
    SELECT id_usuario, nombre_completo INTO v_admin_id, v_admin_name
    FROM public.cat_usuarios_roles
    WHERE rol = 'SUPER_ADMINISTRADOR' AND activo = TRUE
    ORDER BY fecha_alta ASC LIMIT 1;

    FOR v_rec IN
        SELECT crp.usuario_id, crp.proceso, u.nombre_completo, u.correo
        FROM public.cat_responsables_proceso crp
        JOIN public.cat_usuarios_roles u ON u.id_usuario = crp.usuario_id
        WHERE crp.activo = TRUE
          AND u.correo IN (
              'ehernandez@towell.com.mx','mportillo@towelmex.com',
              'gmotte@towell.com.mx','jcruz@towell.com.mx'
          )
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM public.auditoria_responsables_proceso
            WHERE usuario_id = v_rec.usuario_id
              AND proceso = v_rec.proceso
              AND accion = 'ASIGNADO'
        ) THEN
            INSERT INTO public.auditoria_responsables_proceso (
                usuario_id, proceso, accion, actor_id, actor_nombre, actor_rol,
                fecha_hora, estado_anterior, estado_nuevo, comentario
            ) VALUES (
                v_rec.usuario_id, v_rec.proceso, 'ASIGNADO', v_admin_id, v_admin_name, 'SUPER_ADMINISTRADOR',
                NOW(), NULL, TRUE, 'Asignacion inicial de proceso ' || v_rec.proceso || ' a ' || v_rec.nombre_completo || ' (' || v_rec.correo || '). PRD-USR002-R1.'
            );
        END IF;
    END LOOP;
END $audit$;

-- ============================================================================
-- 9. GRANTS FINALES
-- ============================================================================
REVOKE ALL ON TABLE public.cat_responsables_proceso FROM PUBLIC, anon;
GRANT SELECT ON TABLE public.cat_responsables_proceso TO authenticated;
GRANT INSERT, UPDATE ON TABLE public.cat_responsables_proceso TO service_role;

-- ============================================================================
-- 10. SNAPSHOT POSTERIOR -- VERIFICACION DE INTEGRIDAD
-- ============================================================================
DO $verify$
DECLARE
    v_cnt_ot        BIGINT;
    v_cnt_usuarios  BIGINT;
    v_cnt_crp       BIGINT;
    v_cnt_arp       BIGINT;
BEGIN
    SELECT COUNT(*) INTO v_cnt_ot       FROM public.ordenes_trabajo;
    SELECT COUNT(*) INTO v_cnt_usuarios FROM public.cat_usuarios_roles;
    SELECT COUNT(*) INTO v_cnt_arp      FROM public.auditoria_responsables_proceso;
    SELECT COUNT(*) INTO v_cnt_crp
    FROM public.cat_responsables_proceso
    WHERE activo = TRUE
      AND usuario_id IN (
          SELECT id_usuario FROM public.cat_usuarios_roles
          WHERE correo IN (
              'ehernandez@towell.com.mx','mportillo@towelmex.com',
              'gmotte@towell.com.mx','jcruz@towell.com.mx'
          )
      );

    RAISE NOTICE '=== PRD-USR002-R1 SNAPSHOT POSTERIOR ===';
    RAISE NOTICE 'ordenes_trabajo:    % (sin cambios)', v_cnt_ot;
    RAISE NOTICE 'cat_usuarios_roles: % (sin cambios)', v_cnt_usuarios;
    RAISE NOTICE 'cat_responsables_proceso (4 usuarios activos): %', v_cnt_crp;
    RAISE NOTICE 'auditoria_responsables_proceso: % eventos', v_cnt_arp;

    IF v_cnt_crp < 4 THEN
        RAISE WARNING 'ALERTA: Solo % de 4 responsables asignados. Verificar correos.', v_cnt_crp;
    ELSE
        RAISE NOTICE 'INTEGRIDAD CONFIRMADA: 4/4 responsables asignados correctamente.';
    END IF;
    RAISE NOTICE '=========================================';
END $verify$;
