// supabase/functions/agents-orchestrator/agents/ag003/rules/scheduling.rules.ts
// Rule Definition for Monthly Slot Scheduling (§79-87 PRD)

export const SCHEDULING_RULES_VERSION = 'AG003-SCHEDULING-RULES-001';

export const SCHEDULING_CONFIG = {
  version: SCHEDULING_RULES_VERSION,
  DEFAULT_DISTRIBUTION: 'WEEKLY_CADENCE', // Approximate weekly spread on working days
  PREFERRED_DAY_OF_WEEK: 5, // Friday (1 = Monday, 5 = Friday)
  MAX_SLOTS_PER_MONTH: 4
};
