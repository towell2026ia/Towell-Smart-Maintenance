// supabase/functions/agents-orchestrator/agents/ag013/conflicts/ag013-conflict-detector.ts
// Conflict Detector for AG-013 Analista de Malos Actores v1.0
// Frozen under Token: AG013-BAD-ACTOR-ENGINE-001

export class AG013ConflictDetector {
  public static detect(
    failureBurdenScore: number,
    economicBurdenScore: number,
    healthScore: number | null,
    chronicityScore: number,
    strategyContext?: string | null
  ): string[] {
    const conflicts: string[] = [];

    // 1. High failures but low cost
    if (failureBurdenScore >= 70 && economicBurdenScore <= 30) {
      conflicts.push('CONFLICT_FREQUENCY_VS_COST: Alta frecuencia de fallas pero impacto económico bajo.');
    }

    // 2. High chronicity but high reported health
    if (chronicityScore >= 70 && typeof healthScore === 'number' && healthScore >= 80) {
      conflicts.push('CONFLICT_CHRONICITY_VS_HEALTH: Cronicidad severa pero índice de salud reportado alto.');
    }

    // 3. Strategy REPAIR on high bad actor behavior
    if (strategyContext === 'REPAIR' && chronicityScore >= 80) {
      conflicts.push('CONFLICT_STRATEGY_VS_BAD_ACTOR: AG-012 recomienda REPAIR pero el activo exhibe alta cronicidad analítica.');
    }

    return conflicts;
  }
}
