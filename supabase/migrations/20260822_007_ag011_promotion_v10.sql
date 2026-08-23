-- supabase/migrations/20260822_007_ag011_promotion_v10.sql
-- Migration & Official Promotion for AG-011 Memoria Técnica y Lecciones Aprendidas v1.0 (§151-155 PRD-AG-011.4)
-- Freeze Master Token: AG011-1.0-FROZEN

-- 1. Register / Promote AG-011 in cat_agentes
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cat_agentes') THEN
        INSERT INTO cat_agentes (agent_id, nombre, rama, tipo, requires_ai, provider, default_model, default_temperature, authority_level, activo, estado_implementacion, version)
        VALUES ('AG-011', 'Memoria Técnica y Lecciones Aprendidas', 'CONFIABILIDAD', 'AGENTE', true, 'openai', 'gpt-4o-mini', 0.1, 2, true, 'READY', '1.0')
        ON CONFLICT (agent_id) DO UPDATE
        SET nombre = 'Memoria Técnica y Lecciones Aprendidas',
            rama = 'CONFIABILIDAD',
            tipo = 'AGENTE',
            requires_ai = true,
            provider = 'openai',
            default_model = 'gpt-4o-mini',
            default_temperature = 0.1,
            authority_level = 2,
            activo = true,
            estado_implementacion = 'READY',
            version = '1.0',
            updated_at = NOW();
    END IF;
END $$;

-- 2. Register AG-011 Canonical Events in cat_eventos_agente
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cat_eventos_agente') THEN
        INSERT INTO cat_eventos_agente (event_code, nombre_evento, agent_id_destino, es_conocido, datos_requeridos)
        VALUES
        ('TECHNICAL_MEMORY_QUERY_REQUESTED', 'Solicitud de recuperación y síntesis de memorias técnicas aplicables', 'AG-011', true, '["asset_id", "problem_statement", "evaluation_at"]'::JSONB),
        ('TECHNICAL_MEMORY_CANDIDATE_SUBMITTED', 'Propuesta de nuevo candidato a memoria técnica para revisión humana', 'AG-011', true, '["asset_id", "condition_description", "validated_procedure", "evidence_items"]'::JSONB),
        ('TECHNICAL_MEMORY_REVIEW_REQUESTED', 'Evento de revisión y aprobación formal humana de memoria técnica', 'AG-011', true, '["memory_id", "version", "reviewer_email", "decision", "evidence_snapshot_sha256"]'::JSONB),
        ('TECHNICAL_MEMORY_VERSION_CREATED', 'Creación formal de nueva versión técnica inmutable', 'AG-011', true, '["memory_id", "new_technical_content", "evidence"]'::JSONB)
        ON CONFLICT (event_code) DO UPDATE
        SET agent_id_destino = EXCLUDED.agent_id_destino,
            es_conocido = EXCLUDED.es_conocido,
            datos_requeridos = EXCLUDED.datos_requeridos;
    END IF;
END $$;
