// supabase/functions/agents-orchestrator/agents/ag007/types/ag007.types.ts
// Type definitions for AG-007 Presupuestos y Costos (v1.0)
// Frozen under Token: AG007-DATA-MAP-001

export type CostOrigin = 'PART' | 'LABOR' | 'DOWNTIME' | 'SERVICE' | 'OTHER';

export type CostStatus = 'PLANNED' | 'COMMITTED' | 'ACTUAL' | 'FORECAST';

export type MaintenanceType = 'PREVENTIVO' | 'CORRECTIVO' | 'AUTONOMO' | 'PREDICTIVO' | 'GENERAL';

export type CostCompleteness = 'COMPLETE' | 'PARTIAL_COST_TOTAL' | 'NOT_AVAILABLE';

export type CurrencyCode = 'MXN' | 'USD' | 'EUR';

export interface CostPeriod {
  year: number;
  month?: string; // Format: 'YYYY-MM'
  week?: string;  // Format: 'YYYY-Www'
}

export interface EconomicEvent {
  economic_event_id: string;
  source_table: string;
  source_record_id: string;
  date: string;
  period: CostPeriod;
  department: 'PF' | 'CF' | 'TF' | 'AF' | string;
  machine_id: string;
  work_order_folio?: string | null;
  maintenance_type: MaintenanceType;
  cost_origin: CostOrigin;
  cost_status: CostStatus;
  part_code?: string | null;
  part_name?: string | null;
  quantity: number;
  unit_cost: number | null; // null if unknown
  total_amount: number | null; // null if unknown
  reported_total?: number | null;
  currency: CurrencyCode;
  cost_provenance: string;
  is_complete: boolean;
  notes?: string;
}

export interface MachineCostSummary {
  machine_id: string;
  department: string;
  period: CostPeriod;
  planned_preventive_cost: number;
  actual_parts_cost: number;
  total_technical_hours: number;
  total_downtime_minutes: number;
  known_cost_total: number;
  cost_completeness: CostCompleteness;
  events_count: number;
  top_consumed_part?: string;
}

export interface PeriodBudgetSummary {
  period: CostPeriod;
  authorized_budget: number | null;
  budget_status: 'AVAILABLE' | 'BUDGET_NOT_AVAILABLE';
  planned_preventive: number;
  actual_spend_to_date: number;
  variance_amount: number | null;
  variance_percentage: number | null;
  forecast_to_period_end: number | null;
  active_alerts_count: number;
}

export type CostAlertCode =
  | 'BUDGET_WARNING'
  | 'BUDGET_EXCEEDED'
  | 'COST_SPIKE'
  | 'PART_COST_INCREASE'
  | 'DOWNTIME_SPIKE'
  | 'FORECAST_OVER_BUDGET';

export interface CostAlertEvent {
  alert_id: string;
  alert_code: CostAlertCode;
  severity: 'Informativa' | 'Advertencia' | 'Crítica';
  machine_id?: string;
  department?: string;
  period: CostPeriod;
  message: string;
  actual_value: number;
  threshold_value: number;
  variance_ratio?: number;
  timestamp: string;
  idempotency_key: string;
}
