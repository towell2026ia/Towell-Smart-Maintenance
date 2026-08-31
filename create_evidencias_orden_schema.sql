-- ============================================================================
-- TSM-AI: Módulo de Evidencias Fotográficas Antes / Después
-- Archivo: create_evidencias_orden_schema.sql
-- Descripción: Extensión no destructiva de public.evidencias_orden, índices,
--              vista de Auditoría 360°, RPC de expediente y políticas RLS.
-- ============================================================================

-- 1. Asegurar tabla base evidencias_orden
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

-- 2. Extender columnas de trazabilidad y Storage
ALTER TABLE public.evidencias_orden
    ADD COLUMN IF NOT EXISTS maquina_id VARCHAR(50) REFERENCES public.cat_maquinas(equipo_towell) ON UPDATE CASCADE ON DELETE RESTRICT,
    ADD COLUMN IF NOT EXISTS tecnico_id UUID REFERENCES public.cat_usuarios_roles(id_usuario) ON UPDATE CASCADE ON DELETE RESTRICT,
    ADD COLUMN IF NOT EXISTS bitacora_id VARCHAR(100),
    ADD COLUMN IF NOT EXISTS checklist_id UUID,
    ADD COLUMN IF NOT EXISTS checklist_item_id VARCHAR(100),
    ADD COLUMN IF NOT EXISTS storage_bucket VARCHAR(100) DEFAULT 'maintenance-evidence',
    ADD COLUMN IF NOT EXISTS storage_path TEXT,
    ADD COLUMN IF NOT EXISTS mime_type VARCHAR(100) DEFAULT 'image/jpeg',
    ADD COLUMN IF NOT EXISTS file_size INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS captured_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS client_request_id UUID,
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.cat_usuarios_roles(id_usuario),
    ADD COLUMN IF NOT EXISTS delete_reason TEXT;

-- 3. Constraint estricto para tipo_evidencia (permite NULL para legacy)
ALTER TABLE public.evidencias_orden
    DROP CONSTRAINT IF EXISTS chk_tipo_evidencia;

ALTER TABLE public.evidencias_orden
    ADD CONSTRAINT chk_tipo_evidencia CHECK (
        tipo_evidencia IS NULL
        OR tipo_evidencia IN (
            'ANTES',
            'DESPUES'
        )
    );

-- 4. Índices para consultas y Auditoría 360°
CREATE INDEX IF NOT EXISTS idx_evidencias_orden_ot_tipo ON public.evidencias_orden(id_orden, tipo_evidencia) WHERE activo = TRUE;
CREATE INDEX IF NOT EXISTS idx_evidencias_orden_maquina ON public.evidencias_orden(maquina_id) WHERE activo = TRUE;
CREATE INDEX IF NOT EXISTS idx_evidencias_orden_tecnico ON public.evidencias_orden(tecnico_id) WHERE activo = TRUE;
CREATE INDEX IF NOT EXISTS idx_evidencias_orden_captured_at ON public.evidencias_orden(captured_at);
CREATE INDEX IF NOT EXISTS idx_evidencias_orden_client_request ON public.evidencias_orden(client_request_id);

-- 5. Vista segura para Auditoría 360° (public.vw_ot_evidencias_360)
DROP VIEW IF EXISTS public.vw_ot_evidencias_360 CASCADE;

CREATE OR REPLACE VIEW public.vw_ot_evidencias_360 AS
SELECT 
    e.id_evidencia,
    e.id_orden,
    ot.folio AS ot_folio,
    COALESCE(e.maquina_id, ot.maquina_id) AS maquina_id,
    e.tecnico_id,
    COALESCE(u.nombre_completo, e.usuario_carga, 'Técnico de Mantenimiento') AS nombre_tecnico,
    e.tipo_evidencia,
    e.storage_bucket,
    e.storage_path,
    e.nombre_archivo,
    e.mime_type,
    e.file_size,
    COALESCE(e.comentario, e.observaciones, '') AS descripcion,
    e.bitacora_id,
    e.checklist_id,
    e.checklist_item_id,
    e.captured_at,
    e.fecha_carga AS created_at,
    e.activo,
    e.deleted_at,
    e.delete_reason
FROM public.evidencias_orden e
LEFT JOIN public.ordenes_trabajo ot ON e.id_orden = ot.id_orden
LEFT JOIN public.cat_usuarios_roles u ON e.tecnico_id = u.id_usuario
WHERE e.activo = TRUE;

-- 6. Función RPC estructurada para consulta de expediente 360°
CREATE OR REPLACE FUNCTION public.get_ot_photographic_evidence(p_ot_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_ot_uuid UUID;
    v_result JSONB;
BEGIN
    -- 1. Resolver UUID de la OT si se pasó folio
    IF p_ot_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        v_ot_uuid := p_ot_id::UUID;
    ELSE
        SELECT id_orden INTO v_ot_uuid FROM public.ordenes_trabajo WHERE folio = p_ot_id LIMIT 1;
    END IF;

    IF v_ot_uuid IS NULL THEN
        RETURN jsonb_build_object(
            'before', '[]'::jsonb,
            'during', '[]'::jsonb,
            'findings', '[]'::jsonb,
            'after', '[]'::jsonb,
            'timeline', '[]'::jsonb,
            'total_count', 0
        );
    END IF;

    -- 2. Construir objeto consolidado
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
        'findings', COALESCE((
            SELECT jsonb_agg(row_to_json(r))
            FROM (
                SELECT * FROM public.vw_ot_evidencias_360
                WHERE id_orden = v_ot_uuid AND tipo_evidencia = 'HALLAZGO'
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
        'timeline', COALESCE((
            SELECT jsonb_agg(row_to_json(r))
            FROM (
                SELECT * FROM public.vw_ot_evidencias_360
                WHERE id_orden = v_ot_uuid
                ORDER BY captured_at ASC
            ) r
        ), '[]'::jsonb),
        'total_count', (
            SELECT COUNT(*) FROM public.vw_ot_evidencias_360 WHERE id_orden = v_ot_uuid
        )
    ) INTO v_result;

    RETURN v_result;
END;
$$;

-- 7. Configuración de RLS para evidencias_orden
ALTER TABLE public.evidencias_orden ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "evidencias_orden_select_policy" ON public.evidencias_orden;
CREATE POLICY "evidencias_orden_select_policy" ON public.evidencias_orden
    FOR SELECT
    USING (
        -- Super Admin / Admin tiene acceso universal
        (auth.jwt() -> 'user_metadata' ->> 'rol' IN ('SUPER_ADMINISTRADOR', 'ADMINISTRADOR'))
        OR
        -- Técnico asignado a la OT
        EXISTS (
            SELECT 1 FROM public.ordenes_trabajo ot
            WHERE ot.id_orden = public.evidencias_orden.id_orden
              AND (
                  ot.cve_atendio = (auth.jwt() -> 'user_metadata' ->> 'cve_tecnico')
                  OR ot.cve_atendio = (auth.jwt() ->> 'sub')
                  OR public.evidencias_orden.tecnico_id::text = (auth.jwt() ->> 'sub')
              )
        )
    );

DROP POLICY IF EXISTS "evidencias_orden_insert_policy" ON public.evidencias_orden;
CREATE POLICY "evidencias_orden_insert_policy" ON public.evidencias_orden
    FOR INSERT
    WITH CHECK (
        -- Super Admin / Admin
        (auth.jwt() -> 'user_metadata' ->> 'rol' IN ('SUPER_ADMINISTRADOR', 'ADMINISTRADOR'))
        OR
        -- Técnico asignado a la OT con OT en estado editable
        EXISTS (
            SELECT 1 FROM public.ordenes_trabajo ot
            WHERE ot.id_orden = public.evidencias_orden.id_orden
              AND ot.estatus NOT IN ('Cerrada', 'Cancelada', 'Validada')
              AND (
                  ot.cve_atendio = (auth.jwt() -> 'user_metadata' ->> 'cve_tecnico')
                  OR ot.cve_atendio = (auth.jwt() ->> 'sub')
                  OR public.evidencias_orden.tecnico_id::text = (auth.jwt() ->> 'sub')
              )
        )
    );

DROP POLICY IF EXISTS "evidencias_orden_update_policy" ON public.evidencias_orden;
CREATE POLICY "evidencias_orden_update_policy" ON public.evidencias_orden
    FOR UPDATE
    USING (
        -- Solo Admin o Técnico mientras la OT esté abierta
        (auth.jwt() -> 'user_metadata' ->> 'rol' IN ('SUPER_ADMINISTRADOR', 'ADMINISTRADOR'))
        OR
        (
            EXISTS (
                SELECT 1 FROM public.ordenes_trabajo ot
                WHERE ot.id_orden = public.evidencias_orden.id_orden
                  AND ot.estatus NOT IN ('Cerrada', 'Cancelada', 'Validada')
                  AND public.evidencias_orden.tecnico_id::text = (auth.jwt() ->> 'sub')
            )
        )
    );
