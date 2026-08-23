// supabase/functions/agents-orchestrator/agents/ag013/types/ag013.types.ts
// Domain Types for AG-013 Analista de Malos Actores v1.0
// Frozen under Token: AG013-DATA-MAP-001

export type BadActorClassificationCode =
  | 'NOT_BAD_ACTOR'
  | 'WATCHLIST'
  | 'BAD_ACTOR'
  | 'SEVERE_BAD_ACTOR'
  | 'INSUFFICIENT_DATA';

export type PopulationScope =
  | 'PLANT_WIDE'
  | 'AREA_SPECIFIC'
  | 'FAMILY_SPECIFIC';

export type AnalysisWindow =
  | 'ROLLING_90D'
  | 'ROLLING_180D'
  | 'ROLLING_365D';

export interface AssetContextRaw {
  id: string;
  codigo_maquina: string;
  nombre: string;
  area: string;
  linea?: string | null;
  machine_family: string;
  criticality: 'HIGH' | 'MEDIUM' | 'LOW';
  activo: boolean;
  operating_hours_window?: number;
}

export interface AG008FailureContextRaw {
  failure_count_window: number;
  recurrence_rate: number;
  reincidence_count_30d: number;
  downtime_hours: number;
  mtbf_hours?: number;
  mttr_hours?: number;
  trend?: 'INCREASING' | 'STABLE' | 'DECREASING';
}

export interface AG007EconomicContextRaw {
  maintenance_cost_window: number;
  budget_window?: number;
  budget_variance?: number;
  estimated_replacement_cost?: number;
  mci?: number;
  currency: string;
}

export interface M011HealthContextRaw {
  health_score?: number;
  risk_score?: number;
}

export interface AG010RCAContextRaw {
  has_confirmed_rca: boolean;
  root_cause?: string;
}

export interface AG011MemoryContextRaw {
  has_approved_memory: boolean;
  repeated_unsuccessful_interventions_count?: number;
}

export interface AG012StrategyContextRaw {
  recommended_strategy?: 'REPAIR' | 'RENEW' | 'REPLACE' | 'INSUFFICIENT_DATA';
}

export interface BadActorSingleAssetInput {
  asset_raw: AssetContextRaw;
  ag008_context?: AG008FailureContextRaw | null;
  ag007_context?: AG007EconomicContextRaw | null;
  m011_context?: M011HealthContextRaw | null;
  ag010_context?: AG010RCAContextRaw | null;
  ag011_context?: AG011MemoryContextRaw | null;
  ag012_context?: AG012StrategyContextRaw | null;
}

export interface BadActorAnalysisRequest {
  request_id: string;
  event_id?: string | null;
  correlation_id?: string | null;
  evaluation_at: string;
  population_scope: PopulationScope;
  target_area?: string | null;
  target_family?: string | null;
  analysis_window: AnalysisWindow;
  consumer?: string;
  assets: BadActorSingleAssetInput[];
}

export interface BadActorFact {
  fact_id: string;
  asset_id: string;
  dimension: 'CHRONICITY' | 'FAILURE_BURDEN' | 'ECONOMIC_BURDEN' | 'HEALTH_RISK' | 'INTERVENTION_EFFECTIVENESS';
  source_authority: string;
  source_id: string;
  raw_value: any;
  normalized_score: number;
  weight_applied: number;
  timestamp_source: string;
}

export interface AssetBadActorResult {
  asset_id: string;
  codigo_maquina: string;
  nombre: string;
  area: string;
  machine_family: string;
  criticality: 'HIGH' | 'MEDIUM' | 'LOW';
  classification: BadActorClassificationCode;
  rank: number;
  bad_actor_score: number;
  dimension_scores: {
    chronicity_score: number;
    failure_burden_score: number;
    economic_burden_score: number;
    health_risk_score: number;
    intervention_ineffectiveness_score: number;
  };
  hard_rules_triggered: string[];
  data_sufficiency: {
    data_sufficiency_index: number;
    sufficiency_level: 'HIGH' | 'MODERATE' | 'INSUFFICIENT';
    missing_critical_dimensions: string[];
  };
  conflicts_identified: string[];
  key_drivers: string[];
  facts: BadActorFact[];
  requires_engineering_review: boolean;
}

export interface BadActorSemanticExplanation {
  summary: string;
  population_insights: string;
  critical_asset_narratives: Array<{
    asset_id: string;
    classification_echo: BadActorClassificationCode;
    driver_narrative: string;
    chronicity_reason: string;
    missing_data_notes?: string;
  }>;
}

export interface BadActorAnalysisPackage {
  request_id: string;
  evaluation_at: string;
  population_scope: PopulationScope;
  analysis_window: AnalysisWindow;
  total_assets_evaluated: number;
  summary_counts: {
    not_bad_actor: number;
    watchlist: number;
    bad_actor: number;
    severe_bad_actor: number;
    insufficient_data: number;
  };
  results: AssetBadActorResult[];
  traceability: {
    all_facts_traceable: boolean;
    certified_sources_used: string[];
    decision_model_sha256: string;
  };
  semantic_explanation?: BadActorSemanticExplanation | null;
}
