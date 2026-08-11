// supabase/functions/agents-orchestrator/core/cost-tracker.ts

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface RatesResult {
  price_input_usd: number;
  price_output_usd: number;
  price_cache_usd: number;
  pricing_version: string;
}

/**
 * Consulta las tarifas del modelo de forma dinámica en la base de datos (cat_tarifas_modelo)
 * para garantizar la trazabilidad histórica de costos.
 */
export async function fetchModelRates(
  supabase: SupabaseClient,
  provider: string,
  model: string
): Promise<RatesResult> {
  try {
    const cleanProvider = (provider || "").toLowerCase().trim();
    const cleanModel = (model || "").toLowerCase().trim();

    // Query active rate from DB
    const { data, error } = await supabase
      .from('cat_tarifas_modelo')
      .select('price_input_usd, price_output_usd, price_cached_input_usd, pricing_version')
      .eq('provider', cleanProvider)
      .eq('model', cleanModel)
      .eq('activo', true)
      .order('valid_from', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn('[CostTracker] Error fetching rates from DB:', error.message);
    }

    if (data) {
      return {
        price_input_usd: parseFloat(data.price_input_usd),
        price_output_usd: parseFloat(data.price_output_usd),
        price_cache_usd: parseFloat(data.price_cached_input_usd),
        pricing_version: data.pricing_version
      };
    }
  } catch (err) {
    console.error('[CostTracker] Exception fetching rates:', err);
  }

  // Fallback seguro a tarifas por defecto de v3.3.6 si falla la consulta
  console.log(`[CostTracker] Falling back to default rates for ${provider}/${model}`);
  const isMimo = provider.toLowerCase() === 'mimo';
  
  return {
    price_input_usd: isMimo ? (0.14 / 1_000_000) : (0.15 / 1_000_000),
    price_output_usd: isMimo ? (0.28 / 1_000_000) : (0.60 / 1_000_000),
    price_cache_usd: isMimo ? (0.0028 / 1_000_000) : (0.03 / 1_000_000),
    pricing_version: 'FALLBACK_v3.3.6'
  };
}

/**
 * Calcula el costo estimado en base a los tokens y tarifas
 */
export function calculateCost(
  rates: RatesResult,
  inputTokens: number,
  outputTokens: number,
  cachedInputTokens: number = 0
): number {
  const standardInputTokens = Math.max(0, inputTokens - cachedInputTokens);
  
  const inputCost = standardInputTokens * rates.price_input_usd;
  const outputCost = outputTokens * rates.price_output_usd;
  const cacheCost = cachedInputTokens * rates.price_cache_usd;
  
  const total = inputCost + outputCost + cacheCost;
  return parseFloat(total.toFixed(12));
}
