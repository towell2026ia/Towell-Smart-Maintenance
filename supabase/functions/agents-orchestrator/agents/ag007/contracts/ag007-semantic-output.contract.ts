// supabase/functions/agents-orchestrator/agents/ag007/contracts/ag007-semantic-output.contract.ts
// Semantic Output Contract for AG-007 (v1.0)
// Frozen under Token: AG007-SEMANTIC-001

export interface SemanticCostDriver {
  category: string;
  name: string;
  amount_mxn: number;
  percentage: number;
  explanation: string;
  source_ref: string;
}

export interface SemanticAlertExplanation {
  alert_code: string;
  severity: 'Informativa' | 'Advertencia' | 'Crítica';
  target: string;
  why: string;
  suggested_review: string;
  source_ref: string;
}

export interface SemanticOutputPayload {
  period: string; // e.g. '2026-08'
  scope: string;  // e.g. 'GLOBAL'
  executive_summary: string;
  budget_status_explanation: string;
  variance_explanation: string;
  forecast_explanation: string;
  cost_driver_summary: SemanticCostDriver[];
  pattern_codes: string[];
  alert_explanations: SemanticAlertExplanation[];
  data_quality_warnings: string[];
  management_notes: string[];
  source_references: string[];
  requires_human_review: boolean;
}
