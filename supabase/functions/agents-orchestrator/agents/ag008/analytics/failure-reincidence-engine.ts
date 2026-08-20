// supabase/functions/agents-orchestrator/agents/ag008/analytics/failure-reincidence-engine.ts
// Failure Reincidence Engine for AG-008 (v1.0)
// Frozen under Token: AG008-REINCIDENCE-RULES-001
// Invariant: Reincidence REQUIRES proof of prior repair / OT closure before recurrence occurs.

import type { FailureEvent, DepartmentCode } from '../types/ag008.types.ts';

export interface ReincidenceEventPair {
  machine_id: string;
  department: DepartmentCode;
  normalized_failure: string;
  initial_event_id: string;
  initial_date: string;
  closure_date: string;
  repair_reference: string;
  reincidence_event_id: string;
  reincidence_date: string;
  days_after_closure: number;
}

export function computeFailureReincidence(
  events: FailureEvent[],
  reincidenceThresholdDays = 15
): ReincidenceEventPair[] {
  const reincidences: ReincidenceEventPair[] = [];

  // Group by (machine_id + failure_normalized)
  const groupMap = new Map<string, FailureEvent[]>();

  for (const ev of events) {
    if (!ev.machine_id || ev.failure_normalized === 'UNKNOWN_FAILURE' || !ev.date) continue;
    const key = `${ev.machine_id}::${ev.failure_normalized}`;
    if (!groupMap.has(key)) groupMap.set(key, []);
    groupMap.get(key)!.push(ev);
  }

  for (const [key, groupEvents] of groupMap.entries()) {
    const [machineId, normalizedMode] = key.split('::');

    // Sort chronologically
    groupEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    for (let i = 0; i < groupEvents.length; i++) {
      const priorEvent = groupEvents[i];

      // Check if priorEvent has proof of closure / resolution
      if (priorEvent.is_resolved && priorEvent.resolution_date) {
        const closureTime = new Date(priorEvent.resolution_date).getTime();

        // Find next event occurring strictly after closure
        for (let j = i + 1; j < groupEvents.length; j++) {
          const nextEvent = groupEvents[j];
          const nextTime = new Date(nextEvent.date).getTime();

          if (nextTime >= closureTime) {
            const diffDays = Math.round((nextTime - closureTime) / (1000 * 60 * 60 * 24));
            if (diffDays <= reincidenceThresholdDays) {
              reincidences.push({
                machine_id: machineId,
                department: (priorEvent.department || 'PF') as DepartmentCode,
                normalized_failure: normalizedMode,
                initial_event_id: priorEvent.failure_event_id,
                initial_date: priorEvent.date,
                closure_date: priorEvent.resolution_date,
                repair_reference: priorEvent.source_reference,
                reincidence_event_id: nextEvent.failure_event_id,
                reincidence_date: nextEvent.date,
                days_after_closure: diffDays
              });
            }
          }
        }
      }
    }
  }

  return reincidences;
}
