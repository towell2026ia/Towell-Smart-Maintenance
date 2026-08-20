// supabase/functions/agents-orchestrator/modules/m011/scoring/risk-score-aggregator.ts
// Risk Score Aggregator Engine for M-011 (v1.0)
// Frozen under Token: M011-RISK-SCORING-ENGINE-001
// Invariant: Pure deterministic weighted aggregation; score in [0, 100]; null if insufficient (§77-80 PRD-M-011.2)

import { computeRiskScore } from '../contracts/m011-risk-model.contract.ts';
import type { ScoreComponent } from '../types/m011.types.ts';

export class RiskScoreAggregator {
  public static aggregateRiskScore(
    components: ScoreComponent[],
    isSufficient: boolean
  ): number | null {
    if (!isSufficient) return null;
    return computeRiskScore(components);
  }
}
