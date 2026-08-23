// supabase/functions/agents-orchestrator/agents/ag012/decision/ag012-decision-matrix.ts
// Deterministic Multi-Criteria Decision Matrix Engine (v1.0)
// Frozen under Token: AG012-DECISION-MATRIX-001

import type { DecisionScore, AG012RecommendationOption, DecisionHardRuleResult } from '../types/ag012.types.ts';

export class AG012DecisionMatrix {
  public static resolveRecommendation(
    scores: DecisionScore[],
    hardRules: DecisionHardRuleResult[],
    forcedRecommendation?: AG012RecommendationOption
  ): {
    recommendation: AG012RecommendationOption;
    total_composite_score: number;
  } {
    // 1. Si existe una regla dura disparada, tiene precedencia absoluta
    if (forcedRecommendation) {
      return {
        recommendation: forcedRecommendation,
        total_composite_score: 0
      };
    }

    // 2. Suma de scores ponderados (0 to 100)
    const compositeScore = Number(scores.reduce((acc, s) => acc + s.weighted_score, 0).toFixed(2));

    // 3. Umbrales determinísticos
    // >= 65: Alta viabilidad de reparación estándar -> REPAIR
    // 40 <= score < 65: Estado intermedio con degradación en subsistemas -> RENEW
    // < 40: Degradación severa en múltiples dimensiones -> REPLACE
    let recommendation: AG012RecommendationOption = 'REPAIR';

    if (compositeScore >= 65) {
      recommendation = 'REPAIR';
    } else if (compositeScore >= 40) {
      recommendation = 'RENEW';
    } else {
      recommendation = 'REPLACE';
    }

    return {
      recommendation,
      total_composite_score: compositeScore
    };
  }
}
