-- supabase/migrations/20260822_008_ag012_promotion_v10.sql
-- Migration & Official Production Promotion for AG-012 Reparar, Renovar o Reemplazar v1.0 (§142-146 PRD-AG-012.4)
-- Freeze Master Token: AG012-1.0-FROZEN

-- 1. Register / Promote AG-012 in cat_agentes
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cat_agentes') THEN
        INSERT INTO cat_agentes (agent_id, nombre, rama, tipo, requires_ai, provider, default_model, default_temperature, authority_level, activo, estado_implementacion, version)
        VALUES ('AG-012', 'Reparar, Renovar o Reemplazar', 'CONFIABILIDAD', 'AGENTE', true, 'mimo', 'mimo-v2.5', 0.1, 2, true, 'READY', '1.0')
        ON CONFLICT (agent_id) DO UPDATE
        SET nombre = 'Reparar, Renovar o Reemplazar',
            rama = 'CONFIABILIDAD',
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

-- 2. Register AG-012 Canonical Event in cat_eventos_agente
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cat_eventos_agente') THEN
        INSERT INTO cat_eventos_agente (event_code, nombre_evento, agent_id_destino, es_conocido, datos_requeridos)
        VALUES
        ('ASSET_INTERVENTION_STRATEGY_REQUESTED', 'Solicitud de evaluación de estrategia de intervención (reparar, renovar o reemplazar)', 'AG-012', true, '["asset_id"]'::JSONB),
        ('EVALUACION_CICLO_VIDA', 'Evaluación de reparar, renovar o reemplazar', 'AG-012', true, '["maquina_id"]'::JSONB)
        ON CONFLICT (event_code) DO UPDATE
        SET agent_id_destino = EXCLUDED.agent_id_destino,
            es_conocido = EXCLUDED.es_conocido,
            datos_requeridos = EXCLUDED.datos_requeridos;
    END IF;
END $$;
