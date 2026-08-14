-- supabase/migrations/20260813_003_ag006_formularios_v10.sql
-- Migration for AG-006 Constructor de Formularios v1.0

-- 1. Register AG-006 events in cat_eventos_agente
INSERT INTO cat_eventos_agente (event_code, nombre_evento, agent_id_destino, es_conocido, datos_requeridos) VALUES
('FORMULARIO_CARGADO', 'Importación de formatos para estructura dinámica', 'AG-006', true, '["form_name"]'::JSONB),
('EXCEL_FORMULARIO_CARGADO', 'Carga de plantilla Excel de formulario', 'AG-006', true, '["form_name"]'::JSONB),
('FORMULARIO_VALIDAR', 'Validación de definición de formulario', 'AG-006', true, '["form_code"]'::JSONB),
('FORMULARIO_PREVIEW_GENERAR', 'Generación de vista previa de borrador', 'AG-006', true, '["draft_id"]'::JSONB),
('FORMULARIO_PUBLICACION_SOLICITADA', 'Solicitud de publicación gobernada de formulario', 'AG-006', true, '["draft_id"]'::JSONB)
ON CONFLICT (event_code) DO UPDATE 
SET agent_id_destino = EXCLUDED.agent_id_destino,
    es_conocido = EXCLUDED.es_conocido,
    datos_requeridos = EXCLUDED.datos_requeridos;

-- 2. Set AG-006 state to TRAINING in cat_agentes
UPDATE cat_agentes 
SET 
    activo = true,
    version = '1.0'
WHERE agent_id = 'AG-006';

-- 3. Create Draft Forms Storage Table for Human Review & Preview
CREATE TABLE IF NOT EXISTS borradores_formularios (
    id_borrador UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_formulario VARCHAR(50) NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    tipo_formulario VARCHAR(50) NOT NULL,
    estado VARCHAR(30) DEFAULT 'DRAFT' NOT NULL CHECK (estado IN ('DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED', 'SUPERSEDED', 'ARCHIVED')),
    schema_version VARCHAR(30) DEFAULT 'FORM-DEFINITION-001' NOT NULL,
    definicion_json JSONB NOT NULL,
    archivo_origen_hash VARCHAR(128),
    creado_por VARCHAR(150),
    fecha_creacion TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    fecha_actualizacion TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
