// supabase/functions/agents-orchestrator/agents/ag008/analytics/failure-recurrence-engine.ts
// Failure Recurrence Engine for AG-008 (v1.0)
// Frozen under Token: AG008-RECURRENCE-RULES-001

import type { FailureEvent, FailureRecurrenceGroup, RecurrenceStatus, DepartmentCode } from '../types/ag008.types.ts';

export function computeFailureRecurrence(
  events: FailureEvent[],
  windowDays = 30
): FailureRecurrenceGroup[] {
  // Group by (machine_id + failure_normalized)
  const groupMap = new Map<string, FailureEvent[]>();

  for (const ev of events) {
    if (!ev.machine_id || ev.failure_normalized === 'UNKNOWN_FAILURE' || !ev.date) continue;
    const key = `${ev.machine_id}::${ev.failure_normalized}`;
    if (!groupMap.has(key)) groupMap.set(key, []);
    groupMap.get(key)!.push(ev);
  }

  const results: FailureRecurrenceGroup[] = [];

  for (const [key, groupEvents] of groupMap.entries()) {
    const [machineId, normalizedMode] = key.split('::');

    // Sort chronologically
    groupEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const firstSeen = groupEvents[0].date;
    const lastSeen = groupEvents[groupEvents.length - 1].date;
    const dept: DepartmentCode = groupEvents[0].department || 'PF';

    // Compute intervals between successive occurrences
    let totalIntervalDays = 0;
    let intervalsCount = 0;

    for (let i = 1; i < groupEvents.length; i++) {
      const d1 = new Date(groupEvents[i - 1].date).getTime();
      const d2 = new Date(groupEvents[i].date).getTime();
      const diffDays = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
      totalIntervalDays += diffDays;
      intervalsCount++;
    }

    const avgInterval = intervalsCount > 0 ? Math.round((totalIntervalDays / intervalsCount) * 10) / 10 : null;

    // Recurrence status logic:
    // 1 -> NONE
    // 2 in <= windowDays -> REPEATED
    // >= 3 in <= windowDays -> RECURRENT
    let status: RecurrenceStatus = 'NONE';
    if (groupEvents.length === 2) {
      if (avgInterval !== null && avgInterval <= windowDays) {
        status = 'REPEATED';
      }
    } else if (groupEvents.length >= 3) {
      if (avgInterval !== null && avgInterval <= windowDays) {
        status = 'RECURRENT';
      } else {
        status = 'REPEATED';
      }
    }

    results.push({
      normalized_failure: normalizedMode,
      machine_id: machineId,
      department: dept,
      occurrence_count: groupEvents.length,
      first_seen: firstSeen,
      last_seen: lastSeen,
      repeat_interval_days_avg: avgInterval,
      status,
      events: groupEvents
    });
  }

  // Sort by highest occurrence count
  return results.sort((a, b) => b.occurrence_count - a.occurrence_count);
}
