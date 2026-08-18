// supabase/functions/agents-orchestrator/agents/ag003/rules/selection.rules.ts
// Rule Definition for Top-4 Selection & Tie Breaking (§62-69 PRD)

export const SELECTION_RULES_VERSION = 'AG003-SELECTION-RULES-001';

export const SELECTION_CONFIG = {
  version: SELECTION_RULES_VERSION,
  MAX_MONTHLY_SELECTIONS: 4,
  MIN_SELECTION_SCORE_THRESHOLD: 25.0, // Minimum priority score to justify predictive intervention
  TIE_BREAK_ORDER: [
    'quality_deviation_desc',
    'total_priority_score_desc',
    'failures_count_desc',
    'criticality_desc',
    'days_since_predictive_desc',
    'machine_id_asc'
  ]
};
