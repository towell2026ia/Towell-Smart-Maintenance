-- create_multiagent_schema.sql
-- TSM-AI Multi-Agent Architecture Schema Migration (v1.2)

-- Drop dependent tables first if they exist
DROP TABLE IF EXISTS aprobaciones_agente CASCADE;
DROP TABLE IF EXISTS bitacora_ejecuciones_agente CASCADE;
DROP TABLE IF EXISTS eventos_agente CASCADE;
DROP TABLE IF EXISTS cat_eventos_agente CASCADE;
DROP TABLE IF EXISTS cat_tarifas_modelo CASCADE;
DROP TABLE IF EXISTS cat_agentes CASCADE;

-- 1. AGENT REGISTRY (cat_agentes)
CREATE TABLE cat_agentes (
    agent_id VARCHAR(50) PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    rama VARCHAR(50) NOT NULL CHECK (rama IN ('ORCHESTRATION', 'PLANEACION', 'DATOS', 'VIGILANCIA', 'INTEGRACION', 'CONFIABILIDAD')),
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('AGENTE', 'MODULO')),
    requires_ai BOOLEAN NOT NULL,
    provider VARCHAR(50) NOT NULL CHECK (provider IN ('openai', 'mimo', 'none')),
    default_model VARCHAR(100) NOT NULL,
    fallback_model VARCHAR(100),
    authority_level INTEGER NOT NULL CHECK (authority_level BETWEEN 0 AND 3),
    activo BOOLEAN DEFAULT TRUE NOT NULL,
    version VARCHAR(20) NOT NULL,
    fecha_creacion TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. MODEL PRICING CATALOG (cat_tarifas_modelo)
CREATE TABLE cat_tarifas_modelo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider VARCHAR(50) NOT NULL CHECK (provider IN ('openai', 'mimo')),
    model VARCHAR(100) NOT NULL,
    valid_from TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    valid_to TIMESTAMPTZ,
    price_input_usd NUMERIC(15,10) NOT NULL,        -- price per single token
    price_output_usd NUMERIC(15,10) NOT NULL,       -- price per single token
    price_cached_input_usd NUMERIC(15,10) NOT NULL,  -- price per single token
    currency VARCHAR(10) DEFAULT 'USD' NOT NULL,
    pricing_version VARCHAR(50) NOT NULL,
    activo BOOLEAN DEFAULT TRUE NOT NULL,
    fecha_creacion TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. EVENT CATALOG (cat_eventos_agente)
CREATE TABLE cat_eventos_agente (
    event_code VARCHAR(100) PRIMARY KEY,
    nombre_evento VARCHAR(255) NOT NULL,
    agent_id_destino VARCHAR(50) REFERENCES cat_agentes(agent_id) ON DELETE RESTRICT,
    es_conocido BOOLEAN NOT NULL, -- True = deterministic rule, False = AI routing
    datos_requeridos JSONB DEFAULT '[]'::JSONB NOT NULL,
    fecha_creacion TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 4. OPERATIONAL EVENTS QUEUE (eventos_agente)
CREATE TABLE eventos_agente (
    id_evento UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id VARCHAR(50) NOT NULL UNIQUE,
    correlation_id VARCHAR(100) NOT NULL,
    idempotency_key VARCHAR(255) NOT NULL UNIQUE,
    event_code VARCHAR(100) REFERENCES cat_eventos_agente(event_code) ON DELETE RESTRICT,
    payload JSONB NOT NULL,
    estatus VARCHAR(50) NOT NULL DEFAULT 'PENDIENTE' CHECK (estatus IN ('PENDIENTE', 'EN_PROCESO', 'ENRUTADO', 'COMPLETADO', 'FALLIDO', 'REQUIERE_APROBACION')),
    fecha_creacion TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    fecha_actualizacion TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 5. EXECUTION AND COST AUDIT LOG (bitacora_ejecuciones_agente)
CREATE TABLE bitacora_ejecuciones_agente (
    id_ejecucion UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id VARCHAR(50) NOT NULL UNIQUE,
    event_id UUID REFERENCES eventos_agente(id_evento) ON DELETE CASCADE,
    correlation_id VARCHAR(100) NOT NULL,
    agent_id VARCHAR(50) REFERENCES cat_agentes(agent_id) ON DELETE RESTRICT,
    execution_type VARCHAR(50) NOT NULL CHECK (execution_type IN ('ROUTING_RULE', 'AGENT_EXECUTION')),
    provider VARCHAR(50),
    model VARCHAR(100),
    key_alias VARCHAR(100),
    started_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ NOT NULL,
    duration_ms INTEGER NOT NULL,
    input_tokens INTEGER DEFAULT 0 NOT NULL,
    output_tokens INTEGER DEFAULT 0 NOT NULL,
    cached_input_tokens INTEGER DEFAULT 0 NOT NULL,
    reasoning_tokens INTEGER DEFAULT 0 NOT NULL,
    price_input_usd NUMERIC(15,10) DEFAULT 0 NOT NULL,
    price_output_usd NUMERIC(15,10) DEFAULT 0 NOT NULL,
    price_cache_usd NUMERIC(15,10) DEFAULT 0 NOT NULL,
    pricing_version VARCHAR(50) NOT NULL,
    estimated_cost_usd NUMERIC(15,10) DEFAULT 0 NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('SUCCESS', 'FAILED', 'FAILED_RETRYABLE', 'REJECTED_VALIDATOR')),
    confidence NUMERIC(3,2),
    result JSONB,
    error_message TEXT,
    fecha_creacion TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 6. MANUAL APPROVALS QUEUE (aprobaciones_agente)
CREATE TABLE aprobaciones_agente (
    id_aprobacion UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    correlation_id VARCHAR(100) NOT NULL,
    event_id UUID REFERENCES eventos_agente(id_evento) ON DELETE RESTRICT,
    agent_id VARCHAR(50) REFERENCES cat_agentes(agent_id) ON DELETE RESTRICT,
    tipo_accion VARCHAR(100) NOT NULL,
    propuesta_payload JSONB NOT NULL,
    estatus VARCHAR(50) NOT NULL DEFAULT 'PENDIENTE_APROBACION' CHECK (estatus IN ('PENDIENTE_APROBACION', 'APROBADO', 'RECHAZADO')),
    aprobado_por VARCHAR(255),
    fecha_respuesta TIMESTAMPTZ,
    comentarios TEXT,
    fecha_creacion TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 7. INDEXES FOR SPEED AND IDEMPOTENCY
CREATE INDEX idx_eventos_correlation ON eventos_agente(correlation_id);
CREATE INDEX idx_eventos_status ON eventos_agente(estatus);
CREATE INDEX idx_ejecuciones_correlation ON bitacora_ejecuciones_agente(correlation_id);
CREATE INDEX idx_ejecuciones_agent ON bitacora_ejecuciones_agente(agent_id);
CREATE INDEX idx_aprobaciones_correlation ON aprobaciones_agente(correlation_id);
CREATE INDEX idx_aprobaciones_status ON aprobaciones_agente(estatus);

-- 8. SEED DATA - 20 REGISTERS IN cat_agentes
INSERT INTO cat_agentes (agent_id, nombre, rama, tipo, requires_ai, provider, default_model, fallback_model, authority_level, activo, version) VALUES
('AG-001', 'Capataz Orquestador', 'ORCHESTRATION', 'AGENTE', true, 'openai', 'gpt-4.1-nano', 'gpt-4.1-mini', 1, true, '1.1'),
('AG-002', 'Preventivo Anual', 'PLANEACION', 'AGENTE', true, 'mimo', 'mimo-v2.5', NULL, 2, true, '1.0'),
('AG-003', 'Predictivo Mensual', 'PLANEACION', 'AGENTE', true, 'mimo', 'mimo-v2.5', NULL, 2, true, '1.0'),
('AG-004', 'Autónomo Semanal', 'PLANEACION', 'AGENTE', true, 'mimo', 'mimo-v2.5', NULL, 2, true, '1.0'),
('AG-005', 'Auditor de Bases', 'DATOS', 'AGENTE', false, 'none', 'none', NULL, 1, false, '1.0'),
('AG-006', 'Constructor de Formularios', 'DATOS', 'AGENTE', true, 'openai', 'gpt-4.1-mini', NULL, 2, false, '1.0'),
('AG-007', 'Presupuestos y Costos', 'VIGILANCIA', 'AGENTE', true, 'mimo', 'mimo-v2.5', NULL, 1, false, '1.0'),
('AG-008', 'Fallas, Tendencias y Reincidencias', 'VIGILANCIA', 'AGENTE', true, 'mimo', 'mimo-v2.5', NULL, 1, false, '1.0'),
('AG-009', 'Gestor Formularios-Solicitudes-OT', 'INTEGRACION', 'AGENTE', false, 'none', 'none', NULL, 2, true, '1.0'),
('AG-009.1', 'Conector Preventivo', 'INTEGRACION', 'SUBAGENTE', false, 'none', 'none', NULL, 2, true, '1.0'),
('AG-009.2', 'Conector Autónomo', 'INTEGRACION', 'SUBAGENTE', false, 'none', 'none', NULL, 2, true, '1.0'),
('AG-009.3', 'Conector Correctivo', 'INTEGRACION', 'SUBAGENTE', false, 'none', 'none', NULL, 2, true, '1.0'),
('M-010', 'Expediente Único del Activo', 'CONFIABILIDAD', 'MODULO', false, 'none', 'none', NULL, 0, false, '1.0'),
('M-011', 'Índice de Salud y Riesgo', 'CONFIABILIDAD', 'MODULO', false, 'none', 'none', NULL, 0, false, '1.0'),
('AG-010', 'Cinco Porqués y Casos Anteriores', 'CONFIABILIDAD', 'AGENTE', true, 'mimo', 'mimo-v2.5', NULL, 1, false, '1.0'),
('AG-011', 'Memoria Técnica', 'CONFIABILIDAD', 'AGENTE', true, 'openai', 'gpt-4.1-mini', NULL, 2, false, '1.0'),
('M-012', 'Preparación de OT', 'CONFIABILIDAD', 'MODULO', false, 'none', 'none', NULL, 2, false, '1.0'),
('M-013', 'Control de Seguridad', 'CONFIABILIDAD', 'MODULO', false, 'none', 'none', NULL, 2, false, '1.0'),
('AG-012', 'Reparar / Renovar / Reemplazar', 'CONFIABILIDAD', 'AGENTE', true, 'mimo', 'mimo-v2.5', NULL, 2, false, '1.0'),
('AG-013', 'Analista de Malos Actores', 'CONFIABILIDAD', 'AGENTE', true, 'mimo', 'mimo-v2.5', NULL, 1, false, '1.0');

-- 9. SEED DATA - MODEL RATES (cat_tarifas_modelo)
-- Rates are stored in decimal fraction of USD per token (Rate Per Million / 1,000,000)
INSERT INTO cat_tarifas_modelo (provider, model, price_input_usd, price_output_usd, price_cached_input_usd, pricing_version, activo) VALUES
('openai', 'gpt-4.1-nano', 0.00000015, 0.00000060, 0.00000003, '2026-08-A', true),
('openai', 'gpt-4.1-mini', 0.00000015, 0.00000060, 0.00000003, '2026-08-A', true),
('mimo', 'mimo-v2.5', 0.00000014, 0.00000028, 0.0000000028, '2026-08-A', true);

-- 10. SEED DATA - EVENT CATALOG (cat_eventos_agente)
INSERT INTO cat_eventos_agente (event_code, nombre_evento, agent_id_destino, es_conocido, datos_requeridos) VALUES
('PREVENTIVO_GENERAR', 'Generación de órdenes preventivas anuales', 'AG-002', true, '["maquina_id", "anio", "tipo_mantenimiento"]'::JSONB),
('PREDICTIVO_GENERAR', 'Generación de rutas predictivas', 'AG-003', true, '["maquina_id", "mes"]'::JSONB),
('AUTONOMO_GENERAR', 'Generación de checklists autónomos semanales', 'AG-004', true, '["maquina_id", "semana"]'::JSONB),
('EXCEL_BASE_CARGADA', 'Carga de datos crudos para auditoría', 'AG-005', true, '["file_path"]'::JSONB),
('EXCEL_FORMULARIO_CARGADO', 'Importación de formatos para estructura dinámica', 'AG-006', true, '["form_name", "fields"]'::JSONB),
('DESVIACION_PRESUPUESTO', 'Detección de gasto mayor al presupuesto', 'AG-007', true, '["maquina_id", "monto_desviado"]'::JSONB),
('FALLA_REINCIDENTE', 'Detección de reincidencias recurrentes', 'AG-008', true, '["maquina_id", "falla_descripcion"]'::JSONB),
('TENDENCIA_FALLAS', 'Análisis de comportamiento y tendencias', 'AG-008', true, '["intervalo_dias"]'::JSONB),
('FALLA_REPORTADA', 'Correctivo directo proveniente de operador', 'AG-009.3', true, '["maquina_id", "falla_descripcion"]'::JSONB),
('SOLICITUD_CORRECTIVA', 'Solicitud correctiva formal', 'AG-009.3', true, '["solicitud_id"]'::JSONB),
('LEVANTAMIENTO_NO_CONFORME', 'Auditoría o levantamiento no conforme', 'AG-009', true, '["descripcion"]'::JSONB),
('OT_CERRADA', 'Cierre y consolidación del activo', 'M-010', true, '["folio_ot"]'::JSONB),
('FALLA_POST_CIERRE', 'Reporte de falla a los pocos días del cierre', 'AG-008', true, '["folio_ot", "nueva_falla"]'::JSONB),
('TOP_CRITICO_ACTUALIZADO', 'Actualización de salud y criticidad', 'M-011', true, '["maquina_id"]'::JSONB),
('TEXTO_AMBIGUO', 'Texto libre que requiere interpretación del Capataz', 'AG-001', false, '["texto"]'::JSONB);

-- 11. ENABLE SECURITY: ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE cat_agentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE cat_tarifas_modelo ENABLE ROW LEVEL SECURITY;
ALTER TABLE cat_eventos_agente ENABLE ROW LEVEL SECURITY;
ALTER TABLE eventos_agente ENABLE ROW LEVEL SECURITY;
ALTER TABLE bitacora_ejecuciones_agente ENABLE ROW LEVEL SECURITY;
ALTER TABLE aprobaciones_agente ENABLE ROW LEVEL SECURITY;

-- 12. POLICIES (Super Admins, Admins, and service_role can access everything)
CREATE POLICY "Acceso total para administradores en cat_agentes" 
ON cat_agentes FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Acceso total para administradores en cat_tarifas_modelo" 
ON cat_tarifas_modelo FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Acceso total para administradores en cat_eventos_agente" 
ON cat_eventos_agente FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Acceso total para administradores en eventos_agente" 
ON eventos_agente FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Acceso total para administradores en bitacora_ejecuciones_agente" 
ON bitacora_ejecuciones_agente FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Acceso total para administradores en aprobaciones_agente" 
ON aprobaciones_agente FOR ALL TO authenticated USING (true) WITH CHECK (true);
