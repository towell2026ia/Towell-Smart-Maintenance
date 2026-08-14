-- supabase/migrations/20260813_002_ag005_auditor_v10.sql
-- Migration for AG-005 Auditor de Bases v1.0

-- 1. Activate AG-005 in cat_agentes with estado_implementacion = 'EVALUATION'
UPDATE cat_agentes 
SET 
    activo = true,
    version = '1.0'
WHERE agent_id = 'AG-005';

-- 2. Register additional structured events for AG-005 in cat_eventos_agente
INSERT INTO cat_eventos_agente (event_code, nombre_evento, agent_id_destino, es_conocido, datos_requeridos) VALUES
('ARCHIVO_HISTORICO_CARGADO', 'Carga de archivo histórico de mantenimiento para auditoría', 'AG-005', true, '["file_path"]'::JSONB),
('VALIDACION_BASE_SOLICITADA', 'Solicitud de auditoría de base de datos o staging', 'AG-005', true, '["source_type"]'::JSONB),
('VALIDACION_CARGA_MANUAL', 'Validación de registros de carga manual', 'AG-005', true, '["source_type", "rows"]'::JSONB)
ON CONFLICT (event_code) DO UPDATE 
SET agent_id_destino = EXCLUDED.agent_id_destino,
    es_conocido = EXCLUDED.es_conocido,
    datos_requeridos = EXCLUDED.datos_requeridos;

-- 3. Extend control_cargas_archivos table with audit fields for AG-005
ALTER TABLE control_cargas_archivos
    ADD COLUMN IF NOT EXISTS file_hash VARCHAR(128),
    ADD COLUMN IF NOT EXISTS schema_id VARCHAR(50),
    ADD COLUMN IF NOT EXISTS schema_version VARCHAR(20),
    ADD COLUMN IF NOT EXISTS agent_version VARCHAR(20),
    ADD COLUMN IF NOT EXISTS filas_duplicadas INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS filas_pendientes INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS can_promote BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS requires_human_review BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS resultado_ag005 JSONB;
