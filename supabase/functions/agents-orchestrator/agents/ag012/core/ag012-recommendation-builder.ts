// supabase/functions/agents-orchestrator/agents/ag012/core/ag012-recommendation-builder.ts
// Recommendation Builder creating canonical InterventionRecommendationPackage (v1.0)
// Frozen under Token: AG012-INTERVENTION-RECOMMENDATION-001

import type {
  InterventionRecommendationPackage,
  AG012DecisionContext,
  AG012RecommendationOption,
  DecisionScore,
  DecisionHardRuleResult,
  DataQualitySummary,
  DecisionFact
} from '../types/ag012.types.ts';
import { AG012TraceabilityBuilder } from './ag012-traceability-builder.ts';

export class AG012RecommendationBuilder {
  public static build(
    assetId: string,
    evaluationAt: string,
    decisionContext: AG012DecisionContext,
    recommendation: AG012RecommendationOption,
    scores: DecisionScore[],
    hardRules: DecisionHardRuleResult[],
    dataQuality: DataQualitySummary,
    facts: DecisionFact[],
    missingInfo: string[],
    sha256?: string
  ): InterventionRecommendationPackage {
    const traceability = AG012TraceabilityBuilder.build(evaluationAt, facts.length, sha256);

    return {
      asset_id: assetId,
      evaluation_at: evaluationAt,
      decision_context: decisionContext,
      recommendation,
      decision_scores: scores,
      hard_rules_applied: hardRules,
      data_quality: dataQuality,
      decision_facts: facts,
      missing_information: missingInfo,
      requires_human_approval: true,
      traceability
    };
  }
}
