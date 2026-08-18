// supabase/functions/agents-orchestrator/agents/ag004/rules/load-balancing.rules.ts
// Manifest: AG004-LOAD-BALANCING-RULES-001

import { DAYS_IN_OPERATING_WEEK } from './week.rules.ts';

export const LOAD_BALANCING_RULES_VERSION = 'AG004-LOAD-BALANCING-RULES-001';

export function calculateDailySlotDistribution(totalCount: number, daysCount: number = DAYS_IN_OPERATING_WEEK): number[] {
  if (totalCount <= 0 || daysCount <= 0) {
    return new Array(Math.max(1, daysCount)).fill(0);
  }
  const baseLoad = Math.floor(totalCount / daysCount);
  const remainder = totalCount % daysCount;
  const distribution: number[] = [];

  for (let i = 0; i < daysCount; i++) {
    distribution.push(i < remainder ? baseLoad + 1 : baseLoad);
  }
  return distribution;
}
