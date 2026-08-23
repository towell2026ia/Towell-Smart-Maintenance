// supabase/functions/agents-orchestrator/agents/ag013/classification/ag013-hard-rule-engine.ts
// Hard Rule Engine for AG-013 (v1.0)
// Frozen under Token: AG013-BAD-ACTOR-ENGINE-001

import type { BadActorClassificationCode } from '../types/ag013.types.ts';

export interface HardRuleEvaluationResult {
  triggered_rules: string[];
  forced_classification?: BadActorClassificationCode | null;
}

export class AG013HardRuleEngine {
  public static evaluate(
    dsi: number,
    healthScore: number | null,
    failureCountWindow: number,
    chronicityScore: number,
    recurrenceRate: number,
    badActorScore: number
  ): HardRuleEvaluationResult {
    const triggered: string[] = [];
    let forced: BadActorClassificationCode | null = null;

    // HR-01: Insufficient Data
    if (dsi < 50) {
      triggered.push('HR-01');
      forced = 'INSUFFICIENT_DATA';
      return { triggered_rules: triggered, forced_classification: forced };
    }

    // HR-02: Isolated failure on healthy asset
    if (typeof healthScore === 'number' && healthScore >= 80 && failureCountWindow <= 2 && chronicityScore === 0) {
      triggered.push('HR-02');
      forced = 'NOT_BAD_ACTOR';
      return { triggered_rules: triggered, forced_classification: forced };
    }

    // HR-03: Severe chronic degradation
    if (chronicityScore >= 80 && recurrenceRate > 0.40 && badActorScore >= 85) {
      triggered.push('HR-03');
      forced = 'SEVERE_BAD_ACTOR';
      return { triggered_rules: triggered, forced_classification: forced };
    }

    return { triggered_rules: triggered, forced_classification: null };
  }
}
