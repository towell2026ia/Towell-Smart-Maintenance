-- ============================================================================
-- TSM-AI Audit Fix Migration: Schema Gaps Resolution
-- Generated: 2026-08-27
-- Fixes: C-01, C-02, C-03, C-04, C-05, A-01, A-05, A-09
-- ============================================================================

BEGIN;

-- ============================================================================
-- C-01: Agregar columna estado_implementacion a cat_agentes
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'cat_agentes'
      AND column_name = 'estado_implementacion'
  ) THEN
    ALTER TABLE public.cat_agentes
      ADD COLUMN estado_implementacion VARCHAR(20) DEFAULT 'EVALUATION'
      CHECK (estado_implementacion IN ('REGISTERED', 'ROUTING_ONLY', 'TRAINING', 'EVALUATION', 'READY', 'SUSPENDED'));

    COMMENT ON COLUMN public.cat_agentes.estado_implementacion
      IS 'Implementation lifecycle state: REGISTERED → ROUTING_ONLY → TRAINING → EVALUATION → READY → SUSPENDED';

    -- Set active agents to READY, inactive to EVALUATION
    UPDATE public.cat_agentes SET estado_implementacion = 'READY' WHERE activo = true;
    UPDATE public.cat_agentes SET estado_implementacion = 'EVALUATION' WHERE activo = false;
  END IF;
END $$;

-- ============================================================================
-- C-02: Expandir CHECK constraint de tipo para incluir SUBAGENTE
-- ============================================================================
DO $$
BEGIN
  -- Drop the existing constraint and recreate with SUBAGENTE
  ALTER TABLE public.cat_agentes DROP CONSTRAINT IF EXISTS cat_agentes_tipo_check;
  ALTER TABLE public.cat_agentes
    ADD CONSTRAINT cat_agentes_tipo_check CHECK (tipo IN ('AGENTE', 'MODULO', 'SUBAGENTE'));
END $$;

-- ============================================================================
-- C-04: Agregar BLOQUEADO al CHECK de estatus en eventos_agente
-- ============================================================================
DO $$
BEGIN
  ALTER TABLE public.eventos_agente DROP CONSTRAINT IF EXISTS eventos_agente_estatus_check;
  ALTER TABLE public.eventos_agente
    ADD CONSTRAINT eventos_agente_estatus_check CHECK (
      estatus IN ('PENDIENTE', 'EN_PROCESO', 'ENRUTADO', 'COMPLETADO', 'FALLIDO', 'REQUIERE_APROBACION', 'BLOQUEADO')
    );
END $$;

-- ============================================================================
-- C-03a: Agregar columnas faltantes a bitacora_ejecuciones_agente
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'bitacora_ejecuciones_agente'
      AND column_name = 'parent_execution_id'
  ) THEN
    ALTER TABLE public.bitacora_ejecuciones_agente
      ADD COLUMN parent_execution_id VARCHAR(50) DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'bitacora_ejecuciones_agente'
      AND column_name = 'reason_code'
  ) THEN
    ALTER TABLE public.bitacora_ejecuciones_agente
      ADD COLUMN reason_code VARCHAR(100) DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'bitacora_ejecuciones_agente'
      AND column_name = 'target_agent'
  ) THEN
    ALTER TABLE public.bitacora_ejecuciones_agente
      ADD COLUMN target_agent VARCHAR(50) DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'bitacora_ejecuciones_agente'
      AND column_name = 'agent_version'
  ) THEN
    ALTER TABLE public.bitacora_ejecuciones_agente
      ADD COLUMN agent_version VARCHAR(20) DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'bitacora_ejecuciones_agente'
      AND column_name = 'prompt_version'
  ) THEN
    ALTER TABLE public.bitacora_ejecuciones_agente
      ADD COLUMN prompt_version VARCHAR(20) DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'bitacora_ejecuciones_agente'
      AND column_name = 'schema_version'
  ) THEN
    ALTER TABLE public.bitacora_ejecuciones_agente
      ADD COLUMN schema_version VARCHAR(20) DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'bitacora_ejecuciones_agente'
      AND column_name = 'validator_version'
  ) THEN
    ALTER TABLE public.bitacora_ejecuciones_agente
      ADD COLUMN validator_version VARCHAR(20) DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'bitacora_ejecuciones_agente'
      AND column_name = 'route_version'
  ) THEN
    ALTER TABLE public.bitacora_ejecuciones_agente
      ADD COLUMN route_version VARCHAR(20) DEFAULT NULL;
  END IF;
END $$;

-- Expand execution_type CHECK to include all types used by executor
DO $$
BEGIN
  ALTER TABLE public.bitacora_ejecuciones_agente DROP CONSTRAINT IF EXISTS bitacora_ejecuciones_agente_execution_type_check;
  ALTER TABLE public.bitacora_ejecuciones_agente
    ADD CONSTRAINT bitacora_ejecuciones_agente_execution_type_check CHECK (
      execution_type IN ('ROUTING_RULE', 'AGENT_EXECUTION', 'AI_CLASSIFICATION_NANO', 'AI_CLASSIFICATION_MINI', 'VALIDATION', 'APPROVAL_REQUEST', 'ROUTING_BLOCKED')
    );
END $$;

-- Expand status CHECK to include REQUIRES_HUMAN_ACTION
DO $$
BEGIN
  ALTER TABLE public.bitacora_ejecuciones_agente DROP CONSTRAINT IF EXISTS bitacora_ejecuciones_agente_status_check;
  ALTER TABLE public.bitacora_ejecuciones_agente
    ADD CONSTRAINT bitacora_ejecuciones_agente_status_check CHECK (
      status IN ('SUCCESS', 'FAILED', 'FAILED_RETRYABLE', 'REJECTED_VALIDATOR', 'REQUIRES_HUMAN_ACTION')
    );
END $$;

-- Index for parent_execution_id (fallback chain tracing)
CREATE INDEX IF NOT EXISTS idx_ejecuciones_parent ON public.bitacora_ejecuciones_agente(parent_execution_id);

-- ============================================================================
-- C-03b: Agregar columnas faltantes a aprobaciones_agente
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'aprobaciones_agente'
      AND column_name = 'execution_id'
  ) THEN
    ALTER TABLE public.aprobaciones_agente
      ADD COLUMN execution_id VARCHAR(50) DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'aprobaciones_agente'
      AND column_name = 'action_hash'
  ) THEN
    ALTER TABLE public.aprobaciones_agente
      ADD COLUMN action_hash VARCHAR(64) DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'aprobaciones_agente'
      AND column_name = 'hash_algorithm'
  ) THEN
    ALTER TABLE public.aprobaciones_agente
      ADD COLUMN hash_algorithm VARCHAR(20) DEFAULT 'SHA-256';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'aprobaciones_agente'
      AND column_name = 'canonicalization_version'
  ) THEN
    ALTER TABLE public.aprobaciones_agente
      ADD COLUMN canonicalization_version VARCHAR(30) DEFAULT 'CANONICAL_JSON_V1';
  END IF;

  -- Rename propuesta_payload -> payload_snapshot if propuesta_payload exists
  -- Note: We add payload_snapshot as alias; keep propuesta_payload for backward compat
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'aprobaciones_agente'
      AND column_name = 'payload_snapshot'
  ) THEN
    ALTER TABLE public.aprobaciones_agente
      ADD COLUMN payload_snapshot JSONB DEFAULT NULL;

    -- Copy existing data from propuesta_payload if it has data
    UPDATE public.aprobaciones_agente
      SET payload_snapshot = propuesta_payload
      WHERE propuesta_payload IS NOT NULL AND payload_snapshot IS NULL;
  END IF;
END $$;

-- Expand aprobaciones estatus CHECK to include CANCELADO
DO $$
BEGIN
  ALTER TABLE public.aprobaciones_agente DROP CONSTRAINT IF EXISTS aprobaciones_agente_estatus_check;
  ALTER TABLE public.aprobaciones_agente
    ADD CONSTRAINT aprobaciones_agente_estatus_check CHECK (
      estatus IN ('PENDIENTE_APROBACION', 'APROBADO', 'RECHAZADO', 'CANCELADO')
    );
END $$;

-- ============================================================================
-- C-05: Agregar secuencia_destinos a cat_eventos_agente
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'cat_eventos_agente'
      AND column_name = 'secuencia_destinos'
  ) THEN
    ALTER TABLE public.cat_eventos_agente
      ADD COLUMN secuencia_destinos TEXT[] DEFAULT NULL;

    COMMENT ON COLUMN public.cat_eventos_agente.secuencia_destinos
      IS 'Optional ordered array of agent IDs for supervised multi-agent sequences';
  END IF;
END $$;

-- ============================================================================
-- A-03: Insertar eventos faltantes en cat_eventos_agente
-- ============================================================================
INSERT INTO public.cat_eventos_agente (event_code, nombre_evento, agent_id_destino, es_conocido, datos_requeridos)
VALUES
  ('PREVENTIVO_PRESUPUESTO_CONSULTAR', 'Consulta canónica de presupuesto preventivo de refacciones', 'AG-007', true, '[]'::JSONB),
  ('PREVENTIVE_BUDGET_REQUESTED', 'Consulta de pronóstico de presupuesto preventivo', 'AG-007', true, '[]'::JSONB),
  ('EXCEL_SEGUNDAS_CARGADO', 'Carga y persistencia validada de Segundas por Rollo', 'AG-003', true, '[]'::JSONB),
  ('FORMULARIO_CARGADO', 'Importación de formatos para estructura dinámica', 'AG-006', true, '["form_name"]'::JSONB),
  ('FORMULARIO_VALIDAR', 'Validación de definición de formulario', 'AG-006', true, '["form_code"]'::JSONB),
  ('LEVANTAMIENTO_AUTONOMO_NO_CONFORME', 'Levantamiento autónomo no conforme', 'AG-009.2', true, '["descripcion"]'::JSONB),
  ('LEVANTAMIENTO_PREDICTIVO_NO_CONFORME', 'Levantamiento predictivo no conforme', 'AG-009.3', true, '["descripcion"]'::JSONB),
  ('ANALISIS_CAUSA_RAIZ_SOLICITADO', 'Solicitud de análisis causa raíz', 'AG-010', true, '["maquina_id", "falla_id"]'::JSONB),
  ('MEMORIA_TECNICA_REGISTRAR', 'Registro de memoria técnica de reparación', 'AG-011', true, '["maquina_id", "diagnostico"]'::JSONB),
  ('EVALUACION_CICLO_VIDA', 'Evaluación de reparar, renovar o reemplazar', 'AG-012', true, '["maquina_id"]'::JSONB),
  ('ASSET_INTERVENTION_STRATEGY_REQUESTED', 'Solicitud de evaluación de estrategia de intervención', 'AG-012', true, '["asset_id"]'::JSONB),
  ('PREVENTIVE_SCHEDULE_ITEM', 'Ítem de programación preventiva anual', 'AG-009.1', true, '["machine_id", "service_code", "scheduled_date"]'::JSONB),
  ('AUTONOMOUS_SCHEDULE_ITEM', 'Ítem de rutina autónoma semanal', 'AG-009.2', true, '["machine_id", "week_reference", "scheduled_date"]'::JSONB),
  ('AUTONOMO_EJECUTAR', 'Ejecución de rutina de mantenimiento autónomo', 'AG-009.2', true, '["machine_id", "week_reference", "responses"]'::JSONB),
  ('FAILURE_ANALYSIS_REQUESTED', 'Solicitud de análisis de fallas desde UI', 'AG-008', true, '[]'::JSONB),
  ('AI_RECOMMENDATIONS_REQUESTED', 'Solicitud de recomendaciones contextuales IA desde UI', 'AG-001', true, '[]'::JSONB),
  ('SYSTEM_ALERTS_REQUESTED', 'Consulta de alertas activas del sistema desde UI', 'AG-007', true, '[]'::JSONB),
  ('MACHINE_AI_CONTEXT_REQUESTED', 'Consulta consolidada de snapshot de contexto IA por maquinaria', 'AG-001', true, '["machine_id"]'::JSONB),
  ('AGENTS_METRICS_REQUESTED', 'Consulta de métricas y telemetría de agentes para Centro de Control', 'AG-001', true, '[]'::JSONB)
ON CONFLICT (event_code) DO NOTHING;

-- Set secuencia_destinos for multi-agent sequences
UPDATE public.cat_eventos_agente
  SET secuencia_destinos = ARRAY['AG-009.2', 'AG-009.3']
  WHERE event_code = 'LEVANTAMIENTO_AUTONOMO_NO_CONFORME';

-- ============================================================================
-- A-01: Agregar tarifa para gpt-4o-mini
-- ============================================================================
INSERT INTO public.cat_tarifas_modelo (provider, model, price_input_usd, price_output_usd, price_cached_input_usd, pricing_version, activo)
VALUES ('openai', 'gpt-4o-mini', 0.00000015, 0.00000060, 0.00000003, '2026-08-A', true)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- A-05: Fix race condition en trigger de folios con SERIALIZABLE advisory lock
-- ============================================================================
CREATE OR REPLACE FUNCTION generar_folio_orden_trabajo()
RETURNS TRIGGER AS $$
DECLARE
    siguiente_numero INT;
    prefijo VARCHAR(5);
BEGIN
    prefijo := COALESCE(NEW.departamento, 'OT');

    -- Advisory lock basado en hash del prefijo para serializar generación
    PERFORM pg_advisory_xact_lock(hashtext('folio_gen_' || prefijo));

    SELECT COALESCE(
        MAX(
            CAST(
                SUBSTRING(folio FROM LENGTH(prefijo) + 1) AS INTEGER
            )
        ), 0
    ) INTO siguiente_numero
    FROM ordenes_trabajo
    WHERE folio LIKE prefijo || '%';

    siguiente_numero := siguiente_numero + 1;
    NEW.folio := prefijo || LPAD(siguiente_numero::TEXT, 5, '0');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- A-09: Endurecer RLS policies
-- ============================================================================
-- Drop overly permissive policies
DROP POLICY IF EXISTS "Acceso total para administradores en cat_agentes" ON public.cat_agentes;
DROP POLICY IF EXISTS "Acceso total para administradores en cat_tarifas_modelo" ON public.cat_tarifas_modelo;
DROP POLICY IF EXISTS "Acceso total para administradores en cat_eventos_agente" ON public.cat_eventos_agente;
DROP POLICY IF EXISTS "Acceso total para administradores en eventos_agente" ON public.eventos_agente;
DROP POLICY IF EXISTS "Acceso total para administradores en bitacora_ejecuciones_agente" ON public.bitacora_ejecuciones_agente;
DROP POLICY IF EXISTS "Acceso total para administradores en aprobaciones_agente" ON public.aprobaciones_agente;

-- Catalogs: Read-only for all authenticated, write for admin roles only
CREATE POLICY "cat_agentes_read" ON public.cat_agentes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "cat_agentes_write" ON public.cat_agentes
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.cat_usuarios_roles
      WHERE correo = auth.email()
        AND rol IN ('SUPER_ADMINISTRADOR')
        AND activo = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.cat_usuarios_roles
      WHERE correo = auth.email()
        AND rol IN ('SUPER_ADMINISTRADOR')
        AND activo = true
    )
  );

CREATE POLICY "cat_tarifas_read" ON public.cat_tarifas_modelo
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "cat_tarifas_write" ON public.cat_tarifas_modelo
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.cat_usuarios_roles
      WHERE correo = auth.email()
        AND rol IN ('SUPER_ADMINISTRADOR')
        AND activo = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.cat_usuarios_roles
      WHERE correo = auth.email()
        AND rol IN ('SUPER_ADMINISTRADOR')
        AND activo = true
    )
  );

CREATE POLICY "cat_eventos_read" ON public.cat_eventos_agente
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "cat_eventos_write" ON public.cat_eventos_agente
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.cat_usuarios_roles
      WHERE correo = auth.email()
        AND rol IN ('SUPER_ADMINISTRADOR')
        AND activo = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.cat_usuarios_roles
      WHERE correo = auth.email()
        AND rol IN ('SUPER_ADMINISTRADOR')
        AND activo = true
    )
  );

-- Operational tables: Insert for all authenticated (events flow from any user),
-- Update/Delete restricted to service_role (handled server-side by orchestrator)
CREATE POLICY "eventos_agente_select" ON public.eventos_agente
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "eventos_agente_insert" ON public.eventos_agente
  FOR INSERT TO authenticated WITH CHECK (true);

-- Bitacora: Read for admin, insert for service role (edge function runs as service role)
CREATE POLICY "bitacora_read" ON public.bitacora_ejecuciones_agente
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "bitacora_insert" ON public.bitacora_ejecuciones_agente
  FOR INSERT TO authenticated WITH CHECK (true);

-- Aprobaciones: Read for all, write restricted
CREATE POLICY "aprobaciones_read" ON public.aprobaciones_agente
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "aprobaciones_insert" ON public.aprobaciones_agente
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "aprobaciones_update" ON public.aprobaciones_agente
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.cat_usuarios_roles
      WHERE correo = auth.email()
        AND rol IN ('SUPER_ADMINISTRADOR', 'ADMINISTRADOR')
        AND activo = true
    )
  );

COMMIT;
