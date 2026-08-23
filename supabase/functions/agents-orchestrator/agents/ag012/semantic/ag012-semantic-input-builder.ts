// supabase/functions/agents-orchestrator/agents/ag012/semantic/ag012-semantic-input-builder.ts
// Semantic Input Builder constructing the payload for MiMo (v1.0)
// Frozen under Token: AG012-SEMANTIC-INPUT-001

import type { InterventionRecommendationPackage } from '../types/ag012.types.ts';
import type { AG012SemanticInputPayload } from '../contracts/ag012-semantic-input.contract.ts';

export class AG012SemanticInputBuilder {
  public static build(pkg: InterventionRecommendationPackage, upstreamSha: string): AG012SemanticInputPayload {
    return {
      asset_id: pkg.asset_id,
      evaluation_at: pkg.evaluation_at,
      decision_context: pkg.decision_context,
      deterministic_recommendation: pkg.recommendation,
      decision_scores: pkg.decision_scores,
      hard_rules_applied: pkg.hard_rules_applied,
      data_quality: pkg.data_quality,
      decision_facts: pkg.decision_facts,
      missing_information: pkg.missing_information,
      requires_human_approval: true,
      upstream_decision_sha256: upstreamSha
    };
  }
}
