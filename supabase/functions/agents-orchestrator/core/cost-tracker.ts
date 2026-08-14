// supabase/functions/agents-orchestrator/core/cost-tracker.ts
// Cost calculation & Granular Audit Logger for AG-001 Capataz Orquestador v1.0

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { AgentExecution } from '../types/agents.types.ts';
import { config } from './config.ts';

export interface RatesResult {
  price_input_usd: number;
  price_output_usd: number;
  price_cache_usd: number;
  pricing_version: string;
}

/**
 * Fetches dynamic model pricing rates from DB (cat_tarifas_modelo)
 */
export async function fetchModelRates(
  supabase: SupabaseClient | null,
  provider: string,
  model: string
): Promise<RatesResult> {
  const cleanProvider = (provider || "").toLowerCase().trim();
  const cleanModel = (model || "").toLowerCase().trim();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('cat_tarifas_modelo')
        .select('price_input_usd, price_output_usd, price_cached_input_usd, pricing_version')
        .eq('provider', cleanProvider)
        .eq('model', cleanModel)
        .eq('activo', true)
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        return {
          price_input_usd: parseFloat(data.price_input_usd),
          price_output_usd: parseFloat(data.price_output_usd),
          price_cache_usd: parseFloat(data.price_cached_input_usd || 0),
          pricing_version: data.pricing_version
        };
      }
    } catch (err) {
      console.warn('[CostTracker] Exception fetching rates from DB:', err);
    }
  }

  // Fallback rate calculation for GPT-4.1 Nano and Mini ($0.15 / 1M input, $0.60 / 1M output)
  return {
    price_input_usd: 0.15 / 1_000_000,
    price_output_usd: 0.60 / 1_000_000,
    price_cache_usd: 0.03 / 1_000_000,
    pricing_version: '2026-08-DEFAULT'
  };
}

/**
 * Calculates total estimated cost in USD
 */
export function calculateCost(
  rates: RatesResult,
  inputTokens: number,
  outputTokens: number,
  cachedInputTokens: number = 0
): number {
  const standardInput = Math.max(0, inputTokens - cachedInputTokens);
  const total = (standardInput * rates.price_input_usd) +
                (outputTokens * rates.price_output_usd) +
                (cachedInputTokens * rates.price_cache_usd);
  return parseFloat(total.toFixed(10));
}

/**
 * Inserts a granular execution record into bitacora_ejecuciones_agente (Adjustment 6).
 * Nano and Mini log separate entries linked by correlation_id and parent_execution_id.
 */
export async function logExecutionRecord(
  supabase: SupabaseClient | null,
  execData: Partial<AgentExecution>
): Promise<string> {
  const executionId = execData.execution_id || `EXEC-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const record: Record<string, any> = {
    execution_id: executionId,
    parent_execution_id: execData.parent_execution_id || null,
    correlation_id: execData.correlation_id || `CORR-LOCAL-${Date.now()}`,
    agent_id: execData.agent_id || 'AG-001',
    execution_type: execData.execution_type || 'ROUTING_RULE',
    provider: execData.provider || 'none',
    model: execData.model || 'none',
    key_alias: execData.key_alias || 'AI_ROUTER_OPENAI',
    started_at: execData.started_at || new Date().toISOString(),
    completed_at: execData.completed_at || new Date().toISOString(),
    duration_ms: execData.duration_ms || 0,
    input_tokens: execData.input_tokens || 0,
    output_tokens: execData.output_tokens || 0,
    cached_input_tokens: execData.cached_input_tokens || 0,
    reasoning_tokens: execData.reasoning_tokens || 0,
    price_input_usd: execData.price_input_usd || 0,
    price_output_usd: execData.price_output_usd || 0,
    price_cache_usd: execData.price_cache_usd || 0,
    pricing_version: execData.pricing_version || '2026-08-DEFAULT',
    estimated_cost_usd: execData.estimated_cost_usd || 0,
    status: execData.status || 'SUCCESS',
    confidence: execData.confidence ?? null,
    reason_code: execData.reason_code || null,
    target_agent: execData.target_agent || null,
    result: execData.result || null,
    error_message: execData.error_message || null,
    agent_version: execData.agent_version || config.VERSIONS.AGENT_VERSION,
    prompt_version: execData.prompt_version || config.VERSIONS.PROMPT_VERSION,
    schema_version: execData.schema_version || config.VERSIONS.SCHEMA_VERSION,
    validator_version: execData.validator_version || config.VERSIONS.VALIDATOR_VERSION,
    route_version: execData.route_version || config.VERSIONS.ROUTE_VERSION
  };

  if (supabase) {
    try {
      const { error } = await supabase.from('bitacora_ejecuciones_agente').insert(record);
      if (error) {
        console.warn('[CostTracker] Error logging execution to DB:', error.message);
      }
    } catch (e) {
      console.warn('[CostTracker] Exception logging execution to DB:', e);
    }
  }

  return executionId;
}
