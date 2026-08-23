// supabase/functions/agents-orchestrator/agents/ag012/types/ag012.types.ts
// Canonical Type Definitions for AG-012 Repair, Renew or Replace Decision Architecture (v1.0)
// Frozen under Token: AG012-DATA-MAP-001

export type AG012DecisionContext =
  | 'MAJOR_FAILURE'
  | 'REPEATED_FAILURES'
  | 'HIGH_MAINTENANCE_BURDEN'
  | 'LIFECYCLE_REVIEW'
  | 'OBSOLESCENCE_REVIEW'
  | 'CAPEX_PREANALYSIS';

export type AG012RecommendationOption =
  | 'REPAIR'
  | 'RENEW'
  | 'REPLACE'
  | 'INSUFFICIENT_DATA'
  | 'HUMAN_REVIEW_REQUIRED';

export type AG012FactCategory =
  | 'TECHNICAL'
  | 'RELIABILITY'
  | 'ECONOMIC'
  | 'MAINTAINABILITY'
  | 'OBSOLESCENCE'
  | 'OPERATIONAL'
  | 'DATA_QUALITY';

export interface DecisionFact {
  factor_id: string;
  category: AG012FactCategory;
  name: string;
  value: any;
  unit?: string;
  source_agent: string;
  source_reference: string;
  timestamp: string;
  quality: 'CERTIFIED' | 'DERIVED' | 'HYPOTHESIS' | 'UNKNOWN';
}

export interface DataQualitySummary {
  data_sufficiency_index: number; // 0 to 100
  sufficiency_level: 'HIGH' | 'MODERATE' | 'INSUFFICIENT';
  certified_facts_count: number;
  total_required_facts_count: number;
  missing_critical_fields: string[];
}

export interface DecisionScore {
  dimension: string;
  weight_percentage: number;
  raw_score: number; // 0 to 100
  weighted_score: number;
  description: string;
}

export interface DecisionHardRuleResult {
  rule_code: string;
  triggered: boolean;
  forced_recommendation?: AG012RecommendationOption;
  description: string;
}

export interface InterventionRecommendationPackage {
  asset_id: string;
  evaluation_at: string;
  decision_context: AG012DecisionContext;
  recommendation: AG012RecommendationOption;
  decision_scores: DecisionScore[];
  hard_rules_applied: DecisionHardRuleResult[];
  data_quality: DataQualitySummary;
  decision_facts: DecisionFact[];
  missing_information: string[];
  semantic_explanation?: {
    summary: string;
    key_technical_factors: string[];
    key_economic_factors: string[];
    strategic_risks: string[];
    recommendation_rationale: string[];
    provider: 'Xiaomi MiMo';
    model: 'MiMo v2.5';
  };
  requires_human_approval: true;
  traceability: {
    evaluation_at: string;
    decision_engine_version: '1.0';
    data_map_token: 'AG012-DATA-MAP-001';
    deterministic_sha256?: string;
    total_facts_count: number;
    all_facts_traceable: boolean;
  };
}

export interface AG012ExecutionRequest {
  request_id?: string;
  asset_id: string;
  decision_context?: AG012DecisionContext;
  evaluation_at?: string;
  consumer?: string;
  m010_context?: any;
  m011_context?: any;
  ag008_context?: any;
  ag010_context?: any;
  ag011_context?: any;
  ag007_context?: any;
  asset_raw?: any;
}

export interface AG012ExecutionResponse {
  success: boolean;
  agent_id: 'AG-012';
  version: '1.0';
  asset_id: string;
  evaluation_at: string;
  package: InterventionRecommendationPackage;
  telemetry: {
    duration_ms: number;
    llm_calls: number;
    tokens: number;
    cost_usd: number;
    provider: string;
  };
}
