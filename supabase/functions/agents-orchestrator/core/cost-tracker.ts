// supabase/functions/agents-orchestrator/core/cost-tracker.ts

interface ModelRates {
  price_input_usd: number;     // Price per token (NOT per million)
  price_output_usd: number;    // Price per token
  price_cache_usd: number;     // Price per token for cached input
  pricing_version: string;
}

const PRICING_VERSION = "2026-08-A";

// Rates are per single token (e.g. Rate per Million / 1,000,000)
const MODEL_RATES: Record<string, ModelRates> = {
  "gpt-4.1-nano": {
    price_input_usd: 0.15 / 1_000_000,
    price_output_usd: 0.60 / 1_000_000,
    price_cache_usd: 0.03 / 1_000_000,
    pricing_version: PRICING_VERSION
  },
  "gpt-4.1-mini": {
    price_input_usd: 0.15 / 1_000_000,
    price_output_usd: 0.60 / 1_000_000,
    price_cache_usd: 0.03 / 1_000_000,
    pricing_version: PRICING_VERSION
  },
  "mimo-v2.5": {
    price_input_usd: 0.14 / 1_000_000,
    price_output_usd: 0.28 / 1_000_000,
    price_cache_usd: 0.0028 / 1_000_000, // 0.0028 per million for cache hit
    pricing_version: PRICING_VERSION
  }
};

const DEFAULT_RATES: ModelRates = {
  price_input_usd: 0.0,
  price_output_usd: 0.0,
  price_cache_usd: 0.0,
  pricing_version: "UNKNOWN"
};

export function calculateExecutionCost(
  model: string | null,
  inputTokens: number,
  outputTokens: number,
  cachedInputTokens: number = 0,
  reasoningTokens: number = 0
) {
  const normalizedModel = (model || "").toLowerCase();
  const rates = MODEL_RATES[normalizedModel] || DEFAULT_RATES;

  // Standard input tokens is total input minus cached input
  const standardInputTokens = Math.max(0, inputTokens - cachedInputTokens);
  
  // Calculate cost
  const inputCost = standardInputTokens * rates.price_input_usd;
  const outputCost = outputTokens * rates.price_output_usd;
  const cacheCost = cachedInputTokens * rates.price_cache_usd;
  
  const estimated_cost_usd = inputCost + outputCost + cacheCost;

  return {
    price_input_usd: rates.price_input_usd,
    price_output_usd: rates.price_output_usd,
    price_cache_usd: rates.price_cache_usd,
    pricing_version: rates.pricing_version,
    estimated_cost_usd: parseFloat(estimated_cost_usd.toFixed(12))
  };
}
