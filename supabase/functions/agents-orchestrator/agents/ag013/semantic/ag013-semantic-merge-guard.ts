// supabase/functions/agents-orchestrator/agents/ag013/semantic/ag013-semantic-merge-guard.ts
// Semantic Merge Guard for AG-013 (v1.0)
// Frozen under Token: AG013-SEMANTIC-LAYER-001
// Invariant: Merges semantic explanation into BadActorAnalysisPackage while guaranteeing protected determinism (§69-71 PRD-AG-013.3)

import type { BadActorAnalysisPackage } from '../types/ag013.types.ts';
import type { AG013SemanticOutput } from '../contracts/ag013-semantic-output.contract.ts';

export class AG013SemanticMergeGuard {
  public static merge(
    deterministicPkg: BadActorAnalysisPackage,
    semanticOutput: AG013SemanticOutput
  ): BadActorAnalysisPackage {
    return {
      ...deterministicPkg,
      semantic_explanation: {
        summary: semanticOutput.summary,
        population_insights: semanticOutput.population_insights,
        critical_asset_narratives: semanticOutput.critical_asset_narratives.map(n => ({
          asset_id: n.asset_id,
          classification_echo: n.classification_echo,
          driver_narrative: n.classification_explanation,
          chronicity_reason: n.chronicity_summary,
          missing_data_notes: n.missing_information_explanation?.join('; ')
        }))
      }
    };
  }
}
