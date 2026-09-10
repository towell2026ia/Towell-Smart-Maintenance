-- ============================================================================
-- TSM-AI: Validación, Calificación, Cierre y Seguimiento por Rechazo de OT
-- Archivo: 20260909_015_prd_ot003_r1_validacion_calificacion_seguimiento.sql
-- Código: PRD-OT003-R1
-- Fecha: 2026-09-09
-- Prioridad: P0 — Flujo Operativo Crítico, Validación, Calificación y Cierre
-- Ambiente: BASE DE DATOS REAL / PRODUCCIÓN exclusivamente
-- Regla de Oro: ADITIVO + IDEMPOTENTE + REVERSIBLE + CERO DESTRUCCION
-- Dependencias: PRD-DB001-R2/R2.1, PRD-OT001-R1, PRD-USR002-R1
-- ============================================================================

-- ============================================================================
-- 0. SNAPSHOT PREVIO — CONTEOS DE INTEGRIDAD
-- ============================================================================
DO $$
DECLARE
    v_cnt_ot   BIGINT;
    v_cnt_sol  BIGINT;
    v_cnt_bit  BIGINT;
    v_cnt_usr  BIGINT;
    v_cnt_maq  BIGINT;
    v_cnt_seg  BIGINT;
BEGIN
    SELECT COUNT(*) INTO v_cnt_ot  FROM public.ordenes_trabajo;
    SELECT COUNT(*) INTO v_cnt_sol FROM public.solicitudes_mantenimiento;
    SELECT COUNT(*) INTO v_cnt_bit FROM public.bitacora_mantenimiento;
    SELECT COUNT(*) INTO v_cnt_usr FROM public.cat_usuarios_roles;
    SELECT COUNT(*) INTO v_cnt_maq FROM public.cat_maquinas;
    SELECT COUNT(*) INTO v_cnt_seg FROM public.segundas_por_rollo;

    RAISE NOTICE '=== PRD-OT003-R1 SNAPSHOT PREVIO ===';
    RAISE NOTICE 'ordenes_trabajo:           %', v_cnt_ot;
    RAISE NOTICE 'solicitudes_mantenimiento: %', v_cnt_sol;
    RAISE NOTICE 'bitacora_mantenimiento:    %', v_cnt_bit;
    RAISE NOTICE 'cat_usuarios_roles:        %', v_cnt_usr;
    RAISE NOTICE 'cat_maquinas:              %', v_cnt_maq;
    RAISE NOTICE 'segundas_por_rollo:        %', v_cnt_seg;
END $$;

-- ============================================================================
-- 1. CAMPOS ADITIVOS EN ordenes_trabajo
-- ============================================================================
DO $$
BEGIN
    -- Fecha y hora de validación / cierre formal
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'ordenes_trabajo' AND column_name = 'cerrada_en'
    ) THEN
        ALTER TABLE public.ordenes_trabajo ADD COLUMN cerrada_en TIMESTAMPTZ;
    END IF;

    -- Indicador si fue validado directamente por el solicitante original
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'ordenes_trabajo' AND column_name = 'validado_por_solicitante'
    ) THEN
        ALTER TABLE public.ordenes_trabajo ADD COLUMN validado_por_solicitante BOOLEAN DEFAULT FALSE;
    END IF;

    -- Vínculo con orden de trabajo origen (padre)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'ordenes_trabajo' AND column_name = 'orden_origen_id'
    ) THEN
        ALTER TABLE public.ordenes_trabajo ADD COLUMN orden_origen_id UUID REFERENCES public.ordenes_trabajo(id_orden) ON DELETE SET NULL;
    END IF;

    -- Vínculo con orden raíz de la cadena de seguimiento
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'ordenes_trabajo' AND column_name = 'orden_raiz_id'
    ) THEN
        ALTER TABLE public.ordenes_trabajo ADD COLUMN orden_raiz_id UUID REFERENCES public.ordenes_trabajo(id_orden) ON DELETE SET NULL;
    END IF;

    -- Folio de la orden antecesora
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'ordenes_trabajo' AND column_name = 'folio_origen'
    ) THEN
        ALTER TABLE public.ordenes_trabajo ADD COLUMN folio_origen VARCHAR(50);
    END IF;

    -- Número de ciclo correlativo (1 = primer ciclo, 2 = primer retrabajo/seguimiento, etc.)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'ordenes_trabajo' AND column_name = 'numero_ciclo'
    ) THEN
        ALTER TABLE public.ordenes_trabajo ADD COLUMN numero_ciclo INTEGER NOT NULL DEFAULT 1;
    END IF;

    -- Código de motivo de rechazo si aplica
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'ordenes_trabajo' AND column_name = 'codigo_motivo_rechazo'
    ) THEN
        ALTER TABLE public.ordenes_trabajo ADD COLUMN codigo_motivo_rechazo VARCHAR(100);
    END IF;

    -- Comentario detallado de rechazo
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'ordenes_trabajo' AND column_name = 'comentario_rechazo'
    ) THEN
        ALTER TABLE public.ordenes_trabajo ADD COLUMN comentario_rechazo TEXT;
    END IF;

    -- Constraint de calificación 1 a 5 estrellas
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_ot_calidad_1_5'
    ) THEN
        ALTER TABLE public.ordenes_trabajo
            ADD CONSTRAINT chk_ot_calidad_1_5
            CHECK (calidad IS NULL OR (calidad >= 1 AND calidad <= 5));
    END IF;
END $$;

-- ============================================================================
-- 2. CAMPOS ADITIVOS EN solicitudes_mantenimiento
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'solicitudes_mantenimiento' AND column_name = 'solicitud_origen_id'
    ) THEN
        ALTER TABLE public.solicitudes_mantenimiento ADD COLUMN solicitud_origen_id UUID;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'solicitudes_mantenimiento' AND column_name = 'solicitud_raiz_id'
    ) THEN
        ALTER TABLE public.solicitudes_mantenimiento ADD COLUMN solicitud_raiz_id UUID;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'solicitudes_mantenimiento' AND column_name = 'folio_origen'
    ) THEN
        ALTER TABLE public.solicitudes_mantenimiento ADD COLUMN folio_origen VARCHAR(50);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'solicitudes_mantenimiento' AND column_name = 'numero_ciclo'
    ) THEN
        ALTER TABLE public.solicitudes_mantenimiento ADD COLUMN numero_ciclo INTEGER DEFAULT 1;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'solicitudes_mantenimiento' AND column_name = 'motivo_rechazo_previo'
    ) THEN
        ALTER TABLE public.solicitudes_mantenimiento ADD COLUMN motivo_rechazo_previo TEXT;
    END IF;
END $$;

-- ============================================================================
-- 3. CATÁLOGO DE MOTIVOS DE RECHAZO (cat_motivos_rechazo_ot)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.cat_motivos_rechazo_ot (
    id_motivo SERIAL PRIMARY KEY,
    codigo VARCHAR(50) UNIQUE NOT NULL,
    descripcion TEXT NOT NULL,
    requiere_comentario BOOLEAN DEFAULT FALSE,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.cat_motivos_rechazo_ot (codigo, descripcion, requiere_comentario, activo)
VALUES
    ('FALLA_PERSISTE', 'El problema o síntoma original continúa presente', FALSE, TRUE),
    ('FALLA_REAPARECIO', 'La falla reapareció al poner en marcha el equipo', FALSE, TRUE),
    ('TRABAJO_INCOMPLETO', 'El trabajo quedó incompleto o requiere ajuste adicional', FALSE, TRUE),
    ('EQUIPO_NO_OPERATIVO', 'El equipo no quedó en condiciones operativas para producción', FALSE, TRUE),
    ('OTRO', 'Otro motivo específico de rechazo (requiere justificación detallada)', TRUE, TRUE)
ON CONFLICT (codigo) DO UPDATE
SET descripcion = EXCLUDED.descripcion,
    requiere_comentario = EXCLUDED.requiere_comentario,
    activo = EXCLUDED.activo;

-- ============================================================================
-- 4. TABLA DE AUDITORÍA APPEND-ONLY (auditoria_cierre_ot)
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
    calificacion INTEGER,
    codigo_motivo VARCHAR(100),
    comentario TEXT,
    numero_ciclo INTEGER NOT NULL DEFAULT 1,
    origen VARCHAR(50) NOT NULL DEFAULT 'App',
    correlation_id UUID DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_cierre_folio ON public.auditoria_cierre_ot(folio);
CREATE INDEX IF NOT EXISTS idx_audit_cierre_ot_id ON public.auditoria_cierre_ot(orden_trabajo_id);
CREATE INDEX IF NOT EXISTS idx_audit_cierre_fecha ON public.auditoria_cierre_ot(fecha_hora DESC);
CREATE INDEX IF NOT EXISTS idx_audit_cierre_corr  ON public.auditoria_cierre_ot(correlation_id);

-- TRIGGER DE INMUTABILIDAD (APPEND-ONLY)
CREATE OR REPLACE FUNCTION public.fn_prevent_auditoria_cierre_mutation()
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
    EXECUTE FUNCTION public.fn_prevent_auditoria_cierre_mutation();

-- RLS Y POLÍTICAS DE AUDITORÍA
ALTER TABLE public.auditoria_cierre_ot ENABLE ROW LEVEL SECURITY;

REVOKE UPDATE, DELETE ON public.auditoria_cierre_ot FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.auditoria_cierre_ot FROM anon;

DROP POLICY IF EXISTS "p_audit_select_auth" ON public.auditoria_cierre_ot;
CREATE POLICY "p_audit_select_auth" ON public.auditoria_cierre_ot
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS "p_audit_insert_auth" ON public.auditoria_cierre_ot;
CREATE POLICY "p_audit_insert_auth" ON public.auditoria_cierre_ot
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- ============================================================================
-- 5. RPC: finalizar_trabajo_tecnico (Finalización Técnica != Cierre Administrativo)
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

    -- Resolución segura del actor
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

    -- Validar rol técnico o administrador
    IF v_actor.rol NOT IN ('MANTENIMIENTO', 'SUPER_ADMINISTRADOR') AND v_actor.puede_atender_orden IS NOT TRUE THEN
        RAISE EXCEPTION 'FORBIDDEN: Solo personal técnico de mantenimiento o administradores pueden finalizar trabajos técnicos.';
    END IF;

    -- Bloqueo atómico de la OT
    SELECT * INTO v_ot FROM public.ordenes_trabajo WHERE folio = p_folio FOR UPDATE;
    IF v_ot IS NULL THEN
        RAISE EXCEPTION 'OT_NOT_FOUND: La orden con folio % no existe.', p_folio;
    END IF;

    IF v_ot.estatus = 'cerrada' THEN
        RETURN jsonb_build_object('success', false, 'code', 'ALREADY_CLOSED', 'message', 'La orden ya se encuentra cerrada.');
    END IF;

    v_desc_cierre := TRIM(COALESCE(
        'Diagnóstico: ' || COALESCE(p_diagnostico, 'Revisión técnica') || 
        ' | Actividad: ' || COALESCE(p_actividad, 'Intervención realizada') || 
        ' | Observaciones: ' || COALESCE(p_observaciones, 'Ninguna'),
        v_ot.observacion_cierre,
        'Trabajo técnico finalizado'
    ));

    -- Actualización de la OT a lista_para_validacion
    -- Si ya tenía fecha_fin histórica (ej. las 9 legacy), se PRESERVA. Si no, se asigna ahora.
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

    -- Registro en bitácora de mantenimiento
    BEGIN
        INSERT INTO public.bitacora_mantenimiento (
            id_orden, cve_tecnico, nombre_tecnico, area, maquina_id,
            fecha_hora_inicio, fecha_hora_fin, descripcion_actividad,
            refacciones_usadas, observaciones, activo
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
        -- No bloqueante
    END;

    -- Inserción en auditoría
    INSERT INTO public.auditoria_cierre_ot (
        orden_trabajo_id, folio, accion, estado_anterior, estado_nuevo,
        usuario_id, usuario_nombre, rol_usuario, fecha_hora, codigo_motivo,
        comentario, numero_ciclo, origen
    ) VALUES (
        v_ot.id_orden, v_ot.folio, 'FINALIZACION_TECNICA', v_ot.estatus, 'lista_para_validacion',
        v_actor.id_usuario, v_actor.nombre_completo, v_actor.rol, v_now,
        'TRABAJO_CONCLUIDO',
        COALESCE(p_actividad, 'Técnico concluyó intervención técnica. Lista para validación.'),
        COALESCE(v_ot.numero_ciclo, 1), 'App'
    );

    RETURN jsonb_build_object(
        'success', true,
        'folio', p_folio,
        'estatus', 'lista_para_validacion',
        'mensaje', 'Trabajo finalizado con éxito. Orden lista para validación.'
    );
END;
$$;

-- ============================================================================
-- 6. RPC: cerrar_o_rechazar_ot (Validación, Calificación, Cierre y Seguimiento)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.cerrar_o_rechazar_ot(
    p_folio TEXT,
    p_accion TEXT, -- 'APROBAR' o 'RECHAZAR'
    p_calificacion INT DEFAULT NULL, -- 1 a 5 (obligatorio si APROBAR)
    p_codigo_motivo TEXT DEFAULT NULL, -- Obligatorio si RECHAZAR o cierre sustituto
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
    v_es_jefe_proceso BOOLEAN := FALSE;
    v_es_super_admin BOOLEAN := FALSE;
    v_accion_cierre TEXT;
    v_corr UUID;
    v_ciclo INT := 1;
    v_nuevo_ciclo INT := 1;
    v_now TIMESTAMPTZ := NOW();
    v_area VARCHAR(10);
    v_prefix VARCHAR(10);
    v_nuevo_id UUID;
    v_nuevo_folio TEXT;
    v_max_num INT := 0;
    v_row RECORD;
    v_num INT;
BEGIN
    v_corr := COALESCE(p_correlation_id, gen_random_uuid());
    v_user_id := auth.uid();
    v_user_email := auth.jwt()->>'email';

    -- 1. Resolución confiable del actor desde auth.uid()
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

    -- Compatibilidad Legacy: admitir lista_para_validacion y ejecutada
    IF v_ot.estatus NOT IN ('lista_para_validacion', 'ejecutada', 'solicitud_recibida', 'asignada', 'ASIGNADA') THEN
        RAISE EXCEPTION 'INVALID_STATE: La orden de trabajo (%) se encuentra en estatus % y no puede ser validada.', p_folio, v_ot.estatus;
    END IF;

    -- 4. Determinar si el actor es el solicitante original
    IF (v_ot.cve_solicitante IS NOT NULL AND (v_ot.cve_solicitante = v_actor.cve_empleado OR v_ot.cve_solicitante = v_actor.id_usuario::text))
       OR (v_ot.nombre_solicitante IS NOT NULL AND LOWER(TRIM(v_ot.nombre_solicitante)) = LOWER(TRIM(v_actor.nombre_completo)))
       OR (LOWER(TRIM(v_actor.correo)) = LOWER(TRIM(COALESCE(v_ot.cve_solicitante, '')))) THEN
        v_es_solicitante_original := TRUE;
    END IF;

    -- 5. Determinar si es Super Administrador
    IF v_actor.rol = 'SUPER_ADMINISTRADOR' THEN
        v_es_super_admin := TRUE;
    END IF;

    -- 6. Determinar si es Jefe / Responsable de Proceso autorizado (PRD-USR002-R1)
    v_area := COALESCE(v_ot.departamento, v_ot.area);
    IF (v_actor.rol = 'SUPERVISOR' OR LOWER(TRIM(v_actor.correo)) IN ('ehernandez@towell.com.mx', 'gmotte@towell.com.mx', 'mportillo@towelmex.com', 'jcruz@towell.com.mx'))
       AND (COALESCE(v_actor.area, v_actor.departamento) = v_area) THEN
        v_es_jefe_proceso := TRUE;
    END IF;

    -- Autorización P0: solo solicitante original, jefe de proceso o super admin
    IF NOT v_es_solicitante_original AND NOT v_es_jefe_proceso AND NOT v_es_super_admin THEN
        RAISE EXCEPTION 'UNAUTHORIZED: No tienes permisos para validar o cerrar esta orden de trabajo.';
    END IF;

    -- Obtener ciclo actual
    v_ciclo := COALESCE(v_ot.numero_ciclo, 1);

    -- =========================================================================
    -- FLUJO A: APROBACIÓN Y CIERRE DEFINITIVO
    -- =========================================================================
    IF UPPER(TRIM(p_accion)) = 'APROBAR' THEN
        -- Validación de calificación obligatoria (1 a 5 estrellas)
        IF p_calificacion IS NULL OR p_calificacion < 1 OR p_calificacion > 5 THEN
            RAISE EXCEPTION 'INVALID_RATING: La calificación de satisfacción es obligatoria y debe ser un valor entero entre 1 y 5 estrellas (PRD-OT003-R1 §20, §21).';
        END IF;

        -- Validación de motivo si es cierre sustituto
        IF NOT v_es_solicitante_original THEN
            IF p_codigo_motivo IS NULL OR LENGTH(TRIM(p_codigo_motivo)) = 0 THEN
                RAISE EXCEPTION 'MOTIVO_REQUIRED: Se requiere un motivo obligatorio para el cierre realizado por jefatura o administración.';
            END IF;

            IF UPPER(TRIM(p_codigo_motivo)) = 'OTRO' AND (p_comentario IS NULL OR LENGTH(TRIM(p_comentario)) = 0) THEN
                RAISE EXCEPTION 'COMENTARIO_REQUIRED: Se requiere un comentario explicativo cuando el motivo de sustitución es OTRO.';
            END IF;
        END IF;

        -- Identificar tipo de cierre
        IF v_es_solicitante_original THEN
            v_accion_cierre := 'CIERRE_SOLICITANTE';
        ELSIF v_es_super_admin THEN
            v_accion_cierre := 'CIERRE_SUPER_ADMIN';
        ELSE
            v_accion_cierre := 'CIERRE_JEFE';
        END IF;

        -- Actualizar ordenes_trabajo a cerrada
        -- PRESERVANDO fecha_fin técnica intacta y registrando cerrada_en
        UPDATE public.ordenes_trabajo
        SET
            estatus = 'cerrada',
            cerrada_en = v_now,
            calidad = p_calificacion,
            observacion_cierre = COALESCE(p_comentario, observacion_cierre, 'Trabajo validado y aceptado'),
            validado_por_solicitante = v_es_solicitante_original
        WHERE folio = p_folio;

        -- Registrar en cierres_orden_trabajo
        BEGIN
            INSERT INTO public.cierres_orden_trabajo (
                id_orden, fecha_cierre, cve_tecnico, nombre_tecnico,
                usuario_valida, fecha_validacion, observacion_cierre,
                calidad, requiere_retrabajo, validado_por_solicitante,
                estatus_cierre, fecha_alta, fecha_actualizacion
            ) VALUES (
                v_ot.id_orden, v_now, v_ot.cve_atendio, v_ot.nombre_atendio,
                v_actor.nombre_completo, v_now, p_comentario,
                p_calificacion, false, v_es_solicitante_original,
                'CERRADA_SATISFACTORIA', v_now, v_now
            );
        EXCEPTION WHEN OTHERS THEN
            -- No bloqueante
        END;

        -- Auditoría Evento 1: VALIDACION_APROBADA
        INSERT INTO public.auditoria_cierre_ot (
            orden_trabajo_id, folio, accion, estado_anterior, estado_nuevo,
            usuario_id, usuario_nombre, rol_usuario, fecha_hora, calificacion,
            codigo_motivo, comentario, numero_ciclo, origen, correlation_id
        ) VALUES (
            v_ot.id_orden, v_ot.folio, 'VALIDACION_APROBADA', v_ot.estatus, 'cerrada',
            v_actor.id_usuario, v_actor.nombre_completo, v_actor.rol, v_now, p_calificacion,
            COALESCE(p_codigo_motivo, 'VALIDACION_CONFORME'),
            COALESCE(p_comentario, 'Trabajo validado satisfactoriamente.'),
            v_ciclo, 'App', v_corr
        );

        -- Auditoría Evento 2: CALIFICACION_REGISTRADA
        INSERT INTO public.auditoria_cierre_ot (
            orden_trabajo_id, folio, accion, estado_anterior, estado_nuevo,
            usuario_id, usuario_nombre, rol_usuario, fecha_hora, calificacion,
            codigo_motivo, comentario, numero_ciclo, origen, correlation_id
        ) VALUES (
            v_ot.id_orden, v_ot.folio, 'CALIFICACION_REGISTRADA', 'cerrada', 'cerrada',
            v_actor.id_usuario, v_actor.nombre_completo, v_actor.rol, v_now, p_calificacion,
            'CALIFICACION_ESTRELLAS',
            'Calificación asignada: ' || p_calificacion || ' / 5 estrellas.',
            v_ciclo, 'App', v_corr
        );

        -- Auditoría Evento 3: CIERRE
        INSERT INTO public.auditoria_cierre_ot (
            orden_trabajo_id, folio, accion, estado_anterior, estado_nuevo,
            usuario_id, usuario_nombre, rol_usuario, fecha_hora, calificacion,
            codigo_motivo, comentario, numero_ciclo, origen, correlation_id
        ) VALUES (
            v_ot.id_orden, v_ot.folio, v_accion_cierre, v_ot.estatus, 'cerrada',
            v_actor.id_usuario, v_actor.nombre_completo, v_actor.rol, v_now, p_calificacion,
            p_codigo_motivo, p_comentario, v_ciclo, 'App', v_corr
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
    -- FLUJO B: RECHAZO — CERRAR CICLO + NUEVA SOLICITUD VINCULADA
    -- =========================================================================
    ELSIF UPPER(TRIM(p_accion)) = 'RECHAZAR' THEN
        -- Validar motivo estructurado obligatorio
        IF p_codigo_motivo IS NULL OR LENGTH(TRIM(p_codigo_motivo)) = 0 THEN
            RAISE EXCEPTION 'MOTIVO_REQUIRED: El motivo del rechazo es estrictamente obligatorio (PRD-OT003-R1 §32).';
        END IF;

        IF UPPER(TRIM(p_codigo_motivo)) = 'OTRO' AND (p_comentario IS NULL OR LENGTH(TRIM(p_comentario)) = 0) THEN
            RAISE EXCEPTION 'COMENTARIO_REQUIRED: Para el motivo OTRO, el comentario con el detalle del problema es obligatorio (PRD-OT003-R1 §33).';
        END IF;

        -- 1. Cerrar el ciclo de la OT original marcándola como rechazada
        -- Conservando técnico, fechas, bitácora y checklists sin borrarlos
        UPDATE public.ordenes_trabajo
        SET
            estatus = 'rechazada',
            codigo_motivo_rechazo = p_codigo_motivo,
            comentario_rechazo = p_comentario,
            requerimiento_retrabajo = TRUE,
            motivo_retrabajo = p_codigo_motivo || ': ' || COALESCE(p_comentario, ''),
            cerrada_en = v_now
        WHERE folio = p_folio;

        -- 2. Calcular siguiente ciclo y generar nuevo ID único
        v_nuevo_ciclo := v_ciclo + 1;
        v_nuevo_id := gen_random_uuid();
        v_prefix := COALESCE(v_area, 'OT');

        -- 3. Calcular siguiente folio estándar de planta (ej: CF00010, PF00011)
        v_max_num := 0;
        FOR v_row IN 
            SELECT folio AS f FROM public.ordenes_trabajo WHERE folio LIKE (v_prefix || '%')
            UNION
            SELECT folio_solicitud AS f FROM public.solicitudes_mantenimiento WHERE folio_solicitud LIKE (v_prefix || '%')
        LOOP
            BEGIN
                v_num := substring(v_row.f from length(v_prefix) + 1)::INTEGER;
                IF v_num > v_max_num THEN
                    v_max_num := v_num;
                END IF;
            EXCEPTION WHEN OTHERS THEN
                -- Ignorar si no es número
            END;
        END LOOP;

        v_nuevo_folio := v_prefix || LPAD((v_max_num + 1)::TEXT, 5, '0');

        -- 4. Crear NUEVA SOLICITUD en solicitudes_mantenimiento
        BEGIN
            INSERT INTO public.solicitudes_mantenimiento (
                id,
                folio_solicitud,
                solicitante_nombre,
                solicitante_id,
                area,
                maquina_id,
                tipo_servicio,
                descripcion_falla,
                maquina_detenida,
                urgencia,
                estatus,
                fecha_registro,
                solicitud_origen_id,
                solicitud_raiz_id,
                folio_origen,
                numero_ciclo,
                motivo_rechazo_previo
            ) VALUES (
                v_nuevo_id,
                v_nuevo_folio,
                v_ot.nombre_solicitante,
                v_ot.cve_solicitante,
                v_area,
                v_ot.maquina_id,
                'Correctivo',
                '[SEGUIMIENTO CICLO ' || v_nuevo_ciclo || ' DE OT ' || v_ot.folio || '] Motivo rechazo: ' || p_codigo_motivo || ' - ' || COALESCE(p_comentario, 'Sin detalle') || ' | Falla original: ' || COALESCE(v_ot.descripcion, v_ot.falla),
                FALSE,
                COALESCE(v_ot.prioridad, 'Media'),
                'Solicitud recibida',
                v_now,
                v_ot.id_orden,
                COALESCE(v_ot.orden_raiz_id, v_ot.id_orden),
                v_ot.folio,
                v_nuevo_ciclo,
                p_codigo_motivo || ': ' || COALESCE(p_comentario, '')
            );
        EXCEPTION WHEN OTHERS THEN
            RAISE EXCEPTION 'FAILED_NEW_REQUEST: Error al generar nueva solicitud en solicitudes_mantenimiento: %', SQLERRM;
        END;

        -- 5. Crear NUEVA ORDEN en ordenes_trabajo para el nuevo ciclo de atención
        -- NO hereda ciegamente técnico, fechas de cierre ni estatus de la anterior
        BEGIN
            INSERT INTO public.ordenes_trabajo (
                id_orden,
                folio,
                orden_trabajo,
                origen,
                estatus,
                departamento,
                area,
                maquina_id,
                falla,
                descripcion,
                observacion_inicial,
                nombre_solicitante,
                cve_solicitante,
                prioridad,
                orden_origen_id,
                orden_raiz_id,
                folio_origen,
                numero_ciclo,
                fecha_carga
            ) VALUES (
                v_nuevo_id,
                v_nuevo_folio,
                'MC',
                'App',
                'solicitud_recibida',
                v_area,
                v_area,
                v_ot.maquina_id,
                v_ot.falla,
                v_ot.descripcion,
                '[RECHAZO DE ' || v_ot.folio || ' - CICLO ' || v_nuevo_ciclo || '] ' || p_codigo_motivo || ': ' || COALESCE(p_comentario, ''),
                v_ot.nombre_solicitante,
                v_ot.cve_solicitante,
                COALESCE(v_ot.prioridad, 'Media'),
                v_ot.id_orden,
                COALESCE(v_ot.orden_raiz_id, v_ot.id_orden),
                v_ot.folio,
                v_nuevo_ciclo,
                v_now
            );
        EXCEPTION WHEN OTHERS THEN
            RAISE EXCEPTION 'FAILED_NEW_OT: Error al generar nueva orden de seguimiento: %', SQLERRM;
        END;

        -- 6. Auditoría Evento 1: VALIDACION_RECHAZADA sobre OT original
        INSERT INTO public.auditoria_cierre_ot (
            orden_trabajo_id, folio, accion, estado_anterior, estado_nuevo,
            usuario_id, usuario_nombre, rol_usuario, fecha_hora, calificacion,
            codigo_motivo, comentario, numero_ciclo, origen, correlation_id
        ) VALUES (
            v_ot.id_orden, v_ot.folio, 'VALIDACION_RECHAZADA', v_ot.estatus, 'rechazada',
            v_actor.id_usuario, v_actor.nombre_completo, v_actor.rol, v_now, NULL,
            p_codigo_motivo, p_comentario, v_ciclo, 'App', v_corr
        );

        -- 7. Auditoría Evento 2: NUEVA_SOLICITUD_SEGUIMIENTO sobre la nueva OT
        INSERT INTO public.auditoria_cierre_ot (
            orden_trabajo_id, folio, accion, estado_anterior, estado_nuevo,
            usuario_id, usuario_nombre, rol_usuario, fecha_hora, calificacion,
            codigo_motivo, comentario, numero_ciclo, origen, correlation_id
        ) VALUES (
            v_nuevo_id, v_nuevo_folio, 'NUEVA_SOLICITUD_SEGUIMIENTO', 'none', 'solicitud_recibida',
            v_actor.id_usuario, v_actor.nombre_completo, v_actor.rol, v_now, NULL,
            p_codigo_motivo,
            'Nueva solicitud de seguimiento generada por rechazo de orden anterior ' || v_ot.folio || ' (Ciclo ' || v_nuevo_ciclo || ').',
            v_nuevo_ciclo, 'App', v_corr
        );

        RETURN jsonb_build_object(
            'success', true,
            'folio_original', v_ot.folio,
            'estatus_original', 'rechazada',
            'folio_nuevo', v_nuevo_folio,
            'id_nueva_solicitud', v_nuevo_id,
            'numero_ciclo', v_nuevo_ciclo,
            'maquina_id', v_ot.maquina_id,
            'area', v_area,
            'mensaje', 'Orden anterior rechazada y preservada. Se generó exitosamente la nueva solicitud vinculada ' || v_nuevo_folio || ' (Ciclo ' || v_nuevo_ciclo || ').'
        );
    ELSE
        RAISE EXCEPTION 'INVALID_ACTION: Acción no reconocida: %. Solo se admite APROBAR o RECHAZAR.', p_accion;
    END IF;
END;
$$;

-- ============================================================================
-- 7. PERMISOS DE EJECUCIÓN
-- ============================================================================
REVOKE ALL ON FUNCTION public.finalizar_trabajo_tecnico(TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.finalizar_trabajo_tecnico(TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.cerrar_o_rechazar_ot(TEXT, TEXT, INT, TEXT, TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cerrar_o_rechazar_ot(TEXT, TEXT, INT, TEXT, TEXT, UUID) TO authenticated, service_role;
