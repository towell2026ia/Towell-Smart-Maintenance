-- apply_all_multiagent_telemetry_schema.sql
-- TSM-AI Multi-Agent Architecture Complete Telemetry & Governance Schema (v2.0)
-- Execute this script in Supabase SQL Editor to activate telemetry persistence for Quality Gate 1

-- 1. AGENT CATALOG (cat_agentes)
CREATE TABLE IF NOT EXISTS public.cat_agentes (
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

-- Seed all 16 Specialist Agents and 4 Modules
INSERT INTO public.cat_agentes (agent_id, nombre, rama, tipo, requires_ai, provider, default_model, fallback_model, authority_level, activo, version)
VALUES
    ('AG-001', 'Capataz Orquestador', 'ORCHESTRATION', 'AGENTE', true, 'openai', 'gpt-4.1-nano', 'gpt-4.1-mini', 0, true, '2026.08.1'),
    ('AG-002', 'Planificador Preventivo Anual', 'PLANEACION', 'AGENTE', false, 'none', 'deterministic-engine', NULL, 1, true, '2026.08.1'),
    ('AG-003', 'Analista Predictivo Semanal', 'PLANEACION', 'AGENTE', false, 'none', 'deterministic-engine', NULL, 1, true, '2026.08.1'),
    ('AG-004', 'Planificador Autónomo Semanal', 'PLANEACION', 'AGENTE', false, 'none', 'deterministic-engine', NULL, 1, true, '2026.08.1'),
    ('AG-005', 'Auditor de Bases e Integridad', 'DATOS', 'AGENTE', false, 'none', 'deterministic-engine', NULL, 0, true, '2026.08.1'),
    ('AG-006', 'Constructor Dinámico de Formularios', 'DATOS', 'AGENTE', true, 'openai', 'gpt-4o-mini', NULL, 1, true, '2026.08.1'),
    ('AG-007', 'Optimizador de Presupuestos y Costos', 'PLANEACION', 'AGENTE', false, 'none', 'deterministic-engine', NULL, 1, true, '2026.08.1'),
    ('AG-008', 'Detector de Reincidencias y Fallas', 'CONFIABILIDAD', 'AGENTE', false, 'none', 'deterministic-engine', NULL, 1, true, '2026.08.1'),
    ('AG-009', 'Conector de Integración Maestro', 'INTEGRACION', 'AGENTE', false, 'none', 'deterministic-engine', NULL, 2, true, '2026.08.1'),
    ('AG-009.1', 'Conector Preventivo', 'INTEGRACION', 'AGENTE', false, 'none', 'deterministic-engine', NULL, 2, true, '2026.08.1'),
    ('AG-009.2', 'Conector Autónomo', 'INTEGRACION', 'AGENTE', false, 'none', 'deterministic-engine', NULL, 2, true, '2026.08.1'),
    ('AG-009.3', 'Conector Correctivo', 'INTEGRACION', 'AGENTE', false, 'none', 'deterministic-engine', NULL, 2, true, '2026.08.1'),
    ('AG-010', 'Especialista en Diagnóstico y Causa Raíz (5 Porqués)', 'CONFIABILIDAD', 'AGENTE', true, 'mimo', 'mimo-v2.5', NULL, 1, true, '2026.08.1'),
    ('AG-011', 'Memoria Técnica y Lecciones Aprendidas', 'CONFIABILIDAD', 'AGENTE', true, 'openai', 'gpt-4o-mini', NULL, 1, true, '2026.08.1'),
    ('AG-012', 'Evaluador de Ciclo de Vida (3R)', 'CONFIABILIDAD', 'AGENTE', true, 'mimo', 'mimo-v2.5', NULL, 1, true, '2026.08.1'),
    ('AG-013', 'Analista de Malos Actores (Pareto)', 'CONFIABILIDAD', 'AGENTE', true, 'mimo', 'mimo-v2.5', NULL, 1, true, '2026.08.1'),
    ('M-010', 'Módulo de Solicitudes de Mantenimiento', 'ORCHESTRATION', 'MODULO', false, 'none', 'core-module', NULL, 0, true, '2026.08.1'),
    ('M-011', 'Módulo de Asignaciones de Cuadrilla', 'ORCHESTRATION', 'MODULO', false, 'none', 'core-module', NULL, 0, true, '2026.08.1'),
    ('M-012', 'Módulo de Ejecución y Checklists en Campo', 'ORCHESTRATION', 'MODULO', false, 'none', 'core-module', NULL, 0, true, '2026.08.1'),
    ('M-013', 'Módulo de Cierre y Calidad de OT', 'ORCHESTRATION', 'MODULO', false, 'none', 'core-module', NULL, 0, true, '2026.08.1')
ON CONFLICT (agent_id) DO NOTHING;

-- 2. MODEL PRICING CATALOG (cat_tarifas_modelo)
CREATE TABLE IF NOT EXISTS public.cat_tarifas_modelo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider VARCHAR(50) NOT NULL CHECK (provider IN ('openai', 'mimo')),
    model VARCHAR(100) NOT NULL,
    valid_from TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    valid_to TIMESTAMPTZ,
    price_input_usd NUMERIC(15,10) NOT NULL,
    price_output_usd NUMERIC(15,10) NOT NULL,
    price_cached_input_usd NUMERIC(15,10) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD' NOT NULL,
    pricing_version VARCHAR(50) NOT NULL,
    activo BOOLEAN DEFAULT TRUE NOT NULL,
    fecha_creacion TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

INSERT INTO public.cat_tarifas_modelo (provider, model, price_input_usd, price_output_usd, price_cached_input_usd, pricing_version, activo)
VALUES
    ('openai', 'gpt-4.1-nano', 0.00000010, 0.00000040, 0.00000002, '2026-08-A', true),
    ('openai', 'gpt-4.1-mini', 0.00000015, 0.00000060, 0.00000003, '2026-08-A', true),
    ('openai', 'gpt-4o-mini', 0.00000015, 0.00000060, 0.00000003, '2026-08-A', true),
    ('mimo', 'mimo-v2.5', 0.00000014, 0.00000028, 0.000000035, '2026-08-A', true)
ON CONFLICT DO NOTHING;

-- 3. EVENT CATALOG (cat_eventos_agente)
CREATE TABLE IF NOT EXISTS public.cat_eventos_agente (
    event_code VARCHAR(100) PRIMARY KEY,
    nombre_evento VARCHAR(255) NOT NULL,
    agent_id_destino VARCHAR(50) REFERENCES public.cat_agentes(agent_id) ON DELETE RESTRICT,
    es_conocido BOOLEAN NOT NULL,
    secuencia_destinos TEXT[] DEFAULT NULL,
    datos_requeridos JSONB DEFAULT '[]'::JSONB NOT NULL,
    fecha_creacion TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

INSERT INTO public.cat_eventos_agente (event_code, nombre_evento, agent_id_destino, es_conocido, datos_requeridos)
VALUES
    ('PREVENTIVO_GENERAR', 'Generación de programación preventiva anual', 'AG-002', true, '["anio"]'::JSONB),
    ('PREVENTIVO_PRESUPUESTO_CONSULTAR', 'Consulta canónica de presupuesto preventivo de refacciones', 'AG-007', true, '[]'::JSONB),
    ('PREVENTIVE_BUDGET_REQUESTED', 'Consulta de pronóstico de presupuesto preventivo', 'AG-007', true, '[]'::JSONB),
    ('PREDICTIVO_GENERAR', 'Generación de propuestas predictivas semanales', 'AG-003', true, '[]'::JSONB),
    ('EXCEL_SEGUNDAS_CARGADO', 'Carga y persistencia validada de Segundas por Rollo', 'AG-003', true, '[]'::JSONB),
    ('AUTONOMO_GENERAR', 'Generación de propuestas autónomas semanales', 'AG-004', true, '[]'::JSONB),
    ('EXCEL_BASE_CARGADA', 'Carga de archivo Excel base para validación e importación', 'AG-005', true, '["file_path"]'::JSONB),
    ('FORMULARIO_CARGADO', 'Importación de formatos para estructura dinámica', 'AG-006', true, '["form_name"]'::JSONB),
    ('FORMULARIO_VALIDAR', 'Validación de definición de formulario', 'AG-006', true, '["form_code"]'::JSONB),
    ('FAILURE_ANALYSIS_REQUESTED', 'Solicitud de análisis de fallas desde UI', 'AG-008', true, '[]'::JSONB),
    ('AI_RECOMMENDATIONS_REQUESTED', 'Solicitud de recomendaciones contextuales IA desde UI', 'AG-001', true, '[]'::JSONB),
    ('SYSTEM_ALERTS_REQUESTED', 'Consulta de alertas activas del sistema desde UI', 'AG-007', true, '[]'::JSONB),
    ('MACHINE_AI_CONTEXT_REQUESTED', 'Consulta consolidada de snapshot de contexto IA por maquinaria', 'AG-001', true, '["machine_id"]'::JSONB),
    ('AGENTS_METRICS_REQUESTED', 'Consulta de métricas y telemetría de agentes para Centro de Control', 'AG-001', true, '[]'::JSONB),
    ('LEVANTAMIENTO_AUTONOMO_NO_CONFORME', 'Levantamiento autónomo no conforme', 'AG-009.2', true, '["descripcion"]'::JSONB),
    ('LEVANTAMIENTO_PREDICTIVO_NO_CONFORME', 'Levantamiento predictivo no conforme', 'AG-009.3', true, '["descripcion"]'::JSONB),
    ('ANALISIS_CAUSA_RAIZ_SOLICITADO', 'Solicitud de análisis causa raíz', 'AG-010', true, '["maquina_id", "falla_id"]'::JSONB),
    ('MEMORIA_TECNICA_REGISTRAR', 'Registro de memoria técnica de reparación', 'AG-011', true, '["maquina_id", "diagnostico"]'::JSONB),
    ('EVALUACION_CICLO_VIDA', 'Evaluación de reparar, renovar o reemplazar', 'AG-012', true, '["maquina_id"]'::JSONB),
    ('ASSET_INTERVENTION_STRATEGY_REQUESTED', 'Solicitud de evaluación de estrategia de intervención', 'AG-012', true, '["asset_id"]'::JSONB),
    ('BAD_ACTOR_ANALYSIS_REQUESTED', 'Solicitud de análisis Pareto de malos actores', 'AG-013', true, '[]'::JSONB),
    ('PREVENTIVE_SCHEDULE_ITEM', 'Ítem de programación preventiva anual', 'AG-009.1', true, '["machine_id", "service_code", "scheduled_date"]'::JSONB),
    ('AUTONOMOUS_SCHEDULE_ITEM', 'Ítem de rutina autónoma semanal', 'AG-009.2', true, '["machine_id", "week_reference", "scheduled_date"]'::JSONB),
    ('AUTONOMO_EJECUTAR', 'Ejecución de rutina de mantenimiento autónomo', 'AG-009.2', true, '["machine_id", "week_reference", "responses"]'::JSONB),
    ('TEXTO_AMBIGUO', 'Texto libre que requiere interpretación del Capataz (IA)', 'AG-001', false, '["texto"]'::JSONB)
ON CONFLICT (event_code) DO NOTHING;

-- 4. OPERATIONAL EVENTS QUEUE (eventos_agente)
CREATE TABLE IF NOT EXISTS public.eventos_agente (
    id_evento UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id VARCHAR(50) NOT NULL UNIQUE,
    correlation_id VARCHAR(100) NOT NULL,
    idempotency_key VARCHAR(255) NOT NULL UNIQUE,
    event_code VARCHAR(100) REFERENCES public.cat_eventos_agente(event_code) ON DELETE RESTRICT,
    payload JSONB NOT NULL,
    estatus VARCHAR(50) NOT NULL DEFAULT 'PENDIENTE' CHECK (estatus IN ('PENDIENTE', 'EN_PROCESO', 'ENRUTADO', 'COMPLETADO', 'FALLIDO', 'REQUIERE_APROBACION')),
    fecha_creacion TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    fecha_actualizacion TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 5. EXECUTION AND COST AUDIT LOG (bitacora_ejecuciones_agente)
CREATE TABLE IF NOT EXISTS public.bitacora_ejecuciones_agente (
    id_ejecucion UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id VARCHAR(50) NOT NULL UNIQUE,
    parent_execution_id VARCHAR(50) DEFAULT NULL,
    event_id UUID REFERENCES public.eventos_agente(id_evento) ON DELETE CASCADE,
    correlation_id VARCHAR(100) NOT NULL,
    agent_id VARCHAR(50) REFERENCES public.cat_agentes(agent_id) ON DELETE RESTRICT,
    execution_type VARCHAR(50) NOT NULL CHECK (execution_type IN ('ROUTING_RULE', 'AGENT_EXECUTION', 'AI_CLASSIFICATION_NANO', 'AI_CLASSIFICATION_MINI', 'VALIDATION', 'APPROVAL_REQUEST', 'ROUTING_BLOCKED')),
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
    status VARCHAR(50) NOT NULL CHECK (status IN ('SUCCESS', 'FAILED', 'FAILED_RETRYABLE', 'REJECTED_VALIDATOR', 'REQUIRES_HUMAN_ACTION')),
    confidence NUMERIC(3,2),
    reason_code VARCHAR(100) DEFAULT NULL,
    target_agent VARCHAR(50) DEFAULT NULL,
    result JSONB,
    error_message TEXT,
    agent_version VARCHAR(20) DEFAULT NULL,
    prompt_version VARCHAR(20) DEFAULT NULL,
    schema_version VARCHAR(20) DEFAULT NULL,
    validator_version VARCHAR(20) DEFAULT NULL,
    route_version VARCHAR(20) DEFAULT NULL,
    fecha_creacion TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bitacora_correlation ON public.bitacora_ejecuciones_agente (correlation_id);
CREATE INDEX IF NOT EXISTS idx_bitacora_agent ON public.bitacora_ejecuciones_agente (agent_id);
CREATE INDEX IF NOT EXISTS idx_bitacora_started ON public.bitacora_ejecuciones_agente (started_at DESC);

-- 6. MANUAL APPROVALS QUEUE (aprobaciones_agente)
CREATE TABLE IF NOT EXISTS public.aprobaciones_agente (
    id_aprobacion UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    correlation_id VARCHAR(100) NOT NULL,
    execution_id VARCHAR(50) DEFAULT NULL,
    event_id UUID REFERENCES public.eventos_agente(id_evento) ON DELETE CASCADE,
    agent_id VARCHAR(50) REFERENCES public.cat_agentes(agent_id) ON DELETE RESTRICT,
    action_type VARCHAR(100) NOT NULL,
    action_hash VARCHAR(64) NOT NULL,
    canonicalization_version VARCHAR(30) DEFAULT 'CANONICAL_JSON_V1',
    propuesta_payload JSONB DEFAULT NULL,
    payload_snapshot JSONB DEFAULT NULL,
    estatus VARCHAR(50) NOT NULL DEFAULT 'PENDIENTE_APROBACION' CHECK (estatus IN ('PENDIENTE_APROBACION', 'APROBADO', 'RECHAZADO', 'CANCELADO')),
    usuario_aprobador VARCHAR(255),
    motivo_rechazo TEXT,
    fecha_solicitud TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    fecha_resolucion TIMESTAMPTZ,
    fecha_creacion TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_aprobaciones_status ON public.aprobaciones_agente (estatus);

-- 7. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.cat_agentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cat_tarifas_modelo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cat_eventos_agente ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eventos_agente ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bitacora_ejecuciones_agente ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aprobaciones_agente ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read catalogs and audit logs
CREATE POLICY "Permitir lectura cat_agentes" ON public.cat_agentes FOR SELECT USING (true);
CREATE POLICY "Permitir lectura cat_tarifas_modelo" ON public.cat_tarifas_modelo FOR SELECT USING (true);
CREATE POLICY "Permitir lectura cat_eventos_agente" ON public.cat_eventos_agente FOR SELECT USING (true);
CREATE POLICY "Permitir lectura eventos_agente" ON public.eventos_agente FOR SELECT USING (true);
CREATE POLICY "Permitir insercion eventos_agente" ON public.eventos_agente FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir actualizacion eventos_agente" ON public.eventos_agente FOR UPDATE USING (true);
CREATE POLICY "Permitir lectura bitacora_ejecuciones" ON public.bitacora_ejecuciones_agente FOR SELECT USING (true);
CREATE POLICY "Permitir insercion bitacora_ejecuciones" ON public.bitacora_ejecuciones_agente FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir lectura aprobaciones_agente" ON public.aprobaciones_agente FOR SELECT USING (true);
CREATE POLICY "Permitir gestion aprobaciones_agente" ON public.aprobaciones_agente FOR ALL USING (true);
