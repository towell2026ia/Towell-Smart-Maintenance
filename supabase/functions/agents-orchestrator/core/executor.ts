// supabase/functions/agents-orchestrator/core/executor.ts

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { AgentExecution } from '../types/agents.types.ts';
import { generateIdempotencyKey, checkIdempotency } from './idempotency.ts';
import { resolveAgentRoute } from './router.ts';
import { validateEventPayload, validateAgentOutput } from './validator.ts';
import { createApprovalRequest } from './approvals.ts';
import { callOpenAI } from '../providers/openai-adapter.ts';
import { calculateCost, fetchModelRates } from './cost-tracker.ts';

// Schema para la respuesta estructurada de clasificación de AG-001
const CAPATAZ_JSON_SCHEMA = {
  type: 'object',
  properties: {
    status: { type: 'string', enum: ['SUCCESS', 'FAILED'] },
    agente_destino: { type: 'string' },
    findings: { type: 'array', items: { type: 'string' } },
    recommendations: { type: 'array', items: { type: 'string' } },
    requires_action: { type: 'boolean' },
    requires_approval: { type: 'boolean' },
    confidence: { type: 'number' },
    payload_procesado: { type: 'object', additionalProperties: true }
  },
  required: ['status', 'agente_destino', 'findings', 'recommendations', 'requires_action', 'requires_approval', 'confidence', 'payload_procesado'],
  additionalProperties: false
};

interface SecretsConfig {
  OPENAI_API_KEY?: string;
  MIMO_API_KEY?: string;
  MULTIAGENT_ENABLED?: string;
  LLM_CALLS_ENABLED?: string;
  AI_ROUTER_ENABLED?: string;
  OPENAI_ENABLED?: string;
  MIMO_ENABLED?: string;
}

interface ExecutionResult {
  success: boolean;
  status: string;
  event_code?: string;
  agent_id?: string;
  routing_type?: 'DETERMINISTIC' | 'AI_CLASSIFICATION' | 'NONE';
  correlation_id: string;
  event_id?: string;
  llm_used?: boolean;
  result?: any;
  error?: string;
}

export async function executeAgentFlow(
  supabase: SupabaseClient,
  eventCode: string,
  clientPayload: Record<string, any>,
  correlationId: string | null,
  secrets: SecretsConfig
): Promise<ExecutionResult> {
  const startedAt = new Date().toISOString();
  const corrId = correlationId || `CORR-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`.toUpperCase();
  const humanEventId = `EVT-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`.toUpperCase();
  
  // 0. Evaluar Feature Flags Server-side (Fase A)
  const isMultiagentEnabled = (secrets.MULTIAGENT_ENABLED || 'false') === 'true';
  if (!isMultiagentEnabled) {
    return {
      success: false,
      status: 'FALLIDO',
      correlation_id: corrId,
      error: 'La arquitectura multiagente está deshabilitada en el servidor (MULTIAGENT_ENABLED = false)'
    };
  }

  // 1. Generar e iniciar Idempotencia Server-Side
  const idempotencyKey = await generateIdempotencyKey(eventCode, clientPayload);
  const idemCheck = await checkIdempotency(supabase, idempotencyKey);

  if (idemCheck.exists) {
    console.log(`[Executor] Idempotency Hit for key ${idempotencyKey}. Status: ${idemCheck.status}`);
    return {
      success: idemCheck.status === 'ENRUTADO' || idemCheck.status === 'COMPLETADO' || idemCheck.status === 'REQUIERE_APROBACION',
      status: idemCheck.status || 'FALLIDO',
      event_code: eventCode.toUpperCase(),
      correlation_id: corrId,
      result: idemCheck.result,
      error: idemCheck.status === 'FALLIDO' ? 'Ejecución duplicada fallida originalmente' : undefined
    };
  }

  // 2. Resolver la ruta determinista
  const route = await resolveAgentRoute(supabase, eventCode);
  if (!route.agent_id) {
    return { success: false, status: 'FALLIDO', correlation_id: corrId, error: `No se pudo resolver agente de destino para: ${eventCode}.` };
  }

  // 3. Crear registro del evento en la tabla eventos_agente
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

  if (insErr || !dbEvent) {
    console.error('[Executor] Error creating eventos_agente record:', insErr?.message);
    return { success: false, status: 'FALLIDO', correlation_id: corrId, error: insErr?.message || 'Error de BD al crear evento.' };
  }

  const dbEventId = dbEvent.id_evento;

  // Actualizar a EN_PROCESO
  await supabase
    .from('eventos_agente')
    .update({ estatus: 'EN_PROCESO', fecha_actualizacion: new Date().toISOString() })
    .eq('id_evento', dbEventId);

  // 4. Validar payload del cliente contra campos obligatorios si el evento es conocido
  // (El validador limpia cualquier inyección de agent_id/model del cliente por seguridad)
  if (route.es_conocido) {
    const valResult = validateEventPayload(eventCode, clientPayload, route.required_fields);
    if (!valResult.isValid) {
      await supabase
        .from('eventos_agente')
        .update({ estatus: 'FALLIDO', fecha_actualizacion: new Date().toISOString() })
        .eq('id_evento', dbEventId);
      return { success: false, status: 'FALLIDO', correlation_id: corrId, event_id: humanEventId, error: valResult.error || 'Payload inválido' };
    }
  }

  // 5. Verificar si el agente de destino está activo en el catálogo
  if (!route.activo) {
    await supabase
      .from('eventos_agente')
      .update({ estatus: 'FALLIDO', fecha_actualizacion: new Date().toISOString() })
      .eq('id_evento', dbEventId);
    return {
      success: false,
      status: 'FALLIDO',
      correlation_id: corrId,
      event_id: humanEventId,
      error: `BLOCKED_AGENT_DISABLED: El agente destino '${route.agent_id}' está desactivado.`
    };
  }

  // 6. ENRUTAMIENTO DETERMINÍSTICO (P-01: Conocido, 0 Tokens para el enrutador)
  if (route.es_conocido) {
    const completedAt = new Date().toISOString();
    const duration = new Date(completedAt).getTime() - new Date(startedAt).getTime();
    
    const dbExec: AgentExecution = {
      execution_id: `EXEC-RULE-${Date.now()}`.toUpperCase(),
      event_id: dbEventId,
      correlation_id: corrId,
      agent_id: 'AG-001',
      execution_type: 'ROUTING_RULE',
      provider: 'none',
      model: 'none',
      key_alias: 'NONE',
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
      pricing_version: 'DETERMINISTIC_TARIFF',
      estimated_cost_usd: 0,
      status: 'SUCCESS',
      confidence: 1.0,
      result: {
        agente_destino: route.agent_id,
        metodo: 'REGLA_DETERMINISTICA',
        requiere_ia: false
      },
      error_message: null
    };

    await supabase.from('bitacora_ejecuciones_agente').insert([dbExec]);
    
    // Cambiado de COMPLETADO a ENRUTADO (Punto 2)
    await supabase
      .from('eventos_agente')
      .update({ estatus: 'ENRUTADO', fecha_actualizacion: new Date().toISOString() })
      .eq('id_evento', dbEventId);

    return {
      success: true,
      status: 'ENRUTADO',
      event_code: eventCode.toUpperCase(),
      agent_id: route.agent_id,
      routing_type: 'DETERMINISTIC',
      correlation_id: corrId,
      event_id: humanEventId,
      llm_used: false,
      result: dbExec.result
    };
  }

  // 7. ENRUTAMIENTO POR IA (AG-001 Clasificador)
  // Evaluar flags de IA: LLM_CALLS_ENABLED y AI_ROUTER_ENABLED (Punto 1 y 6)
  const isLlmCallsEnabled = (secrets.LLM_CALLS_ENABLED || 'false') === 'true';
  const isAiRouterEnabled = (secrets.AI_ROUTER_ENABLED || 'false') === 'true';
  const isOpenaiEnabled = (secrets.OPENAI_ENABLED || 'false') === 'true';

  if (!isLlmCallsEnabled || !isAiRouterEnabled || !isOpenaiEnabled) {
    await supabase
      .from('eventos_agente')
      .update({ estatus: 'FALLIDO', fecha_actualizacion: new Date().toISOString() })
      .eq('id_evento', dbEventId);
    return {
      success: false,
      status: 'FALLIDO',
      correlation_id: corrId,
      event_id: humanEventId,
      error: `LLM_DISABLED: La llamadas de IA / Router están desactivadas en la configuración.`
    };
  }

  const openAiKey = secrets.OPENAI_API_KEY || '';
  if (!openAiKey) {
    await supabase
      .from('eventos_agente')
      .update({ estatus: 'FALLIDO', fecha_actualizacion: new Date().toISOString() })
      .eq('id_evento', dbEventId);
    return { success: false, status: 'FALLIDO', correlation_id: corrId, event_id: humanEventId, error: 'Falta configurar OPENAI_API_KEY en el servidor.' };
  }

  // 7.1. Clasificar con GPT-4.1 Nano
  let modelUsed = 'gpt-4.1-nano';
  let aliasUsed: 'AI_ROUTER_OPENAI' | 'AI_DOCUMENT_OPENAI' = 'AI_ROUTER_OPENAI';
  let aiResp;
  let validationError: string | null = null;
  let parseResult: any = null;

  try {
    const systemPrompt = `Eres AG-001 (Capataz Orquestador) de TSM-AI. Clasifica este mensaje en una de las intenciones de agentes de mantenimiento. Retorna estrictamente la estructura del esquema JSON.`;
    const userPrompt = clientPayload.texto || JSON.stringify(clientPayload);
    
    // Si la entrada simula un fallo para forzar fallback (Punto 9)
    if (clientPayload.simular_fallback === true || (clientPayload.texto && clientPayload.texto.includes('SIMULATE_FALLBACK_SEMANTIC'))) {
      throw new Error('Simulated payload error to test fallback to Mini');
    }

    aiResp = await callOpenAI(openAiKey, modelUsed, systemPrompt, userPrompt, CAPATAZ_JSON_SCHEMA);
    parseResult = JSON.parse(aiResp.text);
    
    const valOut = validateAgentOutput('AG-001', parseResult);
    if (!valOut.isValid) {
      validationError = valOut.error;
    }
  } catch (err: any) {
    validationError = err.message;
  }

  // 7.2. Fallback semántico a GPT-4.1 Mini
  if (validationError) {
    console.warn(`[Executor] GPT-4.1 Nano falló validación semántica (${validationError}). Escalando a GPT-4.1 Mini...`);
    modelUsed = 'gpt-4.1-mini';
    aliasUsed = 'AI_DOCUMENT_OPENAI';
    
    try {
      const systemPrompt = `Eres AG-001 (Capataz Orquestador) con nivel de atención superior. Clasifica el mensaje bajo la estructura JSON estricta.`;
      const userPrompt = clientPayload.texto || JSON.stringify(clientPayload);
      
      // Si simula un fallo completo de fallback
      if (clientPayload.simular_fallback_mini === true) {
        throw new Error('Simulated payload error to test full fallback failure');
      }

      aiResp = await callOpenAI(openAiKey, modelUsed, systemPrompt, userPrompt, CAPATAZ_JSON_SCHEMA);
      parseResult = JSON.parse(aiResp.text);
      
      const valOut = validateAgentOutput('AG-001', parseResult);
      if (!valOut.isValid) {
        validationError = `Fallback fallido: ${valOut.error}`;
      } else {
        validationError = null; // Éxito
      }
    } catch (err: any) {
      validationError = `Excepción en fallback: ${err.message}`;
    }
  }

  // 8. Calcular Costos y Registrar Ejecución (Cost Tracker dinámico)
  const completedAt = new Date().toISOString();
  const duration = new Date(completedAt).getTime() - new Date(startedAt).getTime();
  
  let statusExec: 'SUCCESS' | 'FAILED' | 'REJECTED_VALIDATOR' = 'SUCCESS';
  if (validationError) {
    statusExec = 'REJECTED_VALIDATOR';
  }

  // Cargar tarifas reales de la base de datos (Punto 3)
  const rates = await fetchModelRates(supabase, 'openai', modelUsed);
  const costUsd = calculateCost(
    rates,
    aiResp?.inputTokens || 0,
    aiResp?.outputTokens || 0,
    aiResp?.cachedInputTokens || 0
  );

  const dbExec: AgentExecution = {
    execution_id: `EXEC-AI-${Date.now()}`.toUpperCase(),
    event_id: dbEventId,
    correlation_id: corrId,
    agent_id: 'AG-001',
    execution_type: 'AGENT_EXECUTION',
    provider: 'openai',
    model: modelUsed,
    key_alias: aliasUsed,
    started_at: startedAt,
    completed_at: completedAt,
    duration_ms: duration,
    input_tokens: aiResp?.inputTokens || 0,
    output_tokens: aiResp?.outputTokens || 0,
    cached_input_tokens: aiResp?.cachedInputTokens || 0,
    reasoning_tokens: aiResp?.reasoningTokens || 0,
    price_input_usd: rates.price_input_usd,
    price_output_usd: rates.price_output_usd,
    price_cache_usd: rates.price_cache_usd,
    pricing_version: rates.pricing_version,
    estimated_cost_usd: costUsd,
    status: statusExec,
    confidence: parseResult?.confidence || 0.0,
    result: parseResult || null,
    error_message: validationError
  };

  await supabase.from('bitacora_ejecuciones_agente').insert([dbExec]);

  if (validationError) {
    await supabase
      .from('eventos_agente')
      .update({ estatus: 'FALLIDO', fecha_actualizacion: new Date().toISOString() })
      .eq('id_evento', dbEventId);
    return { success: false, status: 'FALLIDO', correlation_id: corrId, event_id: humanEventId, error: validationError };
  }

  // 9. Aprobaciones manuales en TSM-AI para Nivel 2
  const reqApproval = parseResult.requires_approval || false;
  if (reqApproval) {
    const appResult = await createApprovalRequest(supabase, {
      correlation_id: corrId,
      event_id: dbEventId,
      agent_id: parseResult.agente_destino,
      tipo_accion: 'ENRUTAMIENTO_IA_REQUIERE_APROBACION',
      propuesta_payload: parseResult.payload_procesado
    });
    
    return {
      success: true,
      status: 'REQUIERE_APROBACION',
      event_code: eventCode.toUpperCase(),
      agent_id: parseResult.agente_destino,
      routing_type: 'AI_CLASSIFICATION',
      correlation_id: corrId,
      event_id: humanEventId,
      llm_used: true,
      result: {
        ...parseResult,
        approval_id: appResult.id
      }
    };
  }

  // Si no requiere aprobación, completar evento como enrutado para procesamiento posterior
  await supabase
    .from('eventos_agente')
    .update({ estatus: 'ENRUTADO', fecha_actualizacion: new Date().toISOString() })
    .eq('id_evento', dbEventId);

  return {
    success: true,
    status: 'ENRUTADO',
    event_code: eventCode.toUpperCase(),
    agent_id: parseResult.agente_destino,
    routing_type: 'AI_CLASSIFICATION',
    correlation_id: corrId,
    event_id: humanEventId,
    llm_used: true,
    result: parseResult
  };
}
