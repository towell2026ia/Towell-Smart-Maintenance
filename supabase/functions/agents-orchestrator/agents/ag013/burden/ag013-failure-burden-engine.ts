// supabase/functions/agents-orchestrator/agents/ag013/burden/ag013-failure-burden-engine.ts
// Failure Burden Engine for AG-013 (v1.0)
// Frozen under Token: AG013-BAD-ACTOR-ENGINE-001

export interface FailureBurdenEvaluation {
  failure_burden_score: number;
  failure_density_score: number;
  recurrence_penalty_score: number;
  downtime_penalty_score: number;
  drivers: string[];
}

export class AG013FailureBurdenEngine {
  public static evaluate(
    failureCountWindow: number,
    recurrenceRate: number,
    downtimeHours: number,
    exposureFactor: number = 1.0
  ): FailureBurdenEvaluation {
    const drivers: string[] = [];

    // 1. Normalized failure count (normalized by exposure if available)
    const effectiveCount = failureCountWindow / Math.max(0.5, exposureFactor);
    const countScore = Math.min(100, (effectiveCount / 10) * 100);
    if (failureCountWindow >= 6) {
      drivers.push(`Frecuencia elevada de fallas en ventana (${failureCountWindow} eventos)`);
    }

    // 2. Recurrence penalty
    const recurrenceScore = Math.min(100, recurrenceRate * 100);
    if (recurrenceRate >= 0.35) {
      drivers.push(`Alta tasa de recurrencia en modo de falla (${(recurrenceRate * 100).toFixed(1)}%)`);
    }

    // 3. Downtime impact score
    const downtimeScore = Math.min(100, (downtimeHours / 40) * 100);
    if (downtimeHours >= 20) {
      drivers.push(`Impacto significativo en tiempo de paro (${downtimeHours.toFixed(1)} hrs)`);
    }

    // Weighted composite failure burden score
    const totalScore = Number((countScore * 0.40 + recurrenceScore * 0.40 + downtimeScore * 0.20).toFixed(2));

    return {
      failure_burden_score: totalScore,
      failure_density_score: Number(countScore.toFixed(2)),
      recurrence_penalty_score: Number(recurrenceScore.toFixed(2)),
      downtime_penalty_score: Number(downtimeScore.toFixed(2)),
      drivers
    };
  }
}
