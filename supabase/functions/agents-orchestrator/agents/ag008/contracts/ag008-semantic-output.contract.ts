// supabase/functions/agents-orchestrator/agents/ag008/contracts/ag008-semantic-output.contract.ts
// Strict Structured Semantic Output Contract for AG-008 (v1.0)
// Frozen under Token: AG008-SEMANTIC-001

import type { FailureScope, TimeGranularity } from '../types/ag008.types.ts';

export interface SemanticConcentrationSummaryItem {
  name: string; // machine_id, department, or failure mode
  event_count: number;
  share_percentage: number;
}

export interface SemanticAlertExplanation {
  alert_id?: string;
  signal_type: string;
  severity: 'Informativa' | 'Advertencia' | 'Crítica';
  explanation: string;
  evidence_summary: string;
}

export interface SemanticFailureOutputPayload {
  scope: FailureScope;
  target_id: string;
  period_granularity: TimeGranularity;
  executive_summary: string;
  failure_pattern_summary: string;
  recurrence_explanation: string | null;
  reincidence_explanation: string | null;
  trend_explanation: string | null;
  seasonality_explanation: string | null;
  concentration_summary: SemanticConcentrationSummaryItem[];
  cross_machine_summary: string[];
  alert_explanations: SemanticAlertExplanation[];
  data_quality_warnings: string[];
  recommended_review_topics: string[];
  pattern_codes: string[];
  source_references: string[];
  requires_human_review: boolean;
}
