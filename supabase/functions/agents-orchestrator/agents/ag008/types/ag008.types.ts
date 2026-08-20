// supabase/functions/agents-orchestrator/agents/ag008/types/ag008.types.ts
// Canonical Type Definitions for AG-008 — Fallas, Tendencias, Reincidencias y Estacionalidad (v1.0)
// Frozen under Token: AG008-FAILURE-EVENT-MODEL-001

export type FailureSource =
  | 'OT'
  | 'TELEGRAM'
  | 'AUTONOMOUS_FINDING'
  | 'PREDICTIVE_FINDING'
  | 'EXCEL_HISTORICAL'
  | 'BITACORA';

export type MaintenanceType =
  | 'PREVENTIVO'
  | 'CORRECTIVO'
  | 'PREDICTIVO'
  | 'AUTONOMO'
  | 'GENERAL';

export type DepartmentCode = 'PF' | 'CF' | 'TF' | 'AF';

export type FailureDataQuality =
  | 'RELIABLE'
  | 'USABLE_WITH_NORMALIZATION'
  | 'PARTIAL'
  | 'UNRELIABLE';

export type FailureScope =
  | 'GLOBAL'
  | 'DEPARTMENT'
  | 'MACHINE'
  | 'FAILURE_TYPE'
  | 'FAILURE_CATEGORY'
  | 'MAINTENANCE_TYPE';

export type TimeGranularity = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'ANNUAL';

export type TrendDirection = 'UP' | 'DOWN' | 'STABLE' | 'INSUFFICIENT_DATA';

export type RecurrenceStatus = 'NONE' | 'REPEATED' | 'RECURRENT' | 'INSUFFICIENT_DATA';

export type SeasonalityStatus = 'DETECTED' | 'NOT_DETECTED' | 'INSUFFICIENT_HISTORY';

export interface FailureEvent {
  failure_event_id: string; // Unique deterministic hash or UUID
  machine_id: string | null; // cat_maquinas(equipo_towell) or null if unattributed
  department: DepartmentCode | null; // PF, CF, TF, AF
  occurred_at: string; // ISO 8601 Timestamp
  date: string; // YYYY-MM-DD
  time: string | null; // HH:MM:SS
  shift: number | null; // 1, 2, 3
  failure_raw: string; // Immutable original failure description
  failure_normalized: string; // Normalized text (lowercase, trimmed, unaccented)
  failure_category: string | null; // Mechanical, Electrical, Pneumatic, etc.
  maintenance_type: MaintenanceType;
  source_type: FailureSource;
  source_reference: string; // Table and primary key / folio
  work_order_folio: string | null;
  physical_finding: boolean; // True if from physical inspection (AG-004/AG-003)
  is_resolved: boolean;
  resolution_date: string | null;
  resolution_notes: string | null;
  data_quality: FailureDataQuality;
}

export interface FailureSeriesPoint {
  period_key: string; // e.g. '2026-W33', '2026-08', '2026'
  granularity: TimeGranularity;
  event_count: number;
  distinct_machines_count: number;
  distinct_failure_types_count: number;
  failure_events: FailureEvent[];
}

export interface FailureRecurrenceGroup {
  normalized_failure: string;
  machine_id: string;
  department: DepartmentCode;
  occurrence_count: number;
  first_seen: string;
  last_seen: string;
  repeat_interval_days_avg: number | null;
  status: RecurrenceStatus;
  events: FailureEvent[];
}

export interface FailureSignal {
  signal_id: string;
  signal_type:
    | 'FAILURE_RECURRENCE_ALERT'
    | 'FAILURE_REINCIDENCE_ALERT'
    | 'FAILURE_FREQUENCY_INCREASE'
    | 'FAILURE_TREND_UP'
    | 'FAILURE_CONCENTRATION_ALERT'
    | 'CROSS_MACHINE_PATTERN_ALERT'
    | 'SEASONAL_PATTERN_DETECTED'
    | 'DATA_QUALITY_ALERT';
  scope: FailureScope;
  target_id: string; // machine_id, department, or global
  severity: 'Informativa' | 'Advertencia' | 'Crítica';
  message: string;
  metrics: {
    event_count?: number;
    recurrence_count?: number;
    trend_percentage?: number;
    time_window?: string;
  };
  evidence_event_ids: string[];
  source_references: string[];
  rule_version: string;
  created_at: string;
}
