// supabase/functions/agents-orchestrator/agents/ag008/analytics/failure-concentration-engine.ts
// Failure Concentration & Ranking Engine for AG-008 (v1.0)
// Frozen under Token: AG008-CONCENTRATION-RULES-001
// Invariant: Produces statistical concentration ranking. NEVER outputs machine_is_bad_actor = true (AG-013 Boundary).

import type { FailureEvent, DepartmentCode } from '../types/ag008.types.ts';

export interface MachineConcentrationItem {
  machine_id: string;
  department: DepartmentCode;
  failure_count: number;
  share_percentage: number;
}

export interface FailureModeConcentrationItem {
  failure_normalized: string;
  failure_count: number;
  share_percentage: number;
}

export interface DepartmentConcentrationItem {
  department: DepartmentCode;
  failure_count: number;
  share_percentage: number;
}

export interface ConcentrationSummary {
  total_known_failures: number;
  top_machines: MachineConcentrationItem[];
  top_failure_modes: FailureModeConcentrationItem[];
  by_department: DepartmentConcentrationItem[];
}

export function computeFailureConcentration(events: FailureEvent[]): ConcentrationSummary {
  const total = events.length;
  if (total === 0) {
    return {
      total_known_failures: 0,
      top_machines: [],
      top_failure_modes: [],
      by_department: []
    };
  }

  // 1. Group by Machine
  const machMap = new Map<string, { count: number; dept: DepartmentCode }>();
  // 2. Group by Failure Mode
  const modeMap = new Map<string, number>();
  // 3. Group by Department
  const deptMap = new Map<DepartmentCode, number>();

  for (const ev of events) {
    if (ev.machine_id) {
      const existing = machMap.get(ev.machine_id) || { count: 0, dept: ev.department || 'PF' };
      existing.count++;
      machMap.set(ev.machine_id, existing);
    }

    if (ev.failure_normalized) {
      modeMap.set(ev.failure_normalized, (modeMap.get(ev.failure_normalized) || 0) + 1);
    }

    if (ev.department) {
      deptMap.set(ev.department, (deptMap.get(ev.department) || 0) + 1);
    }
  }

  const topMachines: MachineConcentrationItem[] = Array.from(machMap.entries())
    .map(([mId, data]) => ({
      machine_id: mId,
      department: data.dept,
      failure_count: data.count,
      share_percentage: Math.round((data.count / total) * 10000) / 100
    }))
    .sort((a, b) => b.failure_count - a.failure_count);

  const topFailureModes: FailureModeConcentrationItem[] = Array.from(modeMap.entries())
    .map(([mode, count]) => ({
      failure_normalized: mode,
      failure_count: count,
      share_percentage: Math.round((count / total) * 10000) / 100
    }))
    .sort((a, b) => b.failure_count - a.failure_count);

  const byDept: DepartmentConcentrationItem[] = Array.from(deptMap.entries())
    .map(([dept, count]) => ({
      department: dept,
      failure_count: count,
      share_percentage: Math.round((count / total) * 10000) / 100
    }))
    .sort((a, b) => b.failure_count - a.failure_count);

  return {
    total_known_failures: total,
    top_machines: topMachines,
    top_failure_modes: topFailureModes,
    by_department: byDept
  };
}
