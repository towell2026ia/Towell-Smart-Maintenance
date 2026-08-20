// supabase/functions/agents-orchestrator/agents/ag008/analytics/cross-machine-pattern-engine.ts
// Cross-Machine Failure Pattern Engine for AG-008 (v1.0)
// Frozen under Token: AG008-CROSS-MACHINE-RULES-001
// Invariant: Detects same failure mode appearing across distinct machines. NEVER infers common root cause.

import type { FailureEvent } from '../types/ag008.types.ts';

export interface CrossMachinePattern {
  normalized_failure: string;
  distinct_machines_count: number;
  machine_ids: string[];
  total_occurrences: number;
  event_ids: string[];
  is_cross_machine_pattern: boolean;
}

export function detectCrossMachinePatterns(
  events: FailureEvent[],
  minDistinctMachines = 3
): CrossMachinePattern[] {
  // Group by failure_normalized
  const modeMap = new Map<string, FailureEvent[]>();

  for (const ev of events) {
    if (!ev.machine_id || ev.failure_normalized === 'UNKNOWN_FAILURE') continue;
    if (!modeMap.has(ev.failure_normalized)) modeMap.set(ev.failure_normalized, []);
    modeMap.get(ev.failure_normalized)!.push(ev);
  }

  const patterns: CrossMachinePattern[] = [];

  for (const [normalizedMode, modeEvents] of modeMap.entries()) {
    const machineSet = new Set<string>();
    const eventIds: string[] = [];

    for (const ev of modeEvents) {
      if (ev.machine_id) machineSet.add(ev.machine_id);
      eventIds.push(ev.failure_event_id);
    }

    if (machineSet.size >= minDistinctMachines) {
      patterns.push({
        normalized_failure: normalizedMode,
        distinct_machines_count: machineSet.size,
        machine_ids: Array.from(machineSet).sort(),
        total_occurrences: modeEvents.length,
        event_ids: eventIds,
        is_cross_machine_pattern: true
      });
    }
  }

  return patterns.sort((a, b) => b.distinct_machines_count - a.distinct_machines_count);
}
