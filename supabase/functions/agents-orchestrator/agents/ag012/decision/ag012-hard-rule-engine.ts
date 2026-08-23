// supabase/functions/agents-orchestrator/agents/ag012/decision/ag012-hard-rule-engine.ts
// Hard Rule Engine evaluating deterministic pre-gates HR-01 to HR-04 (v1.0)
// Frozen under Token: AG012-HARD-RULE-ENGINE-001

import type { DecisionHardRuleResult, DataQualitySummary, AG012RecommendationOption } from '../types/ag012.types.ts';

export class AG012HardRuleEngine {
  public static evaluate(
    quality: DataQualitySummary,
    healthScore?: number,
    failureCount12m?: number,
    mci?: number,
    isCriticalObsolescence?: boolean,
    economicData?: any,
    assetRaw?: any
  ): {
    hard_rules: DecisionHardRuleResult[];
    forced_recommendation?: AG012RecommendationOption;
  } {
    const results: DecisionHardRuleResult[] = [];
    let forced: AG012RecommendationOption | undefined = undefined;

    // HR-01: Insuficiencia Crítica de Datos
    if (quality.sufficiency_level === 'INSUFFICIENT' || quality.data_sufficiency_index < 50) {
      results.push({
        rule_code: 'HR-01',
        triggered: true,
        forced_recommendation: 'INSUFFICIENT_DATA',
        description: 'HR-01: Faltan datos críticos indispensables para recomendar responsablemente.'
      });
      forced = 'INSUFFICIENT_DATA';
      return { hard_rules: results, forced_recommendation: forced };
    } else {
      results.push({
        rule_code: 'HR-01',
        triggered: false,
        description: 'HR-01: Suficiencia de datos adecuada.'
      });
    }

    // HR-02: Falla Aislada en Activo Sano
    if (
      healthScore !== undefined && healthScore >= 80 &&
      failureCount12m !== undefined && failureCount12m <= 2 &&
      (mci === undefined || mci <= 0.15)
    ) {
      results.push({
        rule_code: 'HR-02',
        triggered: true,
        forced_recommendation: 'REPAIR',
        description: 'HR-02: Activo en excelente estado de salud con fallas aisladas y costo menor. Aplica REPAIR directo.'
      });
      forced = 'REPAIR';
      return { hard_rules: results, forced_recommendation: forced };
    } else {
      results.push({
        rule_code: 'HR-02',
        triggered: false,
        description: 'HR-02: No aplica regla de reparación directa por salud alta.'
      });
    }

    // HR-03: Obsolescencia Irreversible y Costo Excesivo
    if (isCriticalObsolescence === true && mci !== undefined && mci >= 0.70) {
      results.push({
        rule_code: 'HR-03',
        triggered: true,
        forced_recommendation: 'REPLACE',
        description: 'HR-03: Obsolescencia crítica de fabricante combinada con carga de mantenimiento >= 70% del valor de reposición. Aplica REPLACE.'
      });
      forced = 'REPLACE';
      return { hard_rules: results, forced_recommendation: forced };
    } else {
      results.push({
        rule_code: 'HR-03',
        triggered: false,
        description: 'HR-03: No aplica regla de reemplazo crítico directo.'
      });
    }

    // HR-04: Estructura Sana con Subsistemas Agotados (Renovación / Overhaul)
    if (
      assetRaw && assetRaw.structure_condition === 'GOOD' &&
      assetRaw.subsystems_condition === 'DEGRADED' &&
      economicData && economicData.estimated_renewal_cost && economicData.estimated_replacement_cost &&
      economicData.estimated_renewal_cost <= (economicData.estimated_replacement_cost * 0.45)
    ) {
      results.push({
        rule_code: 'HR-04',
        triggered: true,
        forced_recommendation: 'RENEW',
        description: 'HR-04: Estructura mecánica íntegra con subsistemas agotados y costo de renovación <= 45% del activo nuevo. Aplica RENEW.'
      });
      forced = 'RENEW';
      return { hard_rules: results, forced_recommendation: forced };
    } else {
      results.push({
        rule_code: 'HR-04',
        triggered: false,
        description: 'HR-04: No aplica regla de renovación directa.'
      });
    }

    return { hard_rules: results, forced_recommendation: forced };
  }
}
