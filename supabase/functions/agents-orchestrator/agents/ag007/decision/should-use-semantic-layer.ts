// supabase/functions/agents-orchestrator/agents/ag007/decision/should-use-semantic-layer.ts
// Semantic Layer Call Decision & Fast-Path Router for AG-007 (v1.0)
// Frozen under Token: AG007-SEMANTIC-CALL-RULES-001

import type { SemanticInputPayload } from '../contracts/ag007-semantic-input.contract.ts';

export interface SemanticDecisionResult {
  shouldCallLLM: boolean;
  reason: string;
  fastPathType?: 'NO_AI_FAST_PATH' | 'FEATURE_DISABLED' | 'CACHED_FRESH_EXPLANATION';
}

export function shouldUseSemanticLayer(
  input: SemanticInputPayload,
  flags: {
    mimoEnabled?: boolean;
    llmCallsEnabled?: boolean;
    userExplicitAIRequest?: boolean;
    hasFreshCachedExplanation?: boolean;
  } = {}
): SemanticDecisionResult {
  // Flag checks
  if (flags.mimoEnabled === false || flags.llmCallsEnabled === false) {
    return {
      shouldCallLLM: false,
      reason: 'Llamadas LLM deshabilitadas por configuración/flags.',
      fastPathType: 'FEATURE_DISABLED'
    };
  }

  // Cached fresh explanation
  if (flags.hasFreshCachedExplanation) {
    return {
      shouldCallLLM: false,
      reason: 'Existe una explicación semántica vigente en caché.',
      fastPathType: 'CACHED_FRESH_EXPLANATION'
    };
  }

  // User explicitly asked for AI explanation
  if (flags.userExplicitAIRequest) {
    return {
      shouldCallLLM: true,
      reason: 'Solicitud explícita del usuario (AI_RECOMMENDATIONS_REQUESTED).'
    };
  }

  // Trigger on active deterministic alerts
  if (input.deterministic_alerts && input.deterministic_alerts.length > 0) {
    return {
      shouldCallLLM: true,
      reason: `Existen ${input.deterministic_alerts.length} alertas determinísticas activas que requieren explicación.`
    };
  }

  // Trigger on significant budget variance (>15% over or under)
  if (input.variance.variance_pct !== null && Math.abs(input.variance.variance_pct) >= 15.0) {
    return {
      shouldCallLLM: true,
      reason: `Variación presupuestal significativa (${input.variance.variance_pct > 0 ? '+' : ''}${input.variance.variance_pct}%).`
    };
  }

  // Trigger on significant forecast deviation
  if (input.forecast.forecast_total !== null && input.budget.budget_value !== null && input.forecast.forecast_total > input.budget.budget_value) {
    return {
      shouldCallLLM: true,
      reason: 'La proyección de gasto (forecast) sobrepasa el presupuesto asignado.'
    };
  }

  // Default: Fast Path (no need for AI)
  return {
    shouldCallLLM: false,
    reason: 'Snapshot económico estable sin desvíos ni alertas; operando en vía rápida sin IA.',
    fastPathType: 'NO_AI_FAST_PATH'
  };
}
