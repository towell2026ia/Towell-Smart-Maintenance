// supabase/functions/agents-orchestrator/agents/ag002/calculators/recurrence-calculator.ts
// Deterministic Recurrence and Failure Frequency Calculator (§20, §21, §22 PRD)

import { DeduplicatedHistoricalEvent, RecurrenceMetrics } from '../types/ag002.types.ts';

export function calculateRecurrenceMetrics(
  machineId: string,
  events: DeduplicatedHistoricalEvent[],
  generationDateStr: string
): RecurrenceMetrics {
  const machineEvents = events.filter(e => e.maquina_id === machineId);
  const genDate = new Date(generationDateStr);
  const ninetyDaysAgo = new Date(genDate.getTime() - 90 * 24 * 60 * 60 * 1000);

  const categoriesCount: Record<string, number> = {};
  const descCount: Record<string, number> = {};
  const failureDates: number[] = [];
  let recentFailures90d = 0;

  for (const ev of machineEvents) {
    // Count categories
    const cat = ev.category || 'UNCLASSIFIED_FAILURE';
    categoriesCount[cat] = (categoriesCount[cat] || 0) + 1;

    // Count repeated descriptions
    const desc = ev.description.trim().toLowerCase();
    descCount[desc] = (descCount[desc] || 0) + 1;

    const evDate = new Date(ev.date);
    if (!isNaN(evDate.getTime())) {
      failureDates.push(evDate.getTime());
      if (evDate >= ninetyDaysAgo && evDate <= genDate) {
        recentFailures90d++;
      }
    }
  }

  // Count repeated failures (failures with same description occurring >= 2 times)
  let repeatedCount = 0;
  for (const count of Object.values(descCount)) {
    if (count >= 2) {
      repeatedCount += (count - 1);
    }
  }

  // Calculate Mean & Min Days Between Failures
  let meanDays: number | null = null;
  let minDays: number | null = null;

  if (failureDates.length >= 2) {
    failureDates.sort((a, b) => a - b);
    const intervals: number[] = [];
    for (let i = 1; i < failureDates.length; i++) {
      const diffDays = (failureDates[i] - failureDates[i - 1]) / (1000 * 60 * 60 * 24);
      intervals.push(diffDays);
    }
    if (intervals.length > 0) {
      const sum = intervals.reduce((acc, v) => acc + v, 0);
      meanDays = Math.round((sum / intervals.length) * 10) / 10;
      minDays = Math.round(Math.min(...intervals) * 10) / 10;
    }
  }

  const workOrdersCount = machineEvents.filter(e => e.source === 'WORK_ORDER').length;

  return {
    failure_count_12m: machineEvents.length,
    work_order_count_12m: workOrdersCount,
    repeated_failure_count: repeatedCount,
    categories_count: categoriesCount,
    mean_days_between_failures: meanDays,
    minimum_days_between_failures: minDays,
    recent_failures_count_90d: recentFailures90d
  };
}
