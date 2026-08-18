// supabase/functions/agents-orchestrator/agents/ag003/types/ag003.types.ts
// Official Types for AG-003 — Predictivo Mensual (§83, §84 PRD)

export type PredictiveBlock = 'Electrónico' | 'Mecánico' | 'Limpieza' | 'Lubricación';
export type PredictiveSeverity = 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAJA';
export type DataSufficiencyStatus = 'SUFFICIENT_DATA' | 'PARTIAL_DATA' | 'INSUFFICIENT_DATA' | 'NO_PRODUCTION_DATA';

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

export interface PredictiveCandidate {
  machine_id: string;
  month: string; // YYYY-MM
  data_window_days: 30;
  quality_metrics: {
    total_segundas: number;
    total_rolls: number;
    segundas_rate: number;
  };
  historical_context: {
    failures_count: number;
    downtime_hours: number;
    criticality: string;
  };
  previous_predictive_date: string | null;
  eligibility: boolean;
  data_status: DataSufficiencyStatus;
  predictive_priority_rank?: number;
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
  form_family: 'LEVANTAMIENTO_PREDICTIVO';
  required_blocks: PredictiveBlock[];
}
