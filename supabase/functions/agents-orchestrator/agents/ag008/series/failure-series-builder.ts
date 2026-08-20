// supabase/functions/agents-orchestrator/agents/ag008/series/failure-series-builder.ts
// Series Builder for AG-008 (v1.0)
// Frozen under Token: AG008-SERIES-RULES-001

import type { FailureEvent, FailureSeriesPoint, TimeGranularity, FailureScope } from '../types/ag008.types.ts';
import { getPeriodKey } from '../resolvers/failure-period-resolver.ts';

export interface FilterOptions {
  scope: FailureScope;
  targetId?: string | null; // specific machine_id or department
  failureNormalized?: string | null;
}

export function buildFailureSeries(
  events: FailureEvent[],
  granularity: TimeGranularity,
  filter?: FilterOptions
): FailureSeriesPoint[] {
  let filtered = events;

  if (filter) {
    if (filter.scope === 'MACHINE' && filter.targetId) {
      filtered = filtered.filter(e => e.machine_id === filter.targetId);
    } else if (filter.scope === 'DEPARTMENT' && filter.targetId) {
      filtered = filtered.filter(e => e.department === filter.targetId);
    } else if (filter.scope === 'FAILURE_TYPE' && filter.failureNormalized) {
      filtered = filtered.filter(e => e.failure_normalized === filter.failureNormalized);
    }
  }

  const periodMap = new Map<string, FailureEvent[]>();

  for (const ev of filtered) {
    if (!ev.date) continue;
    const pKey = getPeriodKey(ev.date, granularity);
    if (!periodMap.has(pKey)) {
      periodMap.set(pKey, []);
    }
    periodMap.get(pKey)!.push(ev);
  }

  // Sort periods chronologically
  const sortedPeriods = Array.from(periodMap.keys()).sort();

  return sortedPeriods.map(pKey => {
    const periodEvents = periodMap.get(pKey)!;
    const machines = new Set<string>();
    const modes = new Set<string>();

    for (const ev of periodEvents) {
      if (ev.machine_id) machines.add(ev.machine_id);
      modes.add(ev.failure_normalized);
    }

    return {
      period_key: pKey,
      granularity,
      event_count: periodEvents.length,
      distinct_machines_count: machines.size,
      distinct_failure_types_count: modes.size,
      failure_events: periodEvents
    };
  });
}
