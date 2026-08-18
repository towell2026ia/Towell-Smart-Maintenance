// supabase/functions/agents-orchestrator/agents/ag002/types/ag002-semantic.types.ts
// Official Semantic Types for AG-002.3 MiMo Interpretation Layer (§12, §19-24 PRD)

export type PatternCode = 
  | 'HIGH_FAILURE_RECURRENCE'
  | 'SHORT_FAILURE_INTERVAL'
  | 'HIGH_CORRECTIVE_FREQUENCY'
  | 'HIGH_DOWNTIME'
  | 'CRITICAL_ASSET'
  | 'REPEATED_COMPONENT_FAILURE'
  | 'HIGH_PARTS_CONSUMPTION'
  | 'LONG_TIME_SINCE_PREVENTIVE'
  | 'INSUFFICIENT_HISTORY'
  | 'INCOMPLETE_DOWNTIME_DATA'
  | 'UNKNOWN_PART_COST'
  | 'NEW_MACHINE'
  | 'NO_SIGNIFICANT_PATTERN';

export interface SemanticInputPayload {
  contract_id: 'AG002-SEMANTIC-INPUT-001';
  contract_version: '1.0';
  target_year: number;
  generation_date: string;
  machine: {
    machine_id: string;
    department_code: string;
    is_active: boolean;
    is_loom: boolean;
    criticality_level: string;
  };
  metrics: {
    failure_count_12m: number;
    repeated_failure_count: number;
    failures_by_category: Record<string, number>;
    work_order_count_12m: number;
    corrective_work_orders_12m: number;
    downtime_minutes_12m: number;
    downtime_hours_12m: number;
    days_since_last_preventive: number | null;
  };
  priority: {
    priority_score: number;
    priority_band: string;
    components: {
      criticality_score: number;
      recurrence_score: number;
      downtime_score: number;
      corrective_frequency_score: number;
      preventive_age_score: number;
    };
  };
  service: {
    service_code: string;
    service_name: string;
    estimated_duration_min: number;
  };
  parts: {
    parts_count: number;
    parts_list: Array<{ cve_refaccion: string; nombre?: string; cantidad: number; price_status: string }>;
    known_cost_total: number;
    budget_status: 'COMPLETE' | 'PARTIAL' | 'NO_KNOWN_PRICES';
  };
  schedule: {
    scheduled_date: string;
    week_number: number;
    month_number: number;
    calendar_reference: string;
  };
  precalculated_patterns: PatternCode[];
  untrusted_historical_content: Array<{
    source: string;
    date: string;
    description: string;
    reference_id: string;
  }>;
}

export interface HistoricalObservationItem {
  observation: string;
  source_references?: string[];
}

export interface SemanticOutputPayload {
  machine_id: string;
  executive_summary: string;
  pattern_codes: PatternCode[];
  priority_explanation: string;
  preventive_focus: string[];
  historical_observations: HistoricalObservationItem[];
  parts_observations: string[];
  data_quality_warnings: string[];
  recommendation: string;
  source_references: string[];
  requires_human_review: boolean;
}

export interface EnrichedPreventivePlanItem {
  // Deterministic Fields (Protected from AI modification)
  machine_id: string;
  department: string;
  year: number;
  scheduled_date: string;
  week_number: number;
  month_number: number;
  priority_score: number;
  priority_band: string;
  service_code: string;
  service_name: string;
  estimated_duration_min: number;
  planned_parts: Array<{ cve_refaccion: string; cantidad: number; costo_unitario?: number }>;
  parts_cost_known: number;
  budget_status: 'COMPLETE' | 'PARTIAL' | 'NO_KNOWN_PRICES';
  calendar_reference: string;

  // Semantic Enrichment (Informational only)
  semantic_interpretation?: {
    model_version: string;
    executive_summary: string;
    priority_explanation: string;
    pattern_codes: PatternCode[];
    preventive_focus: string[];
    historical_observations: HistoricalObservationItem[];
    parts_observations: string[];
    data_quality_warnings: string[];
    recommendation: string;
    source_references: string[];
    requires_human_review: boolean;
  };
  semantic_status: 'ENRICHED' | 'DETERMINISTIC_ONLY_FALLBACK' | 'SEMANTIC_DISABLED';
}

export interface SemanticAuditRecord {
  event_id: string;
  correlation_id?: string;
  agent_id: 'AG-002';
  machine_id: string;
  provider: 'MIMO' | 'MOCK';
  model: string;
  prompt_version: string;
  input_version: string;
  output_version: string;
  llm_used: boolean;
  input_tokens: number;
  output_tokens: number;
  estimated_cost_usd: number;
  cost_status: 'KNOWN' | 'UNKNOWN' | 'ZERO';
  latency_ms: number;
  validation_passed: boolean;
  merge_passed: boolean;
  status: 'SUCCESS' | 'FALLBACK_TO_DETERMINISTIC' | 'VALIDATION_FAILED';
  error_code?: string;
}
