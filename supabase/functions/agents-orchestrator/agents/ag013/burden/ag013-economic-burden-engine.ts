// supabase/functions/agents-orchestrator/agents/ag013/burden/ag013-economic-burden-engine.ts
// Economic Burden Engine for AG-013 (v1.0)
// Frozen under Token: AG013-BAD-ACTOR-ENGINE-001

export interface EconomicBurdenEvaluation {
  economic_burden_score: number;
  cost_intensity_score: number;
  budget_variance_score: number;
  mci_score: number;
  drivers: string[];
}

export class AG013EconomicBurdenEngine {
  public static evaluate(
    costWindow: number | null,
    budgetVariance: number | null,
    mci: number | null
  ): EconomicBurdenEvaluation {
    const drivers: string[] = [];

    if (costWindow === null) {
      return {
        economic_burden_score: 50.0, // Neutral reference when unknown
        cost_intensity_score: 50.0,
        budget_variance_score: 50.0,
        mci_score: 50.0,
        drivers: ['Costo de mantenimiento en ventana no disponible (UNKNOWN)']
      };
    }

    // 1. Cost intensity ($0 to $200,000 reference)
    const costScore = Math.min(100, (costWindow / 200000) * 100);
    if (costWindow >= 100000) {
      drivers.push(`Gasto acumulado de mantenimiento elevado ($${costWindow.toLocaleString()} MXN)`);
    }

    // 2. Budget variance score
    let varScore = 50.0;
    if (typeof budgetVariance === 'number') {
      varScore = Math.min(100, Math.max(0, 50 + budgetVariance * 100));
      if (budgetVariance > 0.20) {
        drivers.push(`Desviación presupuestal desfavorable de +${(budgetVariance * 100).toFixed(1)}%`);
      }
    }

    // 3. MCI score (MCI > 0.40 is considered heavy burden)
    let mciScore = 50.0;
    if (typeof mci === 'number') {
      mciScore = Math.min(100, (mci / 0.60) * 100);
      if (mci >= 0.40) {
        drivers.push(`Índice de Costo de Mantenimiento (MCI) elevado (${(mci * 100).toFixed(1)}%)`);
      }
    }

    const totalScore = Number((costScore * 0.50 + varScore * 0.25 + mciScore * 0.25).toFixed(2));

    return {
      economic_burden_score: totalScore,
      cost_intensity_score: Number(costScore.toFixed(2)),
      budget_variance_score: Number(varScore.toFixed(2)),
      mci_score: Number(mciScore.toFixed(2)),
      drivers
    };
  }
}
