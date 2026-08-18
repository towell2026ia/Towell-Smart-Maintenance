// supabase/functions/agents-orchestrator/agents/ag003/types/ag003.types.ts
// Official Types for AG-003 — Predictivo Mensual (§83, §84, §106, §107 PRD)

export type PredictiveBlock = 'Electrónico' | 'Mecánico' | 'Limpieza' | 'Lubricación';
export type PredictiveSeverity = 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAJA';
export type DataSufficiencyStatus = 'SUFFICIENT_DATA' | 'PARTIAL_DATA' | 'INSUFFICIENT_DATA' | 'NO_PRODUCTION_DATA';
export type CandidateStatus = 'ELIGIBLE' | 'NOT_ELIGIBLE' | 'REQUIRES_REVIEW';

export interface RawQualityRow {
  fecha: string;
  produccion?: string;
  maquina_id?: string;
  codigo_defecto?: string;
  defecto?: string;
  cantidad_defecto?: number | string;
  pzas_rollo?: number | string;
  kg_rollo?: number | string;
  mts_rollo?: number | string;
  numero_serie?: string;
  turno_tejido?: string;
}

export interface RawFailureRow {
  maquina_id: string;
  categoria_falla?: string;
  descripcion?: string;
  fecha_creada?: string;
  id_falla?: string;
}

export interface RawTelegramRow {
  id?: number | string;
  folio?: string;
  maquina_id: string;
  falla?: string;
  fecha?: string;
  hora?: string;
  tipo_falla_id?: string;
  orden_trabajo?: string;
}

export interface RawBitacoraRow {
  maquina_id: string;
  tiempo_atencion_min?: number;
  fecha_hora_inicio?: string;
  fecha_hora_fin?: string;
  folio_ot?: string;
}

export interface PredictiveLoomProfile {
  machine_id: string;
  department: 'PF';
  is_loom: boolean;
  is_active: boolean;
  criticality_level: 'Muy Alta' | 'Alta' | 'Media' | 'Baja';
  production_window: {
    start_date: string;
    end_date: string;
    total_rolls: number;
    valid_rolls: number;
    invalid_rolls: number;
    total_segundas: number;
    defect_varieties: number;
    average_segundas_per_roll: number;
    top_defects: Array<{ defect_code: string; defect_name: string; count: number }>;
  };
  failure_history: {
    failure_count_30d: number;
    repeated_failures: number;
    categories: Record<string, number>;
  };
  work_order_history: {
    recent_correctives_count: number;
    last_preventive_date: string | null;
  };
  downtime: {
    downtime_minutes_30d: number;
    downtime_hours_30d: number;
    is_unknown: boolean;
  };
  previous_predictive_surveys: Array<{
    survey_folio: string;
    survey_date: string;
    action_suggested: string;
    findings_count: number;
  }>;
  data_quality: {
    status: DataSufficiencyStatus;
    has_unknown_nulls: boolean;
    unmapped_rolls_count: number;
  };
}

export interface BaselineCalculationResult {
  baseline_value: number;
  baseline_rolls_count: number;
  baseline_available: boolean;
  baseline_type: 'MACHINE_HISTORICAL_MEAN' | 'PEER_GROUP_FALLBACK' | 'NOT_AVAILABLE';
}

export interface DeviationCalculationResult {
  current_metric: number;
  baseline_value: number;
  absolute_deviation: number;
  relative_deviation: number;
  is_relative_applicable: boolean;
  trend: 'SIGNIFICANT_INCREASE' | 'MODERATE_INCREASE' | 'STABLE' | 'DECREASE';
}

export interface PriorityScoreBreakdown {
  quality_deviation_score: number;      // max 40 pts
  quality_persistence_score: number;    // max 20 pts
  data_confidence_score: number;        // max 10 pts
  failure_context_score: number;        // max 15 pts
  downtime_context_score: number;       // max 5 pts
  criticality_score: number;            // max 5 pts
  inspection_recency_score: number;     // max 5 pts
  total_score: number;                  // 0 - 100 pts
}

export interface PredictiveCandidate {
  machine_id: string;
  month: string; // YYYY-MM
  data_window_days: 30;
  quality_metrics: {
    total_segundas: number;
    total_rolls: number;
    segundas_rate: number;
  };
  baseline: BaselineCalculationResult;
  deviation: DeviationCalculationResult;
  historical_context: {
    failures_count: number;
    downtime_hours: number;
    criticality: string;
  };
  previous_predictive_date: string | null;
  eligibility: boolean;
  data_status: DataSufficiencyStatus;
  candidate_status: CandidateStatus;
  priority_score: PriorityScoreBreakdown;
  predictive_priority_rank?: number;
  selection_reason?: string;
}

export interface PredictiveMonthlyScheduleItem {
  contract_id: 'PREDICTIVE-SCHEDULE-001';
  contract_version: '1.0';
  target_year: number;
  target_month: number;
  month_str: string; // YYYY-MM
  machine_id: string;
  department: 'PF';
  rank_position: number; // 1 to 4
  scheduled_date: string;
  activity_title: string;
  description: string;
  source_metric: 'SEGUNDAS_POR_ROLLO';
  total_segundas_30d: number;
  priority_score: number;
  severity: PredictiveSeverity;
  form_family: 'LEVANTAMIENTO_PREDICTIVO';
  required_blocks: PredictiveBlock[];
  survey_context: {
    correlation_id: string;
    candidate_reason: string;
    focus_areas: string[];
  };
}

export interface RuleVersionsManifest {
  'AG003-DATA-QUALITY-RULES': string;
  'AG003-BASELINE-RULES': string;
  'AG003-DEVIATION-RULES': string;
  'AG003-HISTORICAL-CONTEXT-RULES': string;
  'AG003-PRIORITY-RULES': string;
  'AG003-SELECTION-RULES': string;
  'AG003-SCHEDULING-RULES': string;
}

export interface PredictiveEngineOutput {
  contract_id: 'PREDICTIVE-SCHEDULE-001';
  contract_version: '1.0';
  event_id: string;
  correlation_id: string;
  target_month: string; // YYYY-MM
  generation_date: string;
  looms_scanned: number;
  looms_with_data: number;
  looms_eligible: number;
  existing_monthly_items: number;
  available_slots: number;
  selected_count: number;
  schedule_items: PredictiveMonthlyScheduleItem[];
  all_candidates: PredictiveCandidate[];
  rule_versions: RuleVersionsManifest;
  audit_summary: {
    duration_ms: number;
    llm_used: false;
    tokens: 0;
    ai_cost: 0;
    status: 'SUCCESS' | 'NO_CANDIDATES' | 'CAPACITY_REACHED' | 'DISABLED';
  };
}
