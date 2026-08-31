// supabase/functions/agents-orchestrator/core/executor.ts
// Central Orchestration Engine for AG-001 Capataz Orquestador v1.0

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { AgentExecution, NanoOutputFormat, RoutingStatusResult } from '../types/agents.types.ts';
import { config } from './config.ts';
import { generateIdempotencyKey, checkIdempotency } from './idempotency.ts';
import { resolveAgentRoute } from './router.ts';
import { validateEventPayload, validateAuthorityLevel, validateNanoOutput, CLOSED_AGENT_CATALOG } from './validator.ts';
import { createApprovalRequest } from './approvals.ts';
import { callOpenAIWithRetry, CAPATAZ_NANO_SYSTEM_PROMPT, CAPATAZ_NANO_JSON_SCHEMA } from '../providers/openai-adapter.ts';
import { calculateCost, fetchModelRates, logExecutionRecord } from './cost-tracker.ts';
import { executeAG002AnnualPreventive } from '../agents/ag002/ag002-executor.ts';
import { executeAG003WeeklyPredictive } from '../agents/ag003/ag003-executor.ts';
import { executeAG004WeeklyAutonomous } from '../agents/ag004/ag004-executor.ts';
import { executeAG005Audit } from '../agents/ag005/ag005-executor.ts';
import { executeAG006FormBuilder } from '../agents/ag006/ag006-executor.ts';
import { executeAG007PreventiveBudget } from '../agents/ag007/ag007-executor.ts';
import { executeAG008FailureAnalysis } from '../agents/ag008/ag008-executor.ts';
import { executeAG009 } from '../agents/ag009/ag009-executor.ts';
import { executeAG010 } from '../agents/ag010/ag010-executor.ts';
import { executeAG011 } from '../agents/ag011/ag011-executor.ts';
import { executeAG012 } from '../agents/ag012/ag012-executor.ts';
import { executeAG013 } from '../agents/ag013/ag013-executor.ts';
import { getMachineContextSnapshot } from './machine-context-service.ts';

export interface SecretsConfig {
  OPENAI_API_KEY?: string;
  MIMO_API_KEY?: string;
  MULTIAGENT_ENABLED?: string;
  LLM_CALLS_ENABLED?: string;
  AI_ROUTER_ENABLED?: string;
  OPENAI_ENABLED?: string;
  MIMO_ENABLED?: string;
}

export interface ExecutionResult {
  success: boolean;
  status: RoutingStatusResult | 'FALLIDO';
  event_code?: string;
  agent_id?: string | null;
  target_agent?: string | null;
  routing_type?: 'DETERMINISTIC' | 'AI_CLASSIFICATION_NANO' | 'AI_CLASSIFICATION_MINI' | 'NONE';
  correlation_id: string;
  event_id?: string;
  execution_id?: string;
  llm_used?: boolean;
  result?: any;
  error?: string;
  sequence_executed?: string[];
}

export function canExecuteAgent(agentStatus: string, activo: boolean, environment: string): { allowed: boolean; reason: RoutingStatusResult } {
  if (!activo) {
    return { allowed: false, reason: 'BLOCKED_AGENT_DISABLED' };
  }

  switch (agentStatus.toUpperCase()) {
    case 'REGISTERED':
      return { allowed: false, reason: 'BLOCKED_AGENT_NOT_READY' };
    case 'ROUTING_ONLY':
      // ROUTING_ONLY means the agent is cataloged and can be target of route, but specialist execution is not invoked
      return { allowed: true, reason: 'ENRUTADO' };
    case 'TRAINING':
    case 'EVALUATION':
      if (['test', 'staging'].includes(environment.toLowerCase())) {
        return { allowed: true, reason: 'ENRUTADO' };
      }
      return { allowed: false, reason: 'BLOCKED_AGENT_NOT_READY' };
    case 'READY':
      return { allowed: true, reason: 'ENRUTADO' };
    case 'SUSPENDED':
      return { allowed: false, reason: 'BLOCKED_AGENT_SUSPENDED' };
    default:
      return { allowed: false, reason: 'BLOCKED_AGENT_DISABLED' };
  }
}

export async function executeAgentFlow(
  supabase: SupabaseClient | null,
  eventCode: string,
  clientPayload: Record<string, any>,
  correlationId: string | null,
  secrets: SecretsConfig
): Promise<ExecutionResult> {
  const startedAt = new Date().toISOString();
  const corrId = correlationId || `CORR-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`.toUpperCase();
  const humanEventId = `EVT-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`.toUpperCase();

  // 0. Feature Flag Check: MULTIAGENT_ENABLED
  if (!config.multiagentEnabled) {
    return {
      success: false,
      status: 'FALLIDO',
      correlation_id: corrId,
      error: 'La arquitectura multiagente está deshabilitada (MULTIAGENT_ENABLED = false)'
    };
  }

  // 1. Resolve Route from cat_eventos_agente DB Catalog (Single Source of Truth)
  const route = await resolveAgentRoute(supabase, eventCode);

  // Adjustment 3: Unknown eventCode returns INVALID_EVENT immediately; NEVER sent to Nano!
  if (!route.is_valid_event) {
    console.warn(`[Executor] Rejecting unknown eventCode "${eventCode}" as INVALID_EVENT.`);
    return {
      success: false,
      status: 'INVALID_EVENT',
      correlation_id: corrId,
      error: `Código de evento desconocido o no catalogado: '${eventCode}'.`
    };
  }

  // 2. Idempotency Check
  const idempotencyKey = await generateIdempotencyKey(eventCode, clientPayload);
  const idemCheck = await checkIdempotency(supabase, idempotencyKey);

  if (idemCheck.exists) {
    console.log(`[Executor] Idempotency Hit for key ${idempotencyKey}. Status: ${idemCheck.status}`);
    return {
      success: true,
      status: 'DUPLICATE',
      agent_id: route.target_agent,
      routing_type: 'DETERMINISTIC',
      event_code: eventCode.toUpperCase(),
      correlation_id: corrId,
      result: idemCheck.result,
      error: 'Ejecución duplicada detectada por validación de idempotencia.'
    };
  }

  // 3. Register Event in eventos_agente table if DB connection exists
  let dbEventId: string | undefined;
  if (supabase) {
    try {
      const { data: dbEvent, error: insErr } = await supabase
        .from('eventos_agente')
        .insert([{
          event_id: humanEventId,
          correlation_id: corrId,
          idempotency_key: idempotencyKey,
          event_code: eventCode.toUpperCase(),
          payload: clientPayload,
          estatus: 'PENDIENTE'
        }])
        .select('id_evento')
        .single();

      if (!insErr && dbEvent) {
        dbEventId = dbEvent.id_evento;
        await supabase
          .from('eventos_agente')
          .update({ estatus: 'EN_PROCESO', fecha_actualizacion: new Date().toISOString() })
          .eq('id_evento', dbEventId);
      }
    } catch (e) {
      console.warn('[Executor] DB event insertion non-blocking exception:', e);
    }
  }

  // 4. Validate Payload & Clean Injected Flags
  const valResult = validateEventPayload(eventCode, clientPayload, route.required_fields);
  if (!valResult.isValid) {
    if (supabase && dbEventId) {
      await supabase
        .from('eventos_agente')
        .update({ estatus: 'FALLIDO', fecha_actualizacion: new Date().toISOString() })
        .eq('id_evento', dbEventId);
    }
    return {
      success: false,
      status: 'INVALID_PAYLOAD',
      correlation_id: corrId,
      event_id: humanEventId,
      error: valResult.error || 'Payload inválido.'
    };
  }

  const cleanedPayload = valResult.cleanedPayload;

  // 5. Check Target Agent Status & Environment Permissions
  let targetAgentState = 'READY';
  let targetAuthorityLevel = 1;
  let targetActive = route.activo;

  if (supabase && route.agent_id) {
    try {
      const { data: agentRow } = await supabase
        .from('cat_agentes')
        .select('activo, estado_implementacion, authority_level')
        .eq('agent_id', route.agent_id)
        .maybeSingle();

      if (agentRow) {
        targetActive = agentRow.activo;
        targetAgentState = agentRow.estado_implementacion || 'EVALUATION';
        targetAuthorityLevel = agentRow.authority_level ?? 1;
      }
    } catch (e) {}
  }

  const agentExecutionCheck = canExecuteAgent(targetAgentState, targetActive, config.tsmEnv);
  if (!agentExecutionCheck.allowed) {
    if (supabase && dbEventId) {
      await supabase
        .from('eventos_agente')
        .update({ estatus: 'BLOQUEADO', fecha_actualizacion: new Date().toISOString() })
        .eq('id_evento', dbEventId);
    }
    return {
      success: false,
      status: agentExecutionCheck.reason,
      correlation_id: corrId,
      event_id: humanEventId,
      target_agent: route.agent_id,
      error: `Agente '${route.agent_id}' bloqueado por estado/activo (${agentExecutionCheck.reason}).`
    };
  }

  // 6. DETERMINISTIC ROUTING (es_conocido === true -> 0 Tokens)
  if (route.es_conocido) {
    // Adjustment 2: Check Authority Level (0, 1, 2, 3)
    const authorityCheck = validateAuthorityLevel(targetAuthorityLevel);

    if (authorityCheck.status === 'REQUIRES_HUMAN_ACTION') {
      // Level 3: Block execution, DO NOT create standard approval row
      const execId = await logExecutionRecord(supabase, {
        correlation_id: corrId,
        agent_id: 'AG-001',
        execution_type: 'ROUTING_RULE',
        status: 'REQUIRES_HUMAN_ACTION',
        target_agent: route.agent_id,
        duration_ms: Date.now() - new Date(startedAt).getTime()
      });

      return {
        success: false,
        status: 'REQUIRES_HUMAN_ACTION',
        event_code: eventCode.toUpperCase(),
        agent_id: route.agent_id,
        routing_type: 'DETERMINISTIC',
        correlation_id: corrId,
        event_id: humanEventId,
        execution_id: execId,
        llm_used: false,
        error: `Acción de Nivel 3 requiere intervención humana exclusiva. Ningún proceso automático ejecutado.`
      };
    }

    if (authorityCheck.status === 'PENDING_APPROVAL') {
      // Level 2: Create PENDING_APPROVAL row with SHA-256 canonical hash
      const appResult = await createApprovalRequest(supabase, {
        correlation_id: corrId,
        event_id: dbEventId,
        agent_id: route.agent_id!,
        action_type: `SOLICITUD_${eventCode.toUpperCase()}`,
        payload_snapshot: cleanedPayload
      });

      const execId = await logExecutionRecord(supabase, {
        correlation_id: corrId,
        agent_id: 'AG-001',
        execution_type: 'APPROVAL_REQUEST',
        status: 'SUCCESS',
        target_agent: route.agent_id,
        result: { approval_id: appResult.id, action_hash: appResult.action_hash },
        duration_ms: Date.now() - new Date(startedAt).getTime()
      });

      return {
        success: true,
        status: 'PENDING_APPROVAL',
        event_code: eventCode.toUpperCase(),
        agent_id: route.agent_id,
        routing_type: 'DETERMINISTIC',
        correlation_id: corrId,
        event_id: humanEventId,
        execution_id: execId,
        llm_used: false,
        result: { approval_id: appResult.id, action_hash: appResult.action_hash }
      };
    }

    // Level 0 & 1: Deterministic route successful
    // Adjustment 4: Supervised Multi-Agent Sequences
    let sequenceExecuted: string[] = [];
    if (route.secuencia_destinos && route.secuencia_destinos.length > 0) {
      for (const seqAgent of route.secuencia_destinos) {
        sequenceExecuted.push(seqAgent);
      }
    } else if (route.agent_id) {
      sequenceExecuted.push(route.agent_id);
    }

    const completedAt = new Date().toISOString();
    const duration = new Date(completedAt).getTime() - new Date(startedAt).getTime();

    const execId = await logExecutionRecord(supabase, {
      correlation_id: corrId,
      agent_id: 'AG-001',
      execution_type: 'ROUTING_RULE',
      provider: 'none',
      model: 'none',
      started_at: startedAt,
      completed_at: completedAt,
      duration_ms: duration,
      input_tokens: 0,
      output_tokens: 0,
      cached_input_tokens: 0,
      reasoning_tokens: 0,
      price_input_usd: 0,
      price_output_usd: 0,
      price_cache_usd: 0,
      pricing_version: 'DETERMINISTIC_FREE',
      estimated_cost_usd: 0,
      status: 'SUCCESS',
      confidence: 1.0,
      target_agent: route.agent_id,
      result: {
        target_agent: route.agent_id,
        routing_method: 'REGLA_DETERMINISTICA',
        sequence_executed: sequenceExecuted
      }
    });

    // If target is AG-005 (Auditor de Bases), execute specialist audit
    let ag005AuditResult = null;
    if (route.agent_id === 'AG-005') {
      ag005AuditResult = await executeAG005Audit(supabase, cleanedPayload, corrId);
      await logExecutionRecord(supabase, {
        correlation_id: corrId,
        agent_id: 'AG-005',
        execution_type: 'AGENT_EXECUTION',
        provider: 'none',
        model: 'none',
        started_at: startedAt,
        completed_at: new Date().toISOString(),
        duration_ms: Date.now() - new Date(startedAt).getTime(),
        input_tokens: 0,
        output_tokens: 0,
        estimated_cost_usd: 0,
        status: ag005AuditResult.can_promote ? 'SUCCESS' : 'FAILED',
        result: ag005AuditResult
      });
    }

    // If target is AG-006 (Constructor de Formularios), execute specialist form builder
    let ag006Result = null;
    if (route.agent_id === 'AG-006') {
      ag006Result = await executeAG006FormBuilder(supabase, cleanedPayload, corrId, secrets.OPENAI_API_KEY);
      const isLlmUsed = secrets.OPENAI_API_KEY ? true : false;
      const modelRates = await fetchModelRates(supabase, 'openai', 'gpt-4o-mini');
      const costCalc = calculateCost(modelRates, 0, 0, 0);

      await logExecutionRecord(supabase, {
        correlation_id: corrId,
        agent_id: 'AG-006',
        execution_type: 'AGENT_EXECUTION',
        provider: isLlmUsed ? 'openai' : 'none',
        model: isLlmUsed ? 'gpt-4o-mini' : 'none',
        started_at: startedAt,
        completed_at: new Date().toISOString(),
        duration_ms: Date.now() - new Date(startedAt).getTime(),
        input_tokens: 0,
        output_tokens: 0,
        estimated_cost_usd: costCalc,
        pricing_version: modelRates.pricing_version,
        status: 'SUCCESS',
        result: ag006Result
      });
    }

    // If target is AG-009 family (AG-009, AG-009.1 Conector Preventivo, AG-009.2 Conector Autónomo), execute integration specialist
    let ag009Result = null;
    if (route.agent_id === 'AG-009' || route.agent_id === 'AG-009.1' || route.agent_id === 'AG-009.2') {
      ag009Result = await executeAG009(supabase, eventCode, cleanedPayload, corrId);
      await logExecutionRecord(supabase, {
        correlation_id: corrId,
        agent_id: ag009Result.agent_id || route.agent_id || 'AG-009.2',
        execution_type: 'AGENT_EXECUTION',
        provider: 'none',
        model: 'none',
        started_at: startedAt,
        completed_at: new Date().toISOString(),
        duration_ms: Date.now() - new Date(startedAt).getTime(),
        input_tokens: 0,
        output_tokens: 0,
        estimated_cost_usd: 0,
        status: ag009Result.success ? 'SUCCESS' : 'FAILED',
        result: ag009Result
      });
    }

    // If target is AG-010 (Cinco Porqués y Casos Anteriores), execute reliability specialist
    let ag010Result = null;
    if (route.agent_id === 'AG-010') {
      ag010Result = await executeAG010({
        request_id: humanEventId,
        event_id: humanEventId,
        correlation_id: corrId,
        asset_id: cleanedPayload.asset_id || cleanedPayload.id_maquina || 'UNKNOWN_ASSET',
        problem_statement: cleanedPayload.problem_statement || cleanedPayload.descripcion || 'Falla no especificada',
        evaluation_at: cleanedPayload.evaluation_at || new Date().toISOString(),
        m010_context: cleanedPayload.m010_context || cleanedPayload.context || {},
        ag008_context: cleanedPayload.ag008_context,
        m011_context: cleanedPayload.m011_context,
        api_key: secrets.MIMO_API_KEY
      });
      await logExecutionRecord(supabase, {
        correlation_id: corrId,
        agent_id: 'AG-010',
        execution_type: 'AGENT_EXECUTION',
        provider: ag010Result.execution_mode === 'FAST_PATH' ? 'none' : 'mimo',
        model: ag010Result.execution_mode === 'FAST_PATH' ? 'none' : 'mimo-v2.5',
        started_at: startedAt,
        completed_at: new Date().toISOString(),
        duration_ms: Date.now() - new Date(startedAt).getTime(),
        input_tokens: ag010Result.telemetry.tokens.input_tokens,
        output_tokens: ag010Result.telemetry.tokens.output_tokens,
        estimated_cost_usd: ag010Result.telemetry.cost_usd,
        status: ag010Result.success ? 'SUCCESS' : 'FAILED',
        result: ag010Result
      });
    }

    // If target is AG-013 (Analista de Malos Actores), execute reliability specialist
    let ag013Result = null;
    if (route.agent_id === 'AG-013') {
      ag013Result = await executeAG013({
        request_id: humanEventId,
        event_id: humanEventId,
        correlation_id: corrId,
        evaluation_at: cleanedPayload.evaluation_at || new Date().toISOString(),
        population_scope: cleanedPayload.population_scope || 'PLANT_WIDE',
        analysis_window: cleanedPayload.analysis_window || 'ROLLING_180D',
        consumer: 'AG001_CAPATAZ',
        assets: cleanedPayload.assets || [],
        api_key: secrets.MIMO_API_KEY
      });
      await logExecutionRecord(supabase, {
        correlation_id: corrId,
        agent_id: 'AG-013',
        execution_type: 'AGENT_EXECUTION',
        provider: ag013Result.execution_mode === 'FAST_PATH' ? 'none' : 'mimo',
        model: ag013Result.execution_mode === 'FAST_PATH' ? 'none' : 'mimo-v2.5',
        started_at: startedAt,
        completed_at: new Date().toISOString(),
        duration_ms: Date.now() - new Date(startedAt).getTime(),
        input_tokens: ag013Result.telemetry.tokens.input_tokens,
        output_tokens: ag013Result.telemetry.tokens.output_tokens,
        estimated_cost_usd: ag013Result.telemetry.cost_usd,
        status: ag013Result.success ? 'SUCCESS' : 'FAILED',
        result: ag013Result
      });
    }

    // If target is AG-002 (Preventivo Anual), execute dynamic annual scheduler and chain AG-007
    let ag002Result = null;
    let ag007Result = null;
    if (route.agent_id === 'AG-002') {
      ag002Result = await executeAG002AnnualPreventive(supabase, cleanedPayload, corrId);
      await logExecutionRecord(supabase, {
        correlation_id: corrId,
        agent_id: 'AG-002',
        execution_type: 'AGENT_EXECUTION',
        provider: 'none',
        model: 'none',
        started_at: startedAt,
        completed_at: new Date().toISOString(),
        duration_ms: Date.now() - new Date(startedAt).getTime(),
        input_tokens: 0,
        output_tokens: 0,
        estimated_cost_usd: 0,
        status: 'SUCCESS',
        result: ag002Result
      });

      // AG-001 automatically chains AG-007 to recalculate canonical parts budget (PRD-AG007-R1.3.4)
      if (ag002Result && ag002Result.schedule_items) {
        const plannedItems = ag002Result.schedule_items.map((s: any) => ({
          preventive_id: s.preventive_id || s.id_detalle,
          asset_id: s.machine_id,
          area_code: s.department || 'PF',
          scheduled_date: s.scheduled_date,
          service_code: s.service_code || 'SRV-PREV-01',
          service_name: s.service_name || 'Mantenimiento Preventivo Anual',
          calendar_year: s.target_year || cleanedPayload.target_year || 2026,
          source_type: 'NEWLY_SCHEDULED',
          planned_parts: (s.planned_parts || []).map((p: any) => ({
            part_code: p.cve_refaccion || p.codigo_articulo,
            part_name: p.nombre || p.part_name,
            planned_quantity: p.cantidad || p.planned_quantity || 1,
            reference_unit_price: p.costo_unitario || p.reference_unit_price
          }))
        }));

        ag007Result = await executeAG007PreventiveBudget(supabase, {
          reference_date: cleanedPayload.reference_date || ag002Result.generation_date,
          budget_scope: 'ANNUAL_MONTHLY',
          target_year: ag002Result.planning_window?.target_year || cleanedPayload.target_year || 2026,
          preventive_schedule_items: plannedItems,
          price_catalog: cleanedPayload.parts || [],
          active_machines: cleanedPayload.machines || []
        }, corrId);
      }
    }

    // If target is AG-007 (Presupuestos y Costos), execute specialist preventive budget engine
    if (route.agent_id === 'AG-007') {
      ag007Result = await executeAG007PreventiveBudget(supabase, {
        ...cleanedPayload,
        budget_scope: cleanedPayload.budget_scope || 'CURRENT_PERIOD',
        target_year: cleanedPayload.target_year
      }, corrId);
      await logExecutionRecord(supabase, {
        correlation_id: corrId,
        agent_id: 'AG-007',
        execution_type: 'AGENT_EXECUTION',
        provider: 'none',
        model: 'none',
        started_at: startedAt,
        completed_at: new Date().toISOString(),
        duration_ms: Date.now() - new Date(startedAt).getTime(),
        input_tokens: 0,
        output_tokens: 0,
        estimated_cost_usd: 0,
        status: 'SUCCESS',
        result: ag007Result
      });
    }

    // If target is AG-003 (Predictivo Semanal por Segundas), execute specialist predictive engine
    let ag003Result = null;
    if (route.agent_id === 'AG-003') {
      ag003Result = await executeAG003WeeklyPredictive(supabase, cleanedPayload, corrId);
      await logExecutionRecord(supabase, {
        correlation_id: corrId,
        agent_id: 'AG-003',
        execution_type: 'AGENT_EXECUTION',
        provider: 'none',
        model: 'none',
        started_at: startedAt,
        completed_at: new Date().toISOString(),
        duration_ms: Date.now() - new Date(startedAt).getTime(),
        input_tokens: 0,
        output_tokens: 0,
        estimated_cost_usd: 0,
        status: 'SUCCESS',
        result: ag003Result
      });
    }

    // If target is AG-004 (Autónomo Semanal), execute specialist autonomous engine
    let ag004Result = null;
    if (route.agent_id === 'AG-004') {
      ag004Result = await executeAG004WeeklyAutonomous(supabase, cleanedPayload, corrId);
      await logExecutionRecord(supabase, {
        correlation_id: corrId,
        agent_id: 'AG-004',
        execution_type: 'AGENT_EXECUTION',
        provider: 'none',
        model: 'none',
        started_at: startedAt,
        completed_at: new Date().toISOString(),
        duration_ms: Date.now() - new Date(startedAt).getTime(),
        input_tokens: 0,
        output_tokens: 0,
        estimated_cost_usd: 0,
        status: ag004Result.status === 'SUCCESS' ? 'SUCCESS' : 'FAILED',
        result: ag004Result
      });
    }

    // If target is AG-008 (Detector de Reincidencias y Análisis de Fallas), execute specialist failure engine
    let ag008Result = null;
    if (route.agent_id === 'AG-008') {
      ag008Result = await executeAG008FailureAnalysis(supabase, cleanedPayload, corrId);
      await logExecutionRecord(supabase, {
        correlation_id: corrId,
        agent_id: 'AG-008',
        execution_type: 'AGENT_EXECUTION',
        provider: 'none',
        model: 'none',
        started_at: startedAt,
        completed_at: new Date().toISOString(),
        duration_ms: Date.now() - new Date(startedAt).getTime(),
        input_tokens: 0,
        output_tokens: 0,
        estimated_cost_usd: 0,
        status: 'SUCCESS',
        result: ag008Result
      });
    }

    // If target is AG-011 (Memoria Técnica de Reparación), execute technical memory engine
    let ag011Result = null;
    if (route.agent_id === 'AG-011') {
      ag011Result = await executeAG011({
        request_id: humanEventId,
        event_id: humanEventId,
        correlation_id: corrId,
        operation: cleanedPayload.operation || 'QUERY_MEMORIES',
        asset_id: cleanedPayload.asset_id || cleanedPayload.id_maquina || cleanedPayload.maquina_id || 'UNKNOWN_ASSET',
        problem_statement: cleanedPayload.problem_statement || cleanedPayload.diagnostico || cleanedPayload.descripcion || 'Diagnóstico no especificado',
        component: cleanedPayload.component || cleanedPayload.componente,
        department: cleanedPayload.department || cleanedPayload.area || cleanedPayload.departamento,
        evaluation_at: cleanedPayload.evaluation_at || new Date().toISOString(),
        candidate_payload: cleanedPayload.candidate_payload || cleanedPayload,
        approval_payload: cleanedPayload.approval_payload,
        version_payload: cleanedPayload.version_payload,
        api_key: secrets.OPENAI_API_KEY
      });
      await logExecutionRecord(supabase, {
        correlation_id: corrId,
        agent_id: 'AG-011',
        execution_type: 'AGENT_EXECUTION',
        provider: ag011Result.execution_mode === 'OPENAI_GPT41_MINI' ? 'openai' : 'none',
        model: ag011Result.execution_mode === 'OPENAI_GPT41_MINI' ? 'gpt-4o-mini' : 'none',
        started_at: startedAt,
        completed_at: new Date().toISOString(),
        duration_ms: Date.now() - new Date(startedAt).getTime(),
        input_tokens: ag011Result.telemetry.tokens.input_tokens,
        output_tokens: ag011Result.telemetry.tokens.output_tokens,
        estimated_cost_usd: ag011Result.telemetry.cost_usd,
        status: ag011Result.success ? 'SUCCESS' : 'FAILED',
        result: ag011Result
      });
    }

    // If target is AG-012 (Evaluación Ciclo de Vida: Reparar, Renovar o Reemplazar), execute lifecycle specialist
    let ag012Result = null;
    if (route.agent_id === 'AG-012') {
      ag012Result = await executeAG012({
        request_id: humanEventId,
        event_id: humanEventId,
        correlation_id: corrId,
        asset_id: cleanedPayload.asset_id || cleanedPayload.id_maquina || cleanedPayload.maquina_id || 'UNKNOWN_ASSET',
        evaluation_at: cleanedPayload.evaluation_at || new Date().toISOString(),
        machine_record: cleanedPayload.machine_record || {
          id_maquina: cleanedPayload.asset_id || cleanedPayload.maquina_id,
          equipo_towell: cleanedPayload.asset_id || cleanedPayload.maquina_id,
          departamento_codigo: cleanedPayload.department || 'PF',
          area: cleanedPayload.department || 'PF',
          activo: true
        },
        financial_profile: cleanedPayload.financial_profile || {
          moneda: 'MXN',
          replacement_cost_mxn: cleanedPayload.replacement_cost || 500000,
          current_book_value_mxn: cleanedPayload.book_value || 100000,
          depreciation_method: 'STRAIGHT_LINE'
        },
        failure_signals: cleanedPayload.failure_signals || [],
        preventive_compliance: cleanedPayload.preventive_compliance || { compliance_rate_pct: 85 },
        api_key: secrets.MIMO_API_KEY
      });
      await logExecutionRecord(supabase, {
        correlation_id: corrId,
        agent_id: 'AG-012',
        execution_type: 'AGENT_EXECUTION',
        provider: ag012Result.execution_mode === 'REAL_MIMO' ? 'mimo' : 'none',
        model: ag012Result.execution_mode === 'REAL_MIMO' ? 'mimo-v2.5' : 'none',
        started_at: startedAt,
        completed_at: new Date().toISOString(),
        duration_ms: Date.now() - new Date(startedAt).getTime(),
        input_tokens: ag012Result.telemetry.tokens.input_tokens,
        output_tokens: ag012Result.telemetry.tokens.output_tokens,
        estimated_cost_usd: ag012Result.telemetry.cost_usd,
        status: ag012Result.success ? 'SUCCESS' : 'FAILED',
        result: ag012Result
      });
    }

    // If event is MACHINE_AI_CONTEXT_REQUESTED, generate centralized Machine Context Snapshot
    let contextSnapshotResult = null;
    if (eventCode.toUpperCase() === 'MACHINE_AI_CONTEXT_REQUESTED') {
      contextSnapshotResult = await getMachineContextSnapshot(
        supabase,
        cleanedPayload.machine_id || cleanedPayload.asset_id || 'UNKNOWN',
        cleanedPayload.user_role || 'SUPER_ADMINISTRADOR',
        corrId
      );
      await logExecutionRecord(supabase, {
        correlation_id: corrId,
        agent_id: 'AG-001',
        execution_type: 'AGENT_EXECUTION',
        provider: 'none',
        model: 'none',
        started_at: startedAt,
        completed_at: new Date().toISOString(),
        duration_ms: Date.now() - new Date(startedAt).getTime(),
        input_tokens: 0,
        output_tokens: 0,
        estimated_cost_usd: 0,
        status: 'SUCCESS',
        result: contextSnapshotResult
      });
    }

    if (supabase && dbEventId) {
      await supabase
        .from('eventos_agente')
        .update({ estatus: 'ENRUTADO', fecha_actualizacion: new Date().toISOString() })
        .eq('id_evento', dbEventId);
    }

    return {
      success: true,
      status: 'ENRUTADO',
      event_code: eventCode.toUpperCase(),
      agent_id: route.agent_id,
      routing_type: 'DETERMINISTIC',
      correlation_id: corrId,
      event_id: humanEventId,
      execution_id: execId,
      llm_used: ag010Result?.execution_mode === 'MIMO_V2_5' || ag011Result?.execution_mode === 'OPENAI_GPT41_MINI' || ag012Result?.execution_mode === 'REAL_MIMO' || ag013Result?.execution_mode === 'REAL_MIMO',
      sequence_executed: sequenceExecuted,
      result: {
        target_agent: route.agent_id,
        sequence_executed: sequenceExecuted,
        context_snapshot: contextSnapshotResult,
        ag002_result: ag002Result,
        ag003_result: ag003Result,
        ag004_result: ag004Result,
        audit_result: ag005AuditResult,
        form_builder_result: ag006Result,
        ag007_result: ag007Result,
        ag008_result: ag008Result,
        ag010_result: ag010Result,
        ag011_result: ag011Result,
        ag012_result: ag012Result,
        ag013_result: ag013Result
      }
    };
  }

  // 7. AI CLASSIFICATION (TEXTO_AMBIGUO -> GPT-4.1 Nano -> Validator -> GPT-4.1 Mini Fallback)
  if (!config.llmCallsEnabled || !config.aiRouterEnabled || !config.openaiEnabled) {
    return {
      success: false,
      status: 'FALLIDO',
      correlation_id: corrId,
      error: 'LLM_DISABLED: La llamadas a modelos de IA están deshabilitadas en la configuración.'
    };
  }

  const openAiApiKey = secrets.OPENAI_API_KEY || Deno.env.get('OPENAI_API_KEY') || '';

  // 7.1 Call GPT-4.1 Nano (Primary Classifier)
  let nanoExecId: string | null = null;
  let nanoOutput: NanoOutputFormat | null = null;
  let nanoValError: string | null = null;

  const nanoStartTime = Date.now();
  try {
    // Simulated test triggers for prompt failure or invalid agent
    if (cleanedPayload.simular_error_agente_invalido) {
      const mockResult = {
        event_code: 'FALLA_REPORTADA',
        target_agent: 'AG-666', // Invalid agent not in closed catalog
        confidence: 0.95,
        missing_fields: [],
        risk_flags: [],
        model_recommends_approval: false,
        reason_code: 'INVALID_AGENT_TEST'
      };
      const valCheck = validateNanoOutput(mockResult);
      nanoValError = valCheck.error;
    } else {
      const userPromptText = cleanedPayload.texto || JSON.stringify(cleanedPayload);
      const nanoResp = await callOpenAIWithRetry(
        openAiApiKey,
        'gpt-4.1-nano',
        CAPATAZ_NANO_SYSTEM_PROMPT,
        userPromptText,
        CAPATAZ_NANO_JSON_SCHEMA
      );

      const rates = await fetchModelRates(supabase, 'openai', 'gpt-4.1-nano');
      const costUsd = calculateCost(rates, nanoResp.inputTokens, nanoResp.outputTokens, nanoResp.cachedInputTokens);

      const valCheck = validateNanoOutput(nanoResp.parsedOutput);
      nanoOutput = valCheck.nanoData;
      nanoValError = valCheck.error;

      // Adjustment 6: Log Nano Execution Entry
      nanoExecId = await logExecutionRecord(supabase, {
        correlation_id: corrId,
        agent_id: 'AG-001',
        execution_type: 'AI_CLASSIFICATION_NANO',
        provider: 'openai',
        model: 'gpt-4.1-nano',
        started_at: new Date(nanoStartTime).toISOString(),
        completed_at: new Date().toISOString(),
        duration_ms: Date.now() - nanoStartTime,
        input_tokens: nanoResp.inputTokens,
        output_tokens: nanoResp.outputTokens,
        cached_input_tokens: nanoResp.cachedInputTokens,
        reasoning_tokens: nanoResp.reasoningTokens,
        price_input_usd: rates.price_input_usd,
        price_output_usd: rates.price_output_usd,
        price_cache_usd: rates.price_cache_usd,
        pricing_version: rates.pricing_version,
        estimated_cost_usd: costUsd,
        status: nanoValError ? 'REJECTED_VALIDATOR' : 'SUCCESS',
        confidence: nanoOutput?.confidence || 0,
        reason_code: nanoOutput?.reason_code || 'UNCLASSIFIED',
        target_agent: nanoOutput?.target_agent || null,
        result: nanoResp.parsedOutput,
        error_message: nanoValError
      });
    }
  } catch (err: any) {
    nanoValError = err.message || 'Error executing GPT-4.1 Nano.';
    nanoExecId = await logExecutionRecord(supabase, {
      correlation_id: corrId,
      agent_id: 'AG-001',
      execution_type: 'AI_CLASSIFICATION_NANO',
      provider: 'openai',
      model: 'gpt-4.1-nano',
      duration_ms: Date.now() - nanoStartTime,
      status: 'FAILED',
      error_message: nanoValError
    });
  }

  // 7.2 Semantic Fallback to GPT-4.1 Mini (Adjustment 6)
  // Invoked ONLY when Nano produces invalid JSON or fails semantic validation
  let finalClassification: NanoOutputFormat | null = nanoOutput;
  let activeExecutionId = nanoExecId;
  let activeRoutingType: 'AI_CLASSIFICATION_NANO' | 'AI_CLASSIFICATION_MINI' = 'AI_CLASSIFICATION_NANO';

  if (nanoValError || !nanoOutput) {
    console.warn(`[Executor] Nano validation failed (${nanoValError}). Triggering GPT-4.1 Mini fallback...`);
    const miniStartTime = Date.now();

    try {
      const userPromptText = cleanedPayload.texto || JSON.stringify(cleanedPayload);
      const miniResp = await callOpenAIWithRetry(
        openAiApiKey,
        'gpt-4.1-mini',
        CAPATAZ_NANO_SYSTEM_PROMPT,
        userPromptText,
        CAPATAZ_NANO_JSON_SCHEMA
      );

      const rates = await fetchModelRates(supabase, 'openai', 'gpt-4.1-mini');
      const costUsd = calculateCost(rates, miniResp.inputTokens, miniResp.outputTokens, miniResp.cachedInputTokens);

      const valCheck = validateNanoOutput(miniResp.parsedOutput);
      const miniOutput = valCheck.nanoData;
      const miniValError = valCheck.error;

      // Adjustment 6: Log Mini Execution Entry linked by parent_execution_id
      const miniExecId = await logExecutionRecord(supabase, {
        parent_execution_id: nanoExecId,
        correlation_id: corrId,
        agent_id: 'AG-001',
        execution_type: 'AI_CLASSIFICATION_MINI',
        provider: 'openai',
        model: 'gpt-4.1-mini',
        started_at: new Date(miniStartTime).toISOString(),
        completed_at: new Date().toISOString(),
        duration_ms: Date.now() - miniStartTime,
        input_tokens: miniResp.inputTokens,
        output_tokens: miniResp.outputTokens,
        cached_input_tokens: miniResp.cachedInputTokens,
        reasoning_tokens: miniResp.reasoningTokens,
        price_input_usd: rates.price_input_usd,
        price_output_usd: rates.price_output_usd,
        price_cache_usd: rates.price_cache_usd,
        pricing_version: rates.pricing_version,
        estimated_cost_usd: costUsd,
        status: miniValError ? 'REJECTED_VALIDATOR' : 'SUCCESS',
        confidence: miniOutput?.confidence || 0,
        reason_code: miniOutput?.reason_code || 'UNCLASSIFIED',
        target_agent: miniOutput?.target_agent || null,
        result: miniResp.parsedOutput,
        error_message: miniValError
      });

      if (miniValError || !miniOutput) {
        return {
          success: false,
          status: 'FALLIDO',
          correlation_id: corrId,
          event_id: humanEventId,
          execution_id: miniExecId,
          error: `Rechazado por Validator tras fallback en Mini: ${miniValError}`
        };
      }

      finalClassification = miniOutput;
      activeExecutionId = miniExecId;
      activeRoutingType = 'AI_CLASSIFICATION_MINI';
    } catch (err: any) {
      return {
        success: false,
        status: 'FALLIDO',
        correlation_id: corrId,
        event_id: humanEventId,
        execution_id: nanoExecId || undefined,
        error: `Error en fallback Mini: ${err.message}`
      };
    }
  }

  if (!finalClassification) {
    return {
      success: false,
      status: 'FALLIDO',
      correlation_id: corrId,
      error: 'Clasificación de IA fallida.'
    };
  }

  // 8. Missing Fields Guard (PRD Section 18)
  if (finalClassification.missing_fields && finalClassification.missing_fields.length > 0) {
    return {
      success: true,
      status: 'REQUIRES_INFORMATION',
      event_code: finalClassification.event_code,
      agent_id: finalClassification.target_agent,
      routing_type: activeRoutingType,
      correlation_id: corrId,
      event_id: humanEventId,
      execution_id: activeExecutionId || undefined,
      llm_used: true,
      result: {
        missing_fields: finalClassification.missing_fields,
        reason_code: finalClassification.reason_code,
        target_agent: finalClassification.target_agent
      }
    };
  }

  // 9. Authority Check for AI Classified Target
  let classifiedAuthorityLevel = 1;
  if (supabase) {
    try {
      const { data: agentData } = await supabase
        .from('cat_agentes')
        .select('authority_level')
        .eq('agent_id', finalClassification.target_agent)
        .maybeSingle();
      if (agentData) {
        classifiedAuthorityLevel = agentData.authority_level;
      }
    } catch (e) {}
  }

  const aiAuthorityCheck = validateAuthorityLevel(classifiedAuthorityLevel);

  if (aiAuthorityCheck.status === 'REQUIRES_HUMAN_ACTION') {
    return {
      success: false,
      status: 'REQUIRES_HUMAN_ACTION',
      event_code: finalClassification.event_code,
      agent_id: finalClassification.target_agent,
      routing_type: activeRoutingType,
      correlation_id: corrId,
      execution_id: activeExecutionId || undefined,
      llm_used: true,
      error: 'Acción de Nivel 3 requiere intervención humana exclusiva.'
    };
  }

  if (aiAuthorityCheck.status === 'PENDING_APPROVAL') {
    const appResult = await createApprovalRequest(supabase, {
      correlation_id: corrId,
      execution_id: activeExecutionId || undefined,
      event_id: dbEventId,
      agent_id: finalClassification.target_agent,
      action_type: `ENRUTAMIENTO_IA_${finalClassification.event_code}`,
      payload_snapshot: cleanedPayload
    });

    return {
      success: true,
      status: 'PENDING_APPROVAL',
      event_code: finalClassification.event_code,
      agent_id: finalClassification.target_agent,
      routing_type: activeRoutingType,
      correlation_id: corrId,
      execution_id: activeExecutionId || undefined,
      llm_used: true,
      result: {
        approval_id: appResult.id,
        action_hash: appResult.action_hash,
        target_agent: finalClassification.target_agent
      }
    };
  }

  return {
    success: true,
    status: 'ENRUTADO',
    event_code: finalClassification.event_code,
    agent_id: finalClassification.target_agent,
    target_agent: finalClassification.target_agent,
    routing_type: activeRoutingType,
    correlation_id: corrId,
    event_id: humanEventId,
    execution_id: activeExecutionId || undefined,
    llm_used: true,
    result: finalClassification
  };
}
