// supabase/functions/agents-orchestrator/agents/ag012/semantic/ag012-semantic-merge-guard.ts
// Semantic Merge Guard attaching executive explanation without mutating deterministic fields (v1.0)
// Frozen under Token: AG012-SEMANTIC-LAYER-001

import type { InterventionRecommendationPackage } from '../types/ag012.types.ts';
import type { AG012SemanticOutput } from '../contracts/ag012-semantic-output.contract.ts';

export class AG012SemanticMergeGuard {
  public static merge(
    deterministicPkg: InterventionRecommendationPackage,
    semanticOutput: AG012SemanticOutput
  ): InterventionRecommendationPackage {
    // Clone to preserve immutability
    const merged: InterventionRecommendationPackage = JSON.parse(JSON.stringify(deterministicPkg));

    merged.semantic_explanation = {
      summary: semanticOutput.executive_summary,
      key_technical_factors: semanticOutput.key_technical_drivers,
      key_economic_factors: semanticOutput.key_economic_drivers,
      strategic_risks: semanticOutput.strategic_risks,
      recommendation_rationale: semanticOutput.reevaluation_triggers,
      provider: 'Xiaomi MiMo',
      model: 'MiMo v2.5'
    };

    return merged;
  }
}
