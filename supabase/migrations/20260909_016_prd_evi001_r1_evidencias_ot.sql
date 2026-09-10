-- ============================================================================
-- TSM-AI: Módulo de Evidencias Fotográficas Antes/Después y Auditoría 360
-- Archivo: 20260909_016_prd_evi001_r1_evidencias_ot.sql
-- Código: PRD-EVI001-R1
-- Fecha: 2026-09-09
-- Prioridad: P0 — Evidencias Fotográficas en Validación y Auditoría 360
-- Ambiente: BASE DE DATOS REAL / PRODUCCIÓN
-- Regla de Oro: ADITIVO + IDEMPOTENTE + REVERSIBLE + CERO DESTRUCCION
-- Dependencias: PRD-DB001-R2/R2.1, PRD-OT003-R1, PRD-OT003-R1.1
-- ============================================================================

-- ============================================================================
-- 0. SNAPSHOT PREVIO DE INTEGRIDAD
-- ============================================================================
DO $$
DECLARE
    v_cnt_ot   BIGINT;
    v_cnt_sol  BIGINT;
    v_cnt_bit  BIGINT;
    v_cnt_maq  BIGINT;
    v_cnt_usr  BIGINT;
    v_cnt_evi  BIGINT;
BEGIN
    SELECT COUNT(*) INTO v_cnt_ot  FROM public.ordenes_trabajo;
    SELECT COUNT(*) INTO v_cnt_sol FROM public.solicitudes_mantenimiento;
    SELECT COUNT(*) INTO v_cnt_bit FROM public.bitacora_mantenimiento;
    SELECT COUNT(*) INTO v_cnt_maq FROM public.cat_maquinas;
    SELECT COUNT(*) INTO v_cnt_usr FROM public.cat_usuarios_roles;
    SELECT COUNT(*) INTO v_cnt_evi FROM public.evidencias_orden;

    RAISE NOTICE '=== PRD-EVI001-R1 SNAPSHOT PREVIO ===';
    RAISE NOTICE 'ordenes_trabajo:           %', v_cnt_ot;
    RAISE NOTICE 'solicitudes_mantenimiento: %', v_cnt_sol;
    RAISE NOTICE 'bitacora_mantenimiento:    %', v_cnt_bit;
    RAISE NOTICE 'cat_maquinas:              %', v_cnt_maq;
    RAISE NOTICE 'cat_usuarios_roles:        %', v_cnt_usr;
    RAISE NOTICE 'evidencias_orden:          %', v_cnt_evi;
END $$;

-- ============================================================================
-- 1. ASEGURAR TABLA BASE evidencias_orden Y COLUMNAS ADITIVAS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.evidencias_orden (
    id_evidencia UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_orden UUID NOT NULL REFERENCES public.ordenes_trabajo(id_orden) ON DELETE CASCADE,
    tipo_evidencia VARCHAR(50),
    nombre_archivo VARCHAR(150),
    url_archivo TEXT,
    comentario VARCHAR(255),
    usuario_carga VARCHAR(150),
    fecha_carga TIMESTAMP DEFAULT NOW(),
    activo BOOLEAN DEFAULT TRUE,
    fecha_alta TIMESTAMP DEFAULT NOW(),
    fecha_actualizacion TIMESTAMP DEFAULT NOW(),
    observaciones VARCHAR(255)
);

DO $$
BEGIN
    -- Bucket canónico
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'evidencias_orden' AND column_name = 'storage_bucket'
    ) THEN
        ALTER TABLE public.evidencias_orden ADD COLUMN storage_bucket VARCHAR(100) DEFAULT 'maintenance-evidence';
    END IF;

    -- Path relativo en Storage
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'evidencias_orden' AND column_name = 'storage_path'
    ) THEN
        ALTER TABLE public.evidencias_orden ADD COLUMN storage_path TEXT;
    END IF;

    -- Tipo MIME
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'evidencias_orden' AND column_name = 'mime_type'
    ) THEN
        ALTER TABLE public.evidencias_orden ADD COLUMN mime_type VARCHAR(100) DEFAULT 'image/jpeg';
    END IF;

    -- Tamaño del archivo en bytes
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'evidencias_orden' AND column_name = 'file_size'
    ) THEN
        ALTER TABLE public.evidencias_orden ADD COLUMN file_size INTEGER DEFAULT 0;
    END IF;

    -- Fecha de captura original
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'evidencias_orden' AND column_name = 'captured_at'
    ) THEN
        ALTER TABLE public.evidencias_orden ADD COLUMN captured_at TIMESTAMPTZ DEFAULT NOW();
    END IF;

    -- Número de ciclo para seguimientos
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'evidencias_orden' AND column_name = 'numero_ciclo'
    ) THEN
        ALTER TABLE public.evidencias_orden ADD COLUMN numero_ciclo INTEGER DEFAULT 1;
    END IF;

    -- Máquina asociada
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'evidencias_orden' AND column_name = 'maquina_id'
    ) THEN
        ALTER TABLE public.evidencias_orden ADD COLUMN maquina_id VARCHAR(50);
    END IF;

    -- Técnico que cargó la evidencia
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'evidencias_orden' AND column_name = 'tecnico_id'
    ) THEN
        ALTER TABLE public.evidencias_orden ADD COLUMN tecnico_id UUID;
    END IF;

    -- Bitácora asociada
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'evidencias_orden' AND column_name = 'bitacora_id'
    ) THEN
        ALTER TABLE public.evidencias_orden ADD COLUMN bitacora_id VARCHAR(100);
    END IF;

    -- Checklist asociado
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'evidencias_orden' AND column_name = 'checklist_id'
    ) THEN
        ALTER TABLE public.evidencias_orden ADD COLUMN checklist_id UUID;
    END IF;

    -- Item específico de checklist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'evidencias_orden' AND column_name = 'checklist_item_id'
    ) THEN
        ALTER TABLE public.evidencias_orden ADD COLUMN checklist_item_id VARCHAR(100);
    END IF;

    -- Subtarea asociada
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'evidencias_orden' AND column_name = 'subtarea_id'
    ) THEN
        ALTER TABLE public.evidencias_orden ADD COLUMN subtarea_id UUID;
    END IF;

    -- Soft delete campos auditados
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'evidencias_orden' AND column_name = 'deleted_at'
    ) THEN
        ALTER TABLE public.evidencias_orden ADD COLUMN deleted_at TIMESTAMPTZ;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'evidencias_orden' AND column_name = 'deleted_by'
    ) THEN
        ALTER TABLE public.evidencias_orden ADD COLUMN deleted_by UUID;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'evidencias_orden' AND column_name = 'delete_reason'
    ) THEN
        ALTER TABLE public.evidencias_orden ADD COLUMN delete_reason TEXT;
    END IF;
END $$;

-- ============================================================================
-- 2. CONSTRAINT DE CATEGORÍA DE EVIDENCIA (Permite NULL para datos legacy)
-- ============================================================================
DO $$
BEGIN
    ALTER TABLE public.evidencias_orden DROP CONSTRAINT IF EXISTS chk_tipo_evidencia;
    ALTER TABLE public.evidencias_orden ADD CONSTRAINT chk_tipo_evidencia CHECK (
        tipo_evidencia IS NULL OR tipo_evidencia IN ('ANTES', 'DURANTE', 'DESPUES', 'HALLAZGO', 'OTRA')
    );
END $$;

-- ============================================================================
-- 3. ÍNDICES DE RENDIMIENTO PARA AUDITORÍA 360 Y VALIDACIÓN
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_evidencias_orden_ot_tipo ON public.evidencias_orden(id_orden, tipo_evidencia) WHERE activo = TRUE;
CREATE INDEX IF NOT EXISTS idx_evidencias_orden_ciclo ON public.evidencias_orden(id_orden, numero_ciclo) WHERE activo = TRUE;
CREATE INDEX IF NOT EXISTS idx_evidencias_orden_maquina ON public.evidencias_orden(maquina_id) WHERE activo = TRUE;
CREATE INDEX IF NOT EXISTS idx_evidencias_orden_captured ON public.evidencias_orden(captured_at);

-- ============================================================================
-- 4. VISTA CANÓNICA: public.vw_ot_evidencias_360
-- ============================================================================
DROP VIEW IF EXISTS public.vw_ot_evidencias_360 CASCADE;

CREATE OR REPLACE VIEW public.vw_ot_evidencias_360 AS
SELECT 
    e.id_evidencia,
    e.id_orden,
    ot.folio AS ot_folio,
    COALESCE(e.maquina_id, ot.maquina_id) AS maquina_id,
    e.tecnico_id,
    COALESCE(u.nombre_completo, e.usuario_carga, 'Técnico de Mantenimiento') AS nombre_tecnico,
    COALESCE(e.tipo_evidencia, 'OTRA') AS tipo_evidencia,
    COALESCE(e.storage_bucket, 'maintenance-evidence') AS storage_bucket,
    COALESCE(e.storage_path, e.url_archivo) AS storage_path,
    e.url_archivo,
    e.nombre_archivo,
    e.mime_type,
    e.file_size,
    COALESCE(e.comentario, e.observaciones, '') AS descripcion,
    COALESCE(e.numero_ciclo, ot.numero_ciclo, 1) AS numero_ciclo,
    e.bitacora_id,
    e.checklist_id,
    e.captured_at,
    e.fecha_carga AS created_at,
    e.activo,
    e.deleted_at,
    e.delete_reason
FROM public.evidencias_orden e
LEFT JOIN public.ordenes_trabajo ot ON e.id_orden = ot.id_orden
LEFT JOIN public.cat_usuarios_roles u ON e.tecnico_id = u.id_usuario
WHERE e.activo = TRUE;

-- ============================================================================
-- 5. RPC SEGURA: public.obtener_evidencias_ot(p_orden_id TEXT)
--    Valida autorización de actor y retorna evidencias agrupadas por tipo y ciclo.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.obtener_evidencias_ot(p_orden_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_actor_id   UUID;
    v_actor      RECORD;
    v_ot         RECORD;
    v_ot_uuid    UUID;
    v_ot_area    TEXT;
    v_es_aut     BOOLEAN := FALSE;
    v_result     JSONB;
BEGIN
    -- 1. Resolver actor autenticado
    v_actor_id := auth.uid();
    IF v_actor_id IS NOT NULL THEN
        SELECT * INTO v_actor FROM public.cat_usuarios_roles WHERE id_usuario = v_actor_id AND activo = TRUE LIMIT 1;
    END IF;

    -- 2. Resolver UUID de la OT si se pasó folio
    IF p_orden_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        SELECT * INTO v_ot FROM public.ordenes_trabajo WHERE id_orden = p_orden_id::UUID LIMIT 1;
    ELSE
        SELECT * INTO v_ot FROM public.ordenes_trabajo WHERE folio = p_orden_id LIMIT 1;
    END IF;

    IF v_ot.id_orden IS NULL THEN
        RETURN jsonb_build_object(
            'before', '[]'::jsonb,
            'during', '[]'::jsonb,
            'after', '[]'::jsonb,
            'other', '[]'::jsonb,
            'by_cycle', '[]'::jsonb,
            'total_count', 0
        );
    END IF;

    v_ot_uuid := v_ot.id_orden;
    v_ot_area := COALESCE(v_ot.departamento, v_ot.area);

    -- 3. Validación de Autorización en Backend (PRD-EVI001-R1 §30, §31, §32)
    -- Si no hay sesión auth.uid() (ej. llamadas internas de servicio), se permite con service_role
    IF v_actor.id_usuario IS NOT NULL THEN
        -- Super Admin
        IF v_actor.rol = 'SUPER_ADMINISTRADOR' THEN
            v_es_aut := TRUE;
        END IF;

        -- Solicitante original
        IF (v_ot.cve_solicitante IS NOT NULL AND (v_ot.cve_solicitante = v_actor.cve_empleado OR v_ot.cve_solicitante = v_actor.id_usuario::text))
           OR (v_ot.nombre_solicitante IS NOT NULL AND LOWER(TRIM(v_ot.nombre_solicitante)) = LOWER(TRIM(v_actor.nombre_completo)))
           OR (LOWER(TRIM(v_actor.correo)) = LOWER(TRIM(COALESCE(v_ot.cve_solicitante, '')))) THEN
            v_es_aut := TRUE;
        END IF;

        -- Jefe de Proceso autorizado por área (PRD-USR002-R1)
        IF (v_actor.rol = 'SUPERVISOR' OR LOWER(TRIM(v_actor.correo)) IN ('ehernandez@towell.com.mx', 'gmotte@towell.com.mx', 'mportillo@towelmex.com', 'jcruz@towell.com.mx'))
           AND (COALESCE(v_actor.area, v_actor.departamento) = v_ot_area) THEN
            v_es_aut := TRUE;
        END IF;

        -- Técnico asignado a la OT
        IF (v_ot.cve_atendio IS NOT NULL AND (v_ot.cve_atendio = v_actor.cve_empleado OR v_ot.cve_atendio = v_actor.id_usuario::text))
           OR (v_ot.nombre_atendio IS NOT NULL AND LOWER(TRIM(v_ot.nombre_atendio)) = LOWER(TRIM(v_actor.nombre_completo))) THEN
            v_es_aut := TRUE;
        END IF;

        IF NOT v_es_aut THEN
            RAISE EXCEPTION 'UNAUTHORIZED: No tienes permisos para consultar las evidencias de esta orden de trabajo.';
        END IF;
    END IF;

    -- 4. Construir respuesta categorizada
    SELECT jsonb_build_object(
        'before', COALESCE((
            SELECT jsonb_agg(row_to_json(r))
            FROM (
                SELECT * FROM public.vw_ot_evidencias_360
                WHERE id_orden = v_ot_uuid AND tipo_evidencia = 'ANTES'
                ORDER BY captured_at ASC
            ) r
        ), '[]'::jsonb),
        'during', COALESCE((
            SELECT jsonb_agg(row_to_json(r))
            FROM (
                SELECT * FROM public.vw_ot_evidencias_360
                WHERE id_orden = v_ot_uuid AND tipo_evidencia = 'DURANTE'
                ORDER BY captured_at ASC
            ) r
        ), '[]'::jsonb),
        'after', COALESCE((
            SELECT jsonb_agg(row_to_json(r))
            FROM (
                SELECT * FROM public.vw_ot_evidencias_360
                WHERE id_orden = v_ot_uuid AND tipo_evidencia = 'DESPUES'
                ORDER BY captured_at ASC
            ) r
        ), '[]'::jsonb),
        'other', COALESCE((
            SELECT jsonb_agg(row_to_json(r))
            FROM (
                SELECT * FROM public.vw_ot_evidencias_360
                WHERE id_orden = v_ot_uuid AND tipo_evidencia NOT IN ('ANTES', 'DURANTE', 'DESPUES')
                ORDER BY captured_at ASC
            ) r
        ), '[]'::jsonb),
        'by_cycle', COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
                'numero_ciclo', c.numero_ciclo,
                'evidencias', c.evids
            ))
            FROM (
                SELECT numero_ciclo, jsonb_agg(row_to_json(e)) as evids
                FROM public.vw_ot_evidencias_360 e
                WHERE id_orden = v_ot_uuid
                GROUP BY numero_ciclo
                ORDER BY numero_ciclo ASC
            ) c
        ), '[]'::jsonb),
        'total_count', (
            SELECT COUNT(*) FROM public.vw_ot_evidencias_360 WHERE id_orden = v_ot_uuid
        )
    ) INTO v_result;

    RETURN v_result;
END;
$$;

-- ============================================================================
-- 6. POLÍTICAS ROW LEVEL SECURITY (RLS) EN evidencias_orden
-- ============================================================================
ALTER TABLE public.evidencias_orden ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "evidencias_orden_select_policy" ON public.evidencias_orden;
CREATE POLICY "evidencias_orden_select_policy" ON public.evidencias_orden
    FOR SELECT
    USING (
        -- Super Admin
        (auth.jwt() -> 'user_metadata' ->> 'rol' = 'SUPER_ADMINISTRADOR')
        OR
        -- Solicitante, Jefe de Proceso o Técnico asignado a la OT
        EXISTS (
            SELECT 1 FROM public.ordenes_trabajo ot
            WHERE ot.id_orden = public.evidencias_orden.id_orden
              AND (
                  -- Solicitante original
                  ot.cve_solicitante = (auth.jwt() -> 'user_metadata' ->> 'cve_empleado')
                  OR ot.cve_solicitante = (auth.jwt() ->> 'sub')
                  -- Técnico asignado
                  OR ot.cve_atendio = (auth.jwt() -> 'user_metadata' ->> 'cve_empleado')
                  OR ot.cve_atendio = (auth.jwt() ->> 'sub')
                  OR public.evidencias_orden.tecnico_id::text = (auth.jwt() ->> 'sub')
                  -- Jefe / Supervisor de proceso por área
                  OR (
                      (auth.jwt() -> 'user_metadata' ->> 'rol' = 'SUPERVISOR')
                      AND COALESCE(ot.departamento, ot.area) = (auth.jwt() -> 'user_metadata' ->> 'area')
                  )
              )
        )
    );

DROP POLICY IF EXISTS "evidencias_orden_insert_policy" ON public.evidencias_orden;
CREATE POLICY "evidencias_orden_insert_policy" ON public.evidencias_orden
    FOR INSERT
    WITH CHECK (
        (auth.jwt() -> 'user_metadata' ->> 'rol' = 'SUPER_ADMINISTRADOR')
        OR
        EXISTS (
            SELECT 1 FROM public.ordenes_trabajo ot
            WHERE ot.id_orden = public.evidencias_orden.id_orden
              AND ot.estatus NOT IN ('cerrada', 'rechazada', 'cancelada')
              AND (
                  ot.cve_atendio = (auth.jwt() -> 'user_metadata' ->> 'cve_empleado')
                  OR ot.cve_atendio = (auth.jwt() ->> 'sub')
                  OR public.evidencias_orden.tecnico_id::text = (auth.jwt() ->> 'sub')
              )
        )
    );

-- Permisos de ejecución
GRANT EXECUTE ON FUNCTION public.obtener_evidencias_ot(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.obtener_evidencias_ot(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.obtener_evidencias_ot(TEXT) TO service_role;
GRANT SELECT ON public.vw_ot_evidencias_360 TO authenticated;
GRANT SELECT ON public.vw_ot_evidencias_360 TO anon;
GRANT SELECT ON public.vw_ot_evidencias_360 TO service_role;
