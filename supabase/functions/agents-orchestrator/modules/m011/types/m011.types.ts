// supabase/functions/agents-orchestrator/modules/m011/types/m011.types.ts
// Core Type Definitions and Interfaces for M-011 (Health & Risk Index v1.0)
// Frozen under Token: M011-DATA-MAP-001

export type AssetCriticality = 'ALTA' | 'MEDIA' | 'BAJA';

export type HealthState = 'HEALTHY' | 'WATCH' | 'DEGRADED' | 'CRITICAL' | 'INSUFFICIENT_DATA';
export type RiskState = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' | 'INSUFFICIENT_DATA';

export type DataQualityState = 'KNOWN' | 'UNKNOWN' | 'NOT_AVAILABLE' | 'NOT_APPLICABLE' | 'STALE';

export type FeatureDomain = 'FAILURES' | 'MAINTENANCE' | 'DOWNTIME' | 'FINDINGS' | 'CRITICALITY' | 'ALERTS';
export type FeatureUsage = 'HEALTH_ONLY' | 'RISK_ONLY' | 'SHARED' | 'NOT_USED';
export type FeatureTimeWindow = '30_DAYS' | '90_DAYS' | 'CURRENT_YEAR' | 'LIFETIME';

export interface ScoreSourceReference {
  source_name: string;
  source_table: string;
  source_id?: string | null;
  retrieved_at: string;
  relationship_type: string;
}

export interface HealthFeatureDefinition {
  feature_id: string;
  feature_name: string;
  domain: FeatureDomain;
  usage: FeatureUsage;
  time_window: FeatureTimeWindow;
  raw_unit: string;
  direction: 'LOWER_IS_BETTER' | 'HIGHER_IS_BETTER'; // e.g. Failures: lower is better health; Compliance: higher is better
  weight: number; // 0 to 1.0, sum of weights for active model = 1.0
  missing_policy: DataQualityState;
}

export interface RiskFeatureDefinition {
  feature_id: string;
  feature_name: string;
  domain: FeatureDomain;
  usage: FeatureUsage;
  time_window: FeatureTimeWindow;
  raw_unit: string;
  direction: 'HIGHER_IS_WORSE' | 'LOWER_IS_WORSE';
  weight: number;
  missing_policy: DataQualityState;
}

export interface ScoreComponent {
  feature_id: string;
  feature_name: string;
  raw_value: number | string | null;
  normalized_value: number | null; // 0 to 100
  weight: number;
  contribution: number | null; // normalized_value * weight
  data_status: DataQualityState;
  rule_version: string;
  source_references: ScoreSourceReference[];
}

export interface DataSufficiencyEvaluation {
  is_sufficient: boolean;
  sufficiency_score: number; // 0 to 100 percentage of required features available
  missing_critical_features: string[];
  warnings: string[];
}

export interface HealthResult {
  asset_id: string;
  evaluation_at: string;
  health_score: number | null; // 0 to 100 (100 = Optimal condition, 0 = Highly degraded), null if insufficient data
  health_state: HealthState;
  components: ScoreComponent[];
  data_sufficiency: DataSufficiencyEvaluation;
  model_version: string;
  rule_versions: string[];
  source_references: ScoreSourceReference[];
}

export interface RiskResult {
  asset_id: string;
  evaluation_at: string;
  risk_score: number | null; // 0 to 100 (0 = Negligible risk, 100 = Extreme operational risk), null if insufficient data
  risk_state: RiskState;
  criticality: AssetCriticality;
  components: ScoreComponent[];
  data_sufficiency: DataSufficiencyEvaluation;
  model_version: string;
  rule_versions: string[];
  source_references: ScoreSourceReference[];
}

export interface AssetHealthAndRiskSummary {
  asset_id: string;
  evaluation_at: string;
  health: {
    score: number | null;
    state: HealthState;
    main_degradation_factor?: string | null;
  };
  risk: {
    score: number | null;
    state: RiskState;
    main_risk_driver?: string | null;
  };
  data_sufficiency: {
    is_sufficient: boolean;
    confidence_level: 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT';
  };
  model_versions: {
    health_model: string;
    risk_model: string;
  };
}
