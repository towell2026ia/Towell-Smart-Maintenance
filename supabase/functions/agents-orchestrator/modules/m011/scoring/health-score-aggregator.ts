// supabase/functions/agents-orchestrator/modules/m011/scoring/health-score-aggregator.ts
// Health Score Aggregator Engine for M-011 (v1.0)
// Frozen under Token: M011-HEALTH-SCORING-ENGINE-001
// Invariant: Pure deterministic weighted aggregation; score in [0, 100]; null if insufficient (§63-65 PRD-M-011.2)

import { computeHealthScore } from '../contracts/m011-health-model.contract.ts';
import type { ScoreComponent } from '../types/m011.types.ts';

export class HealthScoreAggregator {
  public static aggregateHealthScore(
    components: ScoreComponent[],
    isSufficient: boolean
  ): number | null {
    if (!isSufficient) return null;
    return computeHealthScore(components);
  }
}
