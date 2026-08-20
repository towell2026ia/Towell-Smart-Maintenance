-- supabase/migrations/20260820_005_ag008_promotion_v10.sql
-- Migration & Official Promotion for AG-008 Fallas, Tendencias, Reincidencias y Estacionalidad v1.0 (§165-171 PRD-AG-008.4)
-- Freeze Master Token: AG008-1.0-FROZEN

-- 1. Register / Promote AG-008 in cat_agentes
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cat_agentes') THEN
        INSERT INTO cat_agentes (agent_id, nombre, rama, tipo, requires_ai, provider, default_model, default_temperature, authority_level, activo, estado_implementacion, version)
        VALUES ('AG-008', 'Fallas, Tendencias, Reincidencias y Estacionalidad', 'ALERTAS', 'AGENTE', true, 'mimo', 'mimo-v2.5', 0.1, 2, true, 'READY', '1.0')
        ON CONFLICT (agent_id) DO UPDATE
        SET nombre = 'Fallas, Tendencias, Reincidencias y Estacionalidad',
            rama = 'ALERTAS',
            tipo = 'AGENTE',
            requires_ai = true,
            provider = 'mimo',
            default_model = 'mimo-v2.5',
            default_temperature = 0.1,
            authority_level = 2,
            activo = true,
            estado_implementacion = 'READY',
            version = '1.0',
            updated_at = NOW();
    END IF;
END $$;

-- 2. Register AG-008 Canonical Events in cat_eventos_agente
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cat_eventos_agente') THEN
        INSERT INTO cat_eventos_agente (event_code, nombre_evento, agent_id_destino, es_conocido, datos_requeridos)
        VALUES
        ('FAILURE_ANALYSIS_REQUESTED', 'Solicitud canónica de análisis de fallas y tendencias', 'AG-008', true, '["scope", "target_id", "granularity", "raw_records"]'::JSONB),
        ('SYSTEM_ALERTS_REQUESTED', 'Solicitud de evaluación de alertas técnicas del sistema', 'AG-008', true, '["scope", "target_id", "granularity", "raw_records"]'::JSONB),
        ('FAILURE_SIGNAL_DETECTED', 'Señal de falla detectada por motor analítico', 'AG-008', true, '["signal_id", "signal_type", "scope", "target_id"]'::JSONB),
        ('FAILURE_RECURRENCE_ALERT', 'Alerta determinística de falla recurrente en equipo', 'AG-008', true, '["machine_id", "normalized_failure", "occurrence_count"]'::JSONB),
        ('FAILURE_REINCIDENCE_ALERT', 'Alerta determinística de reincidencia técnica post-reparación', 'AG-008', true, '["machine_id", "normalized_failure", "days_after_closure", "repair_reference"]'::JSONB),
        ('FAILURE_TREND_UP_ALERT', 'Alerta determinística de tendencia ascendente de fallas', 'AG-008', true, '["scope", "target_id", "trend_percentage"]'::JSONB),
        ('CROSS_MACHINE_PATTERN_ALERT', 'Alerta de patrón transversal de fallas en múltiples máquinas', 'AG-008', true, '["normalized_failure", "distinct_machines_count", "machine_ids"]'::JSONB),
        ('DATA_QUALITY_ALERT', 'Alerta de limitación de calidad o registros no atribuidos', 'AG-008', true, '["warnings", "unattributed_count"]'::JSONB)
        ON CONFLICT (event_code) DO UPDATE
        SET agent_id_destino = EXCLUDED.agent_id_destino,
            es_conocido = EXCLUDED.es_conocido,
            datos_requeridos = EXCLUDED.datos_requeridos;
    END IF;
END $$;
