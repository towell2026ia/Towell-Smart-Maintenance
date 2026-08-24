// supabase/functions/agents-orchestrator/agents/ag007/contracts/ag007-preventive-budget.contract.ts
// Official Contract for AG-007 Preventive Material Budget Engine (PRD-AG007-R1)

import type { PreventiveBudgetPeriod } from '../resolvers/budget-period-resolver.ts';

export type BudgetCoverageStatus = 'COMPLETE' | 'PARTIAL' | 'NO_DATA';
export type PriceStatus = 'KNOWN_PRICE' | 'UNKNOWN_PRICE' | 'ZERO_PRICE';
export type QuantityStatus = 'KNOWN_QUANTITY' | 'DERIVED_QUANTITY' | 'MISSING';

export interface PlannedPartReferenceInput {
  part_id?: string;
  part_code: string;
  part_name: string;
  planned_quantity: number | null;
  unit_of_measure?: string;
  quantity_source: 'ASSET_SERVICE_OVERRIDE' | 'SERVICE_DEFAULT' | 'CATALOG_STANDARD' | 'MISSING_MAPPING';
  quantity_status?: QuantityStatus;
}

export interface PreventiveScheduleItemInput {
  preventive_id: string;
  asset_id: string;
  area_code: string;
  scheduled_date: string; // YYYY-MM-DD
  service_code: string;
  service_name: string;
  calendar_year: number;
  planned_parts: PlannedPartReferenceInput[];
}

export interface PartPriceCatalogItem {
  codigo_articulo: string;
  nombre_articulo?: string;
  costo_unitario?: number | null;
  precio_costo_unitario?: number | null;
  moneda?: string;
  origen_precio?: string;
  fecha_vigencia?: string;
}

export interface ActiveMachineItem {
  id_maquina?: string;
  equipo_towell: string;
  area?: string;
  departamento_codigo?: string;
  activo?: boolean;
}

export interface PreventiveBudgetEngineInput {
  reference_date?: string | Date;
  active_machines: ActiveMachineItem[];
  preventive_schedule_items: PreventiveScheduleItemInput[];
  price_catalog: PartPriceCatalogItem[];
  correlation_id?: string;
  budget_run_id?: string;
}

export interface PricedPartLine {
  part_id?: string;
  part_code: string;
  part_name: string;
  planned_quantity: number;
  unit_of_measure: string;
  reference_unit_price: number | null;
  planned_part_cost: number | null;
  price_source: string;
  price_effective_at: string;
  price_status: PriceStatus;
  quantity_status: QuantityStatus;
  quantity_source: string;
}

export interface PreventiveItemBudgetResult {
  preventive_id: string;
  asset_id: string;
  area_code: string;
  scheduled_date: string;
  scheduled_month: string; // YYYY-MM
  service_code: string;
  service_name: string;
  parts_lines: PricedPartLine[];
  preventive_material_budget: number;
  priced_lines_count: number;
  missing_price_lines_count: number;
  missing_quantity_lines_count: number;
  coverage_pct: number;
  budget_status: BudgetCoverageStatus;
  labor_cost_status: 'NOT_IN_SCOPE';
}

export interface AreaBudgetSummary {
  area_code: string;
  preventives_count: number;
  assets_count: number;
  material_budget: number;
  priced_lines_count: number;
  missing_price_lines_count: number;
  coverage_pct: number;
  status: BudgetCoverageStatus;
}

export interface MonthlyPreventiveBudgetResult {
  year: number;
  month: string; // YYYY-MM
  month_label: string; // Ago, Sep, etc.
  is_current_month: boolean;
  preventive_count: number;
  asset_count: number;
  service_count: number;
  planned_part_lines_total: number;
  planned_part_quantity_total: number;
  material_budget: number;
  priced_lines_count: number;
  missing_price_lines_count: number;
  missing_quantity_lines_count: number;
  budget_coverage_pct: number;
  budget_status: BudgetCoverageStatus;
  by_area: Record<string, AreaBudgetSummary>;
  drilldown_preventives: PreventiveItemBudgetResult[];
  labor_cost_status: 'NOT_IN_SCOPE';
}

export interface PreventiveBudgetEngineOutput {
  engine_version: string;
  budget_run_id: string;
  correlation_id: string;
  calculated_at: string;
  budget_type: 'PREVENTIVE_PARTS_FORECAST';
  period: PreventiveBudgetPeriod;
  active_applicable_machine_count: number;
  preventives_in_period_count: number;
  period_material_budget_total: number;
  current_month_material_budget: number;
  period_priced_lines_total: number;
  period_missing_price_lines_total: number;
  period_missing_quantity_lines_total: number;
  period_budget_coverage_pct: number;
  period_budget_status: BudgetCoverageStatus;
  by_area_period: Record<string, AreaBudgetSummary>;
  monthly_distribution: MonthlyPreventiveBudgetResult[];
  labor_cost_status: 'NOT_IN_SCOPE';
  traceability: {
    source_agent: 'AG-002',
    budget_agent: 'AG-007',
    orchestrator_agent: 'AG-001',
    calendar_plan_reference: string;
  };
}
