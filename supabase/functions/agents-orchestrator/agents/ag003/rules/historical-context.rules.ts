// supabase/functions/agents-orchestrator/agents/ag003/rules/historical-context.rules.ts
// Rule Definition for Historical Context & Deduplication (§38-46 PRD)

export const HISTORICAL_CONTEXT_RULES_VERSION = 'AG003-HISTORICAL-CONTEXT-RULES-001';

export const HISTORICAL_CONTEXT_CONFIG = {
  version: HISTORICAL_CONTEXT_RULES_VERSION,
  DEDUPE_TIME_WINDOW_HOURS: 24,
  MAX_HISTORICAL_WINDOW_DAYS: 30
};
