// supabase/functions/agents-orchestrator/agents/ag003/rules/data-quality.rules.ts
// Rule Definition for Data Quality & Sample Size (§20-23 PRD)

export const DATA_QUALITY_RULES_VERSION = 'AG003-DATA-QUALITY-RULES-001';

export const DATA_QUALITY_CONFIG = {
  version: DATA_QUALITY_RULES_VERSION,
  MIN_ROLLS_SUFFICIENT: 10,
  MIN_ROLLS_PARTIAL: 3,
  MAX_REASONABLE_SEGUNDAS_PER_ROLL: 100,
  TOLERANCE_UNKNOWN_NULLS_RATIO: 0.20
};
