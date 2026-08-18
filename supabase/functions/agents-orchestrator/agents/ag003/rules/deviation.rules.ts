// supabase/functions/agents-orchestrator/agents/ag003/rules/deviation.rules.ts
// Rule Definition for Deviation Calculation (§32-35 PRD)

export const DEVIATION_RULES_VERSION = 'AG003-DEVIATION-RULES-001';

export const DEVIATION_CONFIG = {
  version: DEVIATION_RULES_VERSION,
  SIGNIFICANT_INCREASE_RELATIVE_THRESHOLD: 0.50, // +50% vs baseline
  MODERATE_INCREASE_RELATIVE_THRESHOLD: 0.15,    // +15% vs baseline
  DECREASE_RELATIVE_THRESHOLD: -0.10             // -10% vs baseline
};
