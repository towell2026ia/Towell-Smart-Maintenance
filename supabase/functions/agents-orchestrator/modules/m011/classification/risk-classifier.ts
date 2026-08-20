// supabase/functions/agents-orchestrator/modules/m011/classification/risk-classifier.ts
// Operational Risk State Classifier for M-011 (v1.0)
// Frozen under Token: M011-CLASSIFICATION-RULES-001
// Invariant: Maps score to LOW, MODERATE, HIGH, CRITICAL, INSUFFICIENT_DATA (§78-80 PRD-M-011.2)

import { classifyRiskState } from '../contracts/m011-risk-model.contract.ts';
import type { RiskState } from '../types/m011.types.ts';

export class RiskClassifier {
  public static classify(score: number | null, isSufficient: boolean): RiskState {
    return classifyRiskState(score, isSufficient);
  }
}
