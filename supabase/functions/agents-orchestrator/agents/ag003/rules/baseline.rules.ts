// supabase/functions/agents-orchestrator/agents/ag003/rules/baseline.rules.ts
// Rule Definition for Baseline Calculation (§26-31 PRD)

export const BASELINE_RULES_VERSION = 'AG003-BASELINE-RULES-001';

export const BASELINE_CONFIG = {
  version: BASELINE_RULES_VERSION,
  MIN_HISTORICAL_ROLLS_FOR_MACHINE_BASELINE: 15,
  DEFAULT_PEER_GROUP_FALLBACK_BASELINE: 2.5, // average segundas per roll across plant
  ALLOW_PEER_FALLBACK: true
};
