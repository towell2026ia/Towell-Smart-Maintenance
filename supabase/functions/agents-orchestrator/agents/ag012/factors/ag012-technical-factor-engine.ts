// supabase/functions/agents-orchestrator/agents/ag012/factors/ag012-technical-factor-engine.ts
// Technical Factor Engine evaluating repairability & structure (v1.0)
// Frozen under Token: AG012-TECHNICAL-FACTOR-ENGINE-001

export class AG012TechnicalFactorEngine {
  public static calculateScore(rcaData: any, memoryData: any, assetData: any): {
    technical_repairability_score: number; // 0 to 100
    description: string;
  } {
    let score = 50; // base neutral

    if (memoryData && memoryData.has_approved_repair_procedure) {
      score += 25;
    }

    if (rcaData && rcaData.has_confirmed_root_cause) {
      score += 15;
    }

    if (assetData && assetData.year && assetData.year >= 2018) {
      score += 10;
    }

    const finalScore = Math.min(100, Math.max(0, score));

    return {
      technical_repairability_score: finalScore,
      description: `Puntaje de viabilidad técnica y reparabilidad: ${finalScore}/100 basado en causa raíz confirmada y memoria técnica aprobada.`
    };
  }
}
