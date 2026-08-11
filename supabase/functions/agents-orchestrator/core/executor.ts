// supabase/functions/agents-orchestrator/core/executor.ts

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { AgentEvent, AgentExecution, Agent } from '../types/agents.types.ts';
import { generateIdempotencyKey, checkIdempotency } from './idempotency.ts';
import { resolveAgentRoute } from './router.ts';
import { validateEventPayload, validateAgentOutput } from './validator.ts';
import { createApprovalRequest } from './approvals.ts';
import { callOpenAI } from '../providers/openai-adapter.ts';
import { callMiMo } from '../providers/mimo-adapter.ts';
import { calculateExecutionCost } from './cost-tracker.ts';

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

interface ExecutionResult {
  success: boolean;
  status: string;
  correlation_id: string;
  event_id?: string;
  result?: any;
  error?: string;
}

export async function executeAgentFlow(
  supabase: SupabaseClient,
  eventCode: string,
  clientPayload: Record<string, any>,
  correlationId: string | null,
  secrets: { OPENAI_API_KEY?: string; MIMO_API_KEY?: string; AI_AGENTS_ENABLED?: string }
): Promise<ExecutionResult> {
  const startedAt = new Date().toISOString();
  const corrId = correlationId || `CORR-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`.toUpperCase();
  const humanEventId = `EVT-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`.toUpperCase();
  
  // 1. Generar e iniciar Idempotencia Server-Side
  const idempotencyKey = await generateIdempotencyKey(eventCode, clientPayload);
  const idemCheck = await checkIdempotency(supabase, idempotencyKey);

  if (idemCheck.exists) {
    console.log(`[Executor] Idempotency Hit for key ${idempotencyKey}. Status: ${idemCheck.status}`);
    return {
      success: idemCheck.status === 'COMPLETADO' || idemCheck.status === 'REQUIERE_APROBACION',
      status: idemCheck.status || 'FALLIDO',
      correlation_id: corrId,
      result: idemCheck.result,
      error: idemCheck.status === 'FALLIDO' ? 'Ejecución duplicada fallida originalmente' : undefined
    };
  }

  // 2. Resolver la ruta determinista
  const route = await resolveAgentRoute(supabase, eventCode);
  if (!route.agent_id) {
    return { success: false, status: 'FALLIDO', correlation_id: corrId, error: 'No se pudo resolver agente de destino.' };
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
    console.error('[Executor] Error creating events_agente record:', insErr?.message);
    return { success: false, status: 'FALLIDO', correlation_id: corrId, error: insErr?.message || 'Error de BD' };
  }

  const dbEventId = dbEvent.id_evento;

  // Actualizar a EN_PROCESO
  await supabase
    .from('eventos_agente')
    .update({ estatus: 'EN_PROCESO', fecha_actualizacion: new Date().toISOString() })
    .eq('id_evento', dbEventId);

  // 4. Validar payload del cliente contra campos obligatorios si el evento es conocido
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

  // 5. Verificar si el agente de destino está activo
  if (!route.activo) {
    await supabase
      .from('eventos_agente')
      .update({ estatus: 'FALLIDO', fecha_actualizacion: new Date().toISOString() })
      .eq('id_evento', dbEventId);
    return { success: false, status: 'FALLIDO', correlation_id: corrId, event_id: humanEventId, error: `El agente de destino '${route.agent_id}' está desactivado en la configuración.` };
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
      pricing_version: 'none',
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
    
    // Actualizar evento a COMPLETADO
    await supabase
      .from('eventos_agente')
      .update({ estatus: 'COMPLETADO', fecha_actualizacion: new Date().toISOString() })
      .eq('id_evento', dbEventId);

    return {
      success: true,
      status: 'COMPLETADO',
      correlation_id: corrId,
      event_id: humanEventId,
      result: dbExec.result
    };
  }

  // 7. ENRUTAMIENTO POR IA (AG-001 Clasificador)
  // Verificar Feature Flag de IA en el servidor (RF-006 / Seguridad 6)
  const aiAgentsEnabled = (secrets.AI_AGENTS_ENABLED || 'false') === 'true';
  if (!aiAgentsEnabled) {
    await supabase
      .from('eventos_agente')
      .update({ estatus: 'FALLIDO', fecha_actualizacion: new Date().toISOString() })
      .eq('id_evento', dbEventId);
    return { success: false, status: 'FALLIDO', correlation_id: corrId, event_id: humanEventId, error: 'IA deshabilitada en el servidor (AI_AGENTS_ENABLED = false)' };
  }

  const openAiKey = secrets.OPENAI_API_KEY || '';
  if (!openAiKey) {
    await supabase
      .from('eventos_agente')
      .update({ estatus: 'FALLIDO', fecha_actualizacion: new Date().toISOString() })
      .eq('id_evento', dbEventId);
    return { success: false, status: 'FALLIDO', correlation_id: corrId, event_id: humanEventId, error: 'Falta configurar OPENAI_API_KEY en el servidor.' };
  }

  // 7.1. Clasificar con GPT-4.1 Nano (Plan D)
  let modelUsed = 'gpt-4.1-nano';
  let aliasUsed: 'AI_ROUTER_OPENAI' | 'AI_DOCUMENT_OPENAI' = 'AI_ROUTER_OPENAI';
  let aiResp;
  let validationError: string | null = null;
  let parseResult: any = null;

  try {
    const systemPrompt = `Eres AG-001 (Capataz Orquestador) de TSM-AI. Clasifica este mensaje en una de las intenciones de agentes de mantenimiento. Retorna estrictamente la estructura del esquema JSON.`;
    const userPrompt = clientPayload.texto || JSON.stringify(clientPayload);
    
    aiResp = await callOpenAI(openAiKey, modelUsed, systemPrompt, userPrompt, CAPATAZ_JSON_SCHEMA);
    parseResult = JSON.parse(aiResp.text);
    
    // Validar semánticamente la salida del clasificador
    const valOut = validateAgentOutput('AG-001', parseResult);
    if (!valOut.isValid) {
      validationError = valOut.error;
    }
  } catch (err: any) {
    validationError = err.message;
  }

  // 7.2. FALLBACK SEMÁNTICO (Plan E: Si Nano falla, escalar a GPT-4.1 Mini)
  if (validationError) {
    console.warn(`[Executor] GPT-4.1 Nano falló validación semántica (${validationError}). Escalando a GPT-4.1 Mini...`);
    modelUsed = 'gpt-4.1-mini';
    aliasUsed = 'AI_DOCUMENT_OPENAI';
    
    try {
      const systemPrompt = `Eres AG-001 (Capataz Orquestador) con nivel de atención superior. Clasifica el mensaje bajo la estructura JSON estricta.`;
      const userPrompt = clientPayload.texto || JSON.stringify(clientPayload);
      
      aiResp = await callOpenAI(openAiKey, modelUsed, systemPrompt, userPrompt, CAPATAZ_JSON_SCHEMA);
      parseResult = JSON.parse(aiResp.text);
      
      const valOut = validateAgentOutput('AG-001', parseResult);
      if (!valOut.isValid) {
        validationError = `Fallback fallido: ${valOut.error}`;
      } else {
        validationError = null; // Éxito en fallback
      }
    } catch (err: any) {
      validationError = `Excepción en fallback: ${err.message}`;
    }
  }

  // 8. Calcular Costos y Registrar Ejecución (Cost Tracker)
  const completedAt = new Date().toISOString();
  const duration = new Date(completedAt).getTime() - new Date(startedAt).getTime();
  
  let statusExec: 'SUCCESS' | 'FAILED' | 'REJECTED_VALIDATOR' = 'SUCCESS';
  if (validationError) {
    statusExec = 'REJECTED_VALIDATOR';
  }

  const rates = calculateExecutionCost(
    modelUsed,
    aiResp?.inputTokens || 0,
    aiResp?.outputTokens || 0,
    aiResp?.cachedInputTokens || 0,
    aiResp?.reasoningTokens || 0
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
    estimated_cost_usd: rates.estimated_cost_usd,
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

  // 9. Manejo de Niveles de Autoridad y Aprobación Humana (Nivel 2)
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
      correlation_id: corrId,
      event_id: humanEventId,
      result: {
        ...parseResult,
        approval_id: appResult.id
      }
    };
  }

  // Si no requiere aprobación, completar evento
  await supabase
    .from('eventos_agente')
    .update({ estatus: 'COMPLETADO', fecha_actualizacion: new Date().toISOString() })
    .eq('id_evento', dbEventId);

  return {
    success: true,
    status: 'COMPLETADO',
    correlation_id: corrId,
    event_id: humanEventId,
    result: parseResult
  };
}
