// supabase/functions/agents-orchestrator/agents/ag007/contracts/ag007-semantic-input.contract.ts
// Semantic Input Contract for AG-007 (v1.0)
// Frozen under Token: AG007-SEMANTIC-INPUT-001

import type { CostPeriod, CostOrigin, MaintenanceType, CostCompleteness, CostAlertEvent } from '../types/ag007.types.ts';

export interface SemanticInputPayload {
  period: CostPeriod;
  scope: 'GLOBAL' | 'DEPARTMENT' | 'MACHINE' | 'MAINTENANCE_TYPE' | 'COST_DOMAIN' | 'WORK_ORDER';
  currency: 'MXN';
  budget: {
    budget_value: number | null;
    budget_version: string;
    budget_source: string;
    status: 'AVAILABLE' | 'BUDGET_NOT_AVAILABLE';
  };
  planned: {
    preventive_total: number;
    source: 'AG-002';
  };
  committed: {
    total: number;
    open_orders_count?: number;
  };
  actual: {
    known_total: number;
    unknown_event_count: number;
    completeness: CostCompleteness;
  };
  forecast: {
    forecast_total: number | null;
    projected_remaining: number | null;
    burn_rate_per_day: number | null;
    status: 'COMPLETE' | 'FORECAST_DATA_PARTIAL' | 'FORECAST_NOT_AVAILABLE';
    method: string;
  };
  variance: {
    variance_amount: number | null;
    variance_pct: number | null;
    status: 'FAVORABLE' | 'UNFAVORABLE' | 'NEUTRAL' | 'BUDGET_NOT_AVAILABLE' | 'VARIANCE_PERCENT_NOT_APPLICABLE';
  };
  cost_breakdown: {
    by_domain: Record<CostOrigin, { amount: number; count: number; unknown_count: number }>;
    by_maintenance_type: Record<MaintenanceType, number>;
    by_department: Record<string, number>;
    top_machine_drivers: Array<{ machine_id: string; department: string; actual_cost: number; pct_of_known: number }>;
  };
  deterministic_alerts: CostAlertEvent[];
  source_references: string[];
}
