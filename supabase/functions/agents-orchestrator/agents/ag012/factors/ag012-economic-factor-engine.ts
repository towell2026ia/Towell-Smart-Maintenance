// supabase/functions/agents-orchestrator/agents/ag012/factors/ag012-economic-factor-engine.ts
// Economic Factor Engine calculating MCI & comparative economic indices (v1.0)
// Frozen under Token: AG012-ECONOMIC-FACTOR-ENGINE-001

export class AG012EconomicFactorEngine {
  public static calculateScore(economicData: any): {
    economic_sustainability_score: number; // 0 to 100
    mci?: number;
    description: string;
  } {
    let score = 50;
    let mci: number | undefined = undefined;

    if (
      economicData &&
      economicData.recent_maintenance_cost_12m !== undefined &&
      economicData.estimated_replacement_cost !== undefined &&
      economicData.estimated_replacement_cost > 0
    ) {
      mci = Number((economicData.recent_maintenance_cost_12m / economicData.estimated_replacement_cost).toFixed(3));

      if (mci <= 0.15) {
        score = 90; // muy sostenible económicamente seguir reparando
      } else if (mci <= 0.35) {
        score = 70;
      } else if (mci <= 0.55) {
        score = 45; // zona de renovación
      } else {
        score = 20; // carga económica excesiva, candidato a replace
      }
    } else if (economicData && economicData.recent_maintenance_cost_12m !== undefined) {
      // Si solo tenemos costo reciente sin valor de reemplazo
      score = 50;
    }

    return {
      economic_sustainability_score: score,
      mci,
      description: mci !== undefined
        ? `Índice de Carga de Mantenimiento (MCI): ${(mci * 100).toFixed(1)}%. Puntaje económico: ${score}/100.`
        : `Puntaje económico: ${score}/100 basado en costos certificados de AG-007.`
    };
  }
}
