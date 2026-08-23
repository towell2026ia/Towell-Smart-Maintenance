// supabase/functions/agents-orchestrator/agents/ag012/conflicts/ag012-decision-conflict-detector.ts
// Decision Conflict Detector identifying contradictory signals across domains (v1.0)
// Frozen under Token: AG012-CONFLICT-ENGINE-001

export class AG012DecisionConflictDetector {
  public static detect(
    healthScore?: number,
    failureCount12m?: number,
    recentCost?: number,
    estimatedReplacementCost?: number
  ): string[] {
    const conflicts: string[] = [];

    // Conflicto: Salud alta pero frecuencia de fallas extrema
    if (healthScore !== undefined && healthScore >= 80 && failureCount12m !== undefined && failureCount12m >= 8) {
      conflicts.push('Conflicto detectado: Health Score alto (>=80) pero frecuencia de fallas en 12m elevada (>=8).');
    }

    // Conflicto: Costo de mantenimiento mayor al valor de reemplazo pero reporte de condición excelente
    if (
      recentCost !== undefined &&
      estimatedReplacementCost !== undefined &&
      estimatedReplacementCost > 0 &&
      recentCost > estimatedReplacementCost &&
      healthScore !== undefined &&
      healthScore >= 85
    ) {
      conflicts.push('Conflicto detectado: Costo de mantenimiento supera costo de reposición pero Health Score reporta condición excelente.');
    }

    return conflicts;
  }
}
