// supabase/functions/agents-orchestrator/agents/ag003/contracts/semantic-input.contract.ts
// Canonical Semantic Input Contract for AG-003.3 (§20-27 PRD)

import { PredictiveBlock, PredictiveSeverity } from '../types/ag003.types.ts';
import { PredictivePatternCode } from '../catalog/pattern-catalog.ts';

export const SEMANTIC_INPUT_VERSION = 'AG003-SEMANTIC-INPUT-001';

export interface SemanticInputPayload {
  contract_id: 'AG003-SEMANTIC-INPUT-001';
  version: '1.0';
  target_month: string; // YYYY-MM
  machine: {
    machine_id: string;
    department_code: 'PF';
    is_loom: boolean;
    criticality: string;
  };
  analysis_window: {
    from_date: string;
    to_date: string;
    total_rolls: number;
    valid_rolls: number;
    total_segundas: number;
    segundas_per_roll: number;
  };
  baseline: {
    baseline_value: number;
    baseline_type: string;
    is_available: boolean;
  };
  deviation: {
    absolute_deviation: number;
    relative_deviation: number;
    trend: string;
  };
  data_quality: {
    status: string;
    is_sufficient: boolean;
  };
  historical_context: {
    deduplicated_failures_30d: number;
    downtime_hours_30d: number;
    last_predictive_days_ago: number | null;
  };
  priority: {
    priority_score: number;
    rank_position: number;
    selected: boolean;
    scheduled_date: string;
  };
  precalculated_patterns: PredictivePatternCode[];
  untrusted_historical_content: Array<{
    reference_id: string;
    source: string;
    date: string;
    description: string;
  }>;
}
