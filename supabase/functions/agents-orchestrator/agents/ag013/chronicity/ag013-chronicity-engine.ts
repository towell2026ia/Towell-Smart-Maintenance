// supabase/functions/agents-orchestrator/agents/ag013/chronicity/ag013-chronicity-engine.ts
// Chronicity Engine for AG-013 Analista de Malos Actores v1.0
// Frozen under Token: AG013-BAD-ACTOR-ENGINE-001

export interface ChronicityEvaluation {
  chronicity_score: number;
  multi_period_persistence_score: number;
  post_repair_recurrence_score: number;
  trend_penalty_score: number;
  is_chronic: boolean;
  drivers: string[];
}

export class AG013ChronicityEngine {
  public static evaluate(
    failureCountWindow: number,
    recurrenceRate: number,
    reincidence30dCount: number,
    trend: 'INCREASING' | 'STABLE' | 'DECREASING' = 'STABLE'
  ): ChronicityEvaluation {
    const drivers: string[] = [];

    // 1. Persistence across periods
    let persistenceScore = 0;
    if (failureCountWindow >= 6 && recurrenceRate >= 0.30) {
      persistenceScore = Math.min(100, (failureCountWindow / 10) * 80 + recurrenceRate * 20);
      drivers.push('Persistencia de fallas confirmada en múltiples períodos de la ventana');
    } else if (failureCountWindow >= 3 && recurrenceRate >= 0.20) {
      persistenceScore = 45;
    } else {
      persistenceScore = 15;
    }

    // 2. Post-repair recurrence (short term re-breakage)
    const postRepairScore = Math.min(100, reincidence30dCount * 35);
    if (reincidence30dCount >= 2) {
      drivers.push(`Reincidencias reiteradas en menos de 30 días tras intervención (${reincidence30dCount} eventos)`);
    }

    // 3. Trend penalty
    let trendScore = 40;
    if (trend === 'INCREASING') {
      trendScore = 90;
      drivers.push('Tendencia de fallas en degradación progresiva (creciente)');
    } else if (trend === 'DECREASING') {
      trendScore = 15;
    }

    const totalChronicity = Number((persistenceScore * 0.50 + postRepairScore * 0.35 + trendScore * 0.15).toFixed(2));
    const isChronic = totalChronicity >= 60;

    return {
      chronicity_score: totalChronicity,
      multi_period_persistence_score: Number(persistenceScore.toFixed(2)),
      post_repair_recurrence_score: Number(postRepairScore.toFixed(2)),
      trend_penalty_score: Number(trendScore.toFixed(2)),
      is_chronic: isChronic,
      drivers
    };
  }
}
