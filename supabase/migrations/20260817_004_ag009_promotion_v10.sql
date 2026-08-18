-- supabase/migrations/20260817_004_ag009_promotion_v10.sql
-- Migration & Promotion for AG-009 Gestor Formularios-Solicitudes-OT v1.0 (§80-86 PRD)

-- 1. Register AG-009 Family Agents in cat_agentes if table exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cat_agentes') THEN
        -- Insert / Update AG-009 (Parent Agent) promoted to READY
        INSERT INTO cat_agentes (agent_id, nombre, rama, tipo, requires_ai, provider, default_model, default_temperature, authority_level, activo, estado_implementacion, version)
        VALUES ('AG-009', 'Gestor Formularios-Solicitudes-OT', 'INTEGRACION', 'AGENTE', false, 'none', 'none', NULL, 2, true, 'READY', '1.0')
        ON CONFLICT (agent_id) DO UPDATE
        SET activo = true,
            estado_implementacion = 'READY',
            version = '1.0',
            updated_at = NOW();

        -- Insert / Update Subagents
        INSERT INTO cat_agentes (agent_id, nombre, rama, tipo, requires_ai, provider, default_model, default_temperature, authority_level, activo, estado_implementacion, version)
        VALUES 
        ('AG-009.1', 'Conector Preventivo', 'INTEGRACION', 'SUBAGENTE', false, 'none', 'none', NULL, 2, true, 'READY', '1.0'),
        ('AG-009.2', 'Conector Autónomo', 'INTEGRACION', 'SUBAGENTE', false, 'none', 'none', NULL, 2, true, 'READY', '1.0'),
        ('AG-009.3', 'Conector Correctivo', 'INTEGRACION', 'SUBAGENTE', false, 'none', 'none', NULL, 2, true, 'READY', '1.0')
        ON CONFLICT (agent_id) DO UPDATE
        SET activo = true,
            estado_implementacion = 'READY',
            version = '1.0',
            updated_at = NOW();
    END IF;
END $$;

-- 2. Register AG-009 Family Canonical Events in cat_eventos_agente
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cat_eventos_agente') THEN
        INSERT INTO cat_eventos_agente (event_code, nombre_evento, agent_id_destino, es_conocido, datos_requeridos)
        VALUES
        ('PREVENTIVE_SCHEDULE_ITEM', 'Evento de calendario preventivo anual', 'AG-009.1', true, '["machine_id", "scheduled_date", "year", "service_code", "calendar_reference"]'::JSONB),
        ('PREVENTIVO_GENERAR', 'Generación de OT preventiva formal', 'AG-009.1', true, '["machine_id", "service_code"]'::JSONB),
        ('AUTONOMOUS_SCHEDULE_ITEM', 'Evento de calendario semanal de mantenimiento autónomo', 'AG-009.2', true, '["machine_id", "scheduled_date", "year", "week_reference", "calendar_reference", "responses"]'::JSONB),
        ('AUTONOMO_EJECUTAR', 'Ejecución y evaluación de rutina autónoma', 'AG-009.2', true, '["machine_id", "responses"]'::JSONB),
        ('CORRECTIVE_REQUEST', 'Solicitud canónica de mantenimiento correctivo', 'AG-009.3', true, '["machine_id", "description", "requester_reference"]'::JSONB),
        ('SOLICITUD_CORRECTIVA', 'Solicitud correctiva formal desde portal', 'AG-009.3', true, '["machine_id", "description"]'::JSONB),
        ('FALLA_REPORTADA', 'Reporte directo de falla en planta', 'AG-009.3', true, '["machine_id", "description"]'::JSONB),
        ('PORTAL_REQUEST', 'Requisición de mantenimiento vía portal', 'AG-009.3', true, '["machine_id", "description"]'::JSONB),
        ('TELEGRAM_EVENT', 'Evento de falla reportado desde Telegram ERP', 'AG-009.3', true, '["id_telar", "falla"]'::JSONB),
        ('AUTONOMOUS_FINDING', 'Hallazgo autónomo derivado a correctivo', 'AG-009.3', true, '["machine_id", "block", "finding_description"]'::JSONB),
        ('PREDICTIVE_FINDING', 'Hallazgo predictivo derivado a correctivo', 'AG-009.3', true, '["machine_id", "block", "finding"]'::JSONB),
        ('SUBTASK_REQUEST', 'Solicitud de subtarea especializada vinculada a OT', 'AG-009.3', true, '["parent_ot_reference", "requested_area", "requested_by", "description"]'::JSONB)
        ON CONFLICT (event_code) DO UPDATE
        SET agent_id_destino = EXCLUDED.agent_id_destino,
            es_conocido = EXCLUDED.es_conocido,
            datos_requeridos = EXCLUDED.datos_requeridos;
    END IF;
END $$;
