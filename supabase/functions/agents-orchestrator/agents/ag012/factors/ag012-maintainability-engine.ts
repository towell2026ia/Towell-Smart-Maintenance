// supabase/functions/agents-orchestrator/agents/ag012/factors/ag012-maintainability-engine.ts
// Maintainability Engine evaluating service complexity & MTTR (v1.0)
// Frozen under Token: AG012-MAINTAINABILITY-ENGINE-001

export class AG012MaintainabilityEngine {
  public static calculateScore(failureData: any, memoryData: any): {
    maintainability_score: number; // 0 to 100
    description: string;
  } {
    let score = 60;

    if (memoryData && memoryData.has_approved_repair_procedure) {
      score += 20;
    }

    if (failureData && failureData.mttr_hours && failureData.mttr_hours <= 4) {
      score += 15;
    } else if (failureData && failureData.mttr_hours && failureData.mttr_hours > 12) {
      score -= 20;
    }

    const finalScore = Math.min(100, Math.max(0, score));

    return {
      maintainability_score: finalScore,
      description: `Puntaje de mantenibilidad: ${finalScore}/100 basado en MTTR y procedimientos disponibles.`
    };
  }
}
