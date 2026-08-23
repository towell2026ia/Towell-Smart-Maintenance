// supabase/functions/agents-orchestrator/agents/ag013/classification/ag013-score-engine.ts
// Bad Actor Composite Score Engine for AG-013 (v1.0)
// Frozen under Token: AG013-BAD-ACTOR-ENGINE-001

import { AG013BadActorConfigRegistry } from '../config/ag013-bad-actor-config-registry.ts';

export class AG013ScoreEngine {
  public static calculate(
    chronicityScore: number,
    failureBurdenScore: number,
    economicBurdenScore: number,
    healthRiskScore: number,
    interventionIneffectivenessScore: number
  ): number {
    const w = AG013BadActorConfigRegistry.WEIGHTS;

    const composite =
      chronicityScore * w.chronicity +
      failureBurdenScore * w.failure_burden +
      economicBurdenScore * w.economic_burden +
      healthRiskScore * w.health_risk +
      interventionIneffectivenessScore * w.intervention_ineffectiveness;

    return Number(Math.min(100, Math.max(0, composite)).toFixed(2));
  }
}
