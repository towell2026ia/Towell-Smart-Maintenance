// supabase/functions/agents-orchestrator/agents/ag008/decision/should-use-failure-semantic-layer.ts
// Semantic Call Decision Layer for AG-008 (v1.0)
// Frozen under Token: AG008-SEMANTIC-CALL-RULES-001

import type { SemanticFailureInputPayload } from '../contracts/ag008-semantic-input.contract.ts';

export type SemanticCallDecision = 'NO_AI_FAST_PATH' | 'REAL_PROVIDER_REQUIRED';

export interface SemanticDecisionResult {
  decision: SemanticCallDecision;
  reason: string;
}

export function shouldUseFailureSemanticLayer(input: SemanticFailureInputPayload): SemanticDecisionResult {
  // 1. If explicit user question or natural language explanation was requested
  if (input.user_intent && input.user_intent.trim().length > 0) {
    return {
      decision: 'REAL_PROVIDER_REQUIRED',
      reason: 'Solicitud explícita de interpretación/análisis en lenguaje natural por parte del usuario o AG-001.'
    };
  }

  // 2. If deterministic alerts exist (recurrence, reincidence, upward trend, cross-machine)
  if (input.deterministic_alerts && input.deterministic_alerts.length > 0) {
    return {
      decision: 'REAL_PROVIDER_REQUIRED',
      reason: 'Presencia de alertas determinísticas de fallas que requieren resumen ejecutivo contextualizado.'
    };
  }

  // 3. If significant upward trend detected
  if (input.metrics.trend.direction === 'UP' && input.metrics.trend.is_statistically_valid) {
    return {
      decision: 'REAL_PROVIDER_REQUIRED',
      reason: 'Tendencia creciente estadísticamente significativa requiere explicación ejecutiva.'
    };
  }

  // 4. If seasonality was detected
  if (input.metrics.seasonality.status === 'DETECTED') {
    return {
      decision: 'REAL_PROVIDER_REQUIRED',
      reason: 'Patrón estacional cíclico detectado requiere contextualización de periodos.'
    };
  }

  // 5. Default Fast Path: Normal, stable routine check with no alerts -> Fast Path
  return {
    decision: 'NO_AI_FAST_PATH',
    reason: 'Comportamiento rutinario y estable sin alertas técnicas. Salida determinística generada por Fast Path (0 llamadas a IA).'
  };
}
