// supabase/functions/agents-orchestrator/agents/ag012/contracts/ag012-semantic-input.contract.ts
// Canonical Semantic Input Contract for AG-012 (v1.0)
// Frozen under Token: AG012-SEMANTIC-INPUT-001

import type { AG012RecommendationOption, DecisionScore, DecisionHardRuleResult, DataQualitySummary, DecisionFact } from '../types/ag012.types.ts';

export interface AG012SemanticInputPayload {
  asset_id: string;
  evaluation_at: string;
  decision_context: string;
  deterministic_recommendation: AG012RecommendationOption;
  decision_scores: DecisionScore[];
  hard_rules_applied: DecisionHardRuleResult[];
  data_quality: DataQualitySummary;
  decision_facts: DecisionFact[];
  missing_information: string[];
  requires_human_approval: true;
  upstream_decision_sha256: string;
}
