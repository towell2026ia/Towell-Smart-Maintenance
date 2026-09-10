-- ============================================================================
-- TSM-AI: ROLLBACK PRD-USR002-R1 — Procesos Responsables
-- Archivo: rollback_20260908_012_prd_usr002_r1_procesos_responsables.sql
-- Fecha: 2026-09-08
-- IMPORTANTE: Este rollback NO elimina usuarios, OT, ni auditorias historicas.
--             Solo revierte los cambios estructurales y funciones de esta migracion.
-- ============================================================================

-- 1. Remover politica RLS aditiva en ordenes_trabajo (la unica agregada por este PRD)
DROP POLICY IF EXISTS "p_ot_responsable_proceso_select" ON public.ordenes_trabajo;

-- 2. Restaurar cerrar_o_rechazar_ot a la version PRD-OT001-R1 (sin rama RESPONSABLE_PROCESO)
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
BEGIN
    v_corr := COALESCE(p_correlation_id, gen_random_uuid());
    v_user_id := auth.uid();
    v_user_email := auth.jwt()->>'email';

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

    SELECT * INTO v_ot FROM public.ordenes_trabajo WHERE folio = p_folio FOR UPDATE;
    IF v_ot IS NULL THEN
        RAISE EXCEPTION 'OT_NOT_FOUND: La orden con folio % no existe.', p_folio;
    END IF;

    IF v_ot.estatus = 'cerrada' THEN
        RETURN jsonb_build_object(
            'success', false, 'code', 'ALREADY_CLOSED',
            'message', 'La orden de trabajo ya se encuentra cerrada. No se duplicaron acciones ni auditorias.'
        );
    END IF;

    IF (v_ot.cve_solicitante IS NOT NULL AND (v_ot.cve_solicitante = v_actor.cve_empleado OR v_ot.cve_solicitante = v_actor.id_usuario::text))
       OR (v_ot.nombre_solicitante IS NOT NULL AND LOWER(TRIM(v_ot.nombre_solicitante)) = LOWER(TRIM(v_actor.nombre_completo)))
       OR (LOWER(TRIM(v_actor.correo)) = LOWER(TRIM(COALESCE(v_ot.cve_solicitante, '')))) THEN
        v_es_solicitante_original := TRUE;
    ELSE
        IF v_actor.rol IN ('SUPER_ADMINISTRADOR', 'SUPERVISOR')
           OR v_actor.puede_validar_cierre IS TRUE
           OR v_actor.puede_cerrar_orden IS TRUE THEN
            v_es_sustituto := TRUE;
        ELSE
            RAISE EXCEPTION 'UNAUTHORIZED: No tienes permisos para validar o cerrar esta orden de trabajo.';
        END IF;
    END IF;

    SELECT COALESCE(MAX(numero_ciclo), 1) INTO v_ciclo
    FROM public.auditoria_cierre_ot WHERE orden_trabajo_id = v_ot.id_orden;

    IF UPPER(TRIM(p_accion)) = 'APROBAR' THEN
        IF p_calificacion IS NULL OR p_calificacion < 1 OR p_calificacion > 5 THEN
            RAISE EXCEPTION 'INVALID_RATING: La calificacion es obligatoria y debe ser entre 1 y 5 estrellas.';
        END IF;
        IF NOT v_es_solicitante_original THEN
            IF p_codigo_motivo IS NULL OR LENGTH(TRIM(p_codigo_motivo)) = 0 THEN
                RAISE EXCEPTION 'MOTIVO_REQUIRED: Se requiere motivo para cierre por jefatura o administracion.';
            END IF;
            IF UPPER(TRIM(p_codigo_motivo)) = 'OTRO' AND (p_comentario IS NULL OR LENGTH(TRIM(p_comentario)) = 0) THEN
                RAISE EXCEPTION 'COMENTARIO_REQUIRED: Se requiere comentario cuando el motivo de cierre sustituto es OTRO.';
            END IF;
        END IF;

        IF v_es_solicitante_original THEN v_accion_cierre := 'CIERRE_SOLICITANTE';
        ELSIF v_actor.rol = 'SUPER_ADMINISTRADOR' THEN v_accion_cierre := 'CIERRE_SUPER_ADMIN';
        ELSE v_accion_cierre := 'CIERRE_JEFE';
        END IF;

        UPDATE public.ordenes_trabajo SET
            estatus = 'cerrada', cerrada_en = v_now, calidad = p_calificacion,
            observacion_cierre = COALESCE(p_comentario, observacion_cierre, 'Trabajo validado y aceptado'),
            validado_por_solicitante = v_es_solicitante_original
        WHERE folio = p_folio;

        BEGIN
            INSERT INTO public.cierres_orden_trabajo (
                id_orden, fecha_cierre, cve_tecnico, nombre_tecnico, usuario_valida,
                fecha_validacion, observacion_cierre, calidad, requiere_retrabajo,
                validado_por_solicitante, estatus_cierre, fecha_alta, fecha_actualizacion
            ) VALUES (
                v_ot.id_orden, v_now, v_ot.cve_atendio, v_ot.nombre_atendio,
                v_actor.nombre_completo, v_now, p_comentario, p_calificacion,
                false, v_es_solicitante_original, 'CERRADA_SATISFACTORIA', v_now, v_now
            );
        EXCEPTION WHEN OTHERS THEN NULL;
        END;

        INSERT INTO public.auditoria_cierre_ot (orden_trabajo_id, folio, accion, estado_anterior, estado_nuevo, usuario_id, usuario_nombre, rol_usuario, fecha_hora, codigo_motivo, comentario, numero_ciclo, origen, correlation_id)
        VALUES (v_ot.id_orden, v_ot.folio, 'VALIDACION_APROBADA', v_ot.estatus, 'cerrada', v_actor.id_usuario, v_actor.nombre_completo, v_actor.rol, v_now, COALESCE(p_codigo_motivo, 'VALIDACION_CONFORME'), COALESCE(p_comentario, 'Trabajo validado satisfactoriamente.'), v_ciclo, 'App', v_corr);
        INSERT INTO public.auditoria_cierre_ot (orden_trabajo_id, folio, accion, estado_anterior, estado_nuevo, usuario_id, usuario_nombre, rol_usuario, fecha_hora, codigo_motivo, comentario, numero_ciclo, origen, correlation_id)
        VALUES (v_ot.id_orden, v_ot.folio, 'CALIFICACION_REGISTRADA', 'cerrada', 'cerrada', v_actor.id_usuario, v_actor.nombre_completo, v_actor.rol, v_now, 'CALIFICACION_ESTRELLAS', 'Calificacion asignada: ' || p_calificacion || ' / 5 estrellas.', v_ciclo, 'App', v_corr);
        INSERT INTO public.auditoria_cierre_ot (orden_trabajo_id, folio, accion, estado_anterior, estado_nuevo, usuario_id, usuario_nombre, rol_usuario, fecha_hora, codigo_motivo, comentario, numero_ciclo, origen, correlation_id)
        VALUES (v_ot.id_orden, v_ot.folio, v_accion_cierre, v_ot.estatus, 'cerrada', v_actor.id_usuario, v_actor.nombre_completo, v_actor.rol, v_now, p_codigo_motivo, p_comentario, v_ciclo, 'App', v_corr);

        RETURN jsonb_build_object('success', true, 'folio', p_folio, 'estatus', 'cerrada', 'accion_cierre', v_accion_cierre, 'calidad', p_calificacion, 'cerrada_en', v_now, 'mensaje', 'Orden de trabajo validada, calificada y cerrada formalmente.');

    ELSIF UPPER(TRIM(p_accion)) = 'RECHAZAR' THEN
        IF p_codigo_motivo IS NULL OR LENGTH(TRIM(p_codigo_motivo)) = 0 THEN RAISE EXCEPTION 'MOTIVO_REQUIRED: El motivo del rechazo es estrictamente obligatorio.'; END IF;
        IF p_comentario IS NULL OR LENGTH(TRIM(p_comentario)) = 0 THEN RAISE EXCEPTION 'COMENTARIO_REQUIRED: El detalle del problema observado es obligatorio.'; END IF;
        v_ciclo := v_ciclo + 1;
        UPDATE public.ordenes_trabajo SET estatus = 'en_revision', requerimiento_retrabajo = true, motivo_retrabajo = p_codigo_motivo || ': ' || p_comentario WHERE folio = p_folio;
        INSERT INTO public.auditoria_cierre_ot (orden_trabajo_id, folio, accion, estado_anterior, estado_nuevo, usuario_id, usuario_nombre, rol_usuario, fecha_hora, codigo_motivo, comentario, numero_ciclo, origen, correlation_id)
        VALUES (v_ot.id_orden, v_ot.folio, 'VALIDACION_RECHAZADA', v_ot.estatus, 'en_revision', v_actor.id_usuario, v_actor.nombre_completo, v_actor.rol, v_now, p_codigo_motivo, p_comentario, v_ciclo, 'App', v_corr);
        INSERT INTO public.auditoria_cierre_ot (orden_trabajo_id, folio, accion, estado_anterior, estado_nuevo, usuario_id, usuario_nombre, rol_usuario, fecha_hora, codigo_motivo, comentario, numero_ciclo, origen, correlation_id)
        VALUES (v_ot.id_orden, v_ot.folio, 'REAPERTURA', 'en_revision', 'en_revision', v_actor.id_usuario, v_actor.nombre_completo, v_actor.rol, v_now, p_codigo_motivo, 'Orden devuelta a mantenimiento para nuevo ciclo de atencion tecnica.', v_ciclo, 'App', v_corr);
        RETURN jsonb_build_object('success', true, 'folio', p_folio, 'estatus', 'en_revision', 'ciclo', v_ciclo, 'mensaje', 'Entrega tecnica rechazada. La orden regreso a mantenimiento para retrabajo (Ciclo ' || v_ciclo || ').');
    ELSE
        RAISE EXCEPTION 'INVALID_ACTION: Accion no reconocida: %. Solo se admite APROBAR o RECHAZAR.', p_accion;
    END IF;
END;
$func$;

REVOKE ALL ON FUNCTION public.cerrar_o_rechazar_ot(TEXT, TEXT, INT, TEXT, TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cerrar_o_rechazar_ot(TEXT, TEXT, INT, TEXT, TEXT, UUID) TO authenticated, service_role;

-- 3. Eliminar funciones nuevas
DROP FUNCTION IF EXISTS public.fn_current_user_has_proceso_access(VARCHAR);
DROP FUNCTION IF EXISTS public.fn_current_user_procesos();

-- 4. Eliminar politicas RLS de cat_responsables_proceso
DROP POLICY IF EXISTS "p_crp_super_admin_all"     ON public.cat_responsables_proceso;
DROP POLICY IF EXISTS "p_crp_self_select"          ON public.cat_responsables_proceso;
DROP POLICY IF EXISTS "p_crp_mantenimiento_select" ON public.cat_responsables_proceso;

-- 5. Eliminar indices
DROP INDEX IF EXISTS public.idx_crp_usuario_id;
DROP INDEX IF EXISTS public.idx_crp_proceso;
DROP INDEX IF EXISTS public.idx_crp_activo;

-- 6. Eliminar tabla cat_responsables_proceso
-- NOTA PRD-USR002-R1 §25: La tabla auditoria_responsables_proceso NO se elimina en el rollback.
-- Todos los históricos de auditoría de permisos se preservan íntegros e inmutables (APPEND-ONLY).
DROP TABLE IF EXISTS public.cat_responsables_proceso;

-- 7. Confirmacion
DO $$
BEGIN
    RAISE NOTICE '=== ROLLBACK PRD-USR002-R1 COMPLETADO ===';
    RAISE NOTICE 'Removido: p_ot_responsable_proceso_select (ordenes_trabajo)';
    RAISE NOTICE 'Removido: fn_current_user_procesos()';
    RAISE NOTICE 'Removido: fn_current_user_has_proceso_access()';
    RAISE NOTICE 'Removido: cat_responsables_proceso (tabla y politicas)';
    RAISE NOTICE 'Restaurado: cerrar_o_rechazar_ot (version PRD-OT001-R1)';
    RAISE NOTICE 'Conservado: usuarios, OT, auditorias historicas (0 destruccion)';
    RAISE NOTICE '==========================================';
END $$;
