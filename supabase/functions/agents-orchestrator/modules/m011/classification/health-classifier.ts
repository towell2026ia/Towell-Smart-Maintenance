// supabase/functions/agents-orchestrator/modules/m011/classification/health-classifier.ts
// Health State Classifier for M-011 (v1.0)
// Frozen under Token: M011-CLASSIFICATION-RULES-001
// Invariant: Maps score to HEALTHY, WATCH, DEGRADED, CRITICAL, INSUFFICIENT_DATA (§66-69 PRD-M-011.2)

import { classifyHealthState } from '../contracts/m011-health-model.contract.ts';
import type { HealthState } from '../types/m011.types.ts';

export class HealthClassifier {
  public static classify(score: number | null, isSufficient: boolean): HealthState {
    return classifyHealthState(score, isSufficient);
  }
}
