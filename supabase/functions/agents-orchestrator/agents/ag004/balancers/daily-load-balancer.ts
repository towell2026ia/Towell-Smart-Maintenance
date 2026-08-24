// supabase/functions/agents-orchestrator/agents/ag004/balancers/daily-load-balancer.ts
// Daily Load Balancer for AG-004 (PRD-AG004-R1 Mon-Fri Rule)

import { DepartmentCode, EligibilityReason } from '../types/ag004.types.ts';
import { calculateDailySlotDistribution } from '../rules/load-balancing.rules.ts';
import { DAYS_IN_OPERATING_WEEK } from '../rules/week.rules.ts';

export interface BalancedMachineSlot {
  machineId: string;
  department: DepartmentCode;
  criticality: 'MUY_ALTA' | 'ALTA' | 'MEDIA' | 'BAJA';
  dayIndex: number; // 0 = Lunes, 1 = Martes, 2 = Miércoles, 3 = Jueves, 4 = Viernes
  rankingPosition?: number;
  eligibilityReason?: EligibilityReason;
  failureHistoryCount?: number;
  hasRecurrence?: boolean;
  hasTrend?: boolean;
}

export function balanceMachinesAcrossOperatingDays(
  machinesToSchedule: {
    machineId: string;
    department: DepartmentCode;
    criticality: 'MUY_ALTA' | 'ALTA' | 'MEDIA' | 'BAJA';
    rankingPosition?: number;
    eligibilityReason?: EligibilityReason;
    failureHistoryCount?: number;
    hasRecurrence?: boolean;
    hasTrend?: boolean;
  }[],
  daysCount: number = DAYS_IN_OPERATING_WEEK
): {
  slots: BalancedMachineSlot[];
  distribution: number[];
} {
  const total = machinesToSchedule.length;
  const distribution = calculateDailySlotDistribution(total, daysCount);

  if (total === 0) {
    return { slots: [], distribution };
  }

  // Interleave/round-robin by department to achieve balanced multi-department days
  // 1. Group by department
  const byDept: Record<string, typeof machinesToSchedule> = { PF: [], CF: [], TF: [], AF: [] };
  for (const m of machinesToSchedule) {
    if (!byDept[m.department]) byDept[m.department] = [];
    byDept[m.department].push(m);
  }

  // 2. Interleave into a single deterministic sequence
  const interleaved: typeof machinesToSchedule = [];
  const deptKeys: DepartmentCode[] = ['PF', 'CF', 'TF', 'AF'];
  let addedInRound = true;
  let roundIdx = 0;

  while (addedInRound) {
    addedInRound = false;
    for (const d of deptKeys) {
      if (byDept[d] && roundIdx < byDept[d].length) {
        interleaved.push(byDept[d][roundIdx]);
        addedInRound = true;
      }
    }
    roundIdx++;
  }

  // 3. Assign slots to match the exact daily distribution caps
  const dayCaps = [...distribution];
  const dayCurrentCounts = new Array(daysCount).fill(0);
  const slots: BalancedMachineSlot[] = [];

  let currentDay = 0;
  for (const m of interleaved) {
    // Find next day with available capacity
    while (dayCurrentCounts[currentDay] >= dayCaps[currentDay]) {
      currentDay = (currentDay + 1) % daysCount;
    }

    slots.push({
      machineId: m.machineId,
      department: m.department,
      criticality: m.criticality,
      dayIndex: currentDay,
      rankingPosition: m.rankingPosition,
      eligibilityReason: m.eligibilityReason,
      failureHistoryCount: m.failureHistoryCount,
      hasRecurrence: m.hasRecurrence,
      hasTrend: m.hasTrend
    });

    dayCurrentCounts[currentDay]++;
    currentDay = (currentDay + 1) % daysCount;
  }

  // Sort slots by dayIndex -> department -> machineId for clean presentation
  slots.sort((a, b) => {
    if (a.dayIndex !== b.dayIndex) return a.dayIndex - b.dayIndex;
    if (a.department !== b.department) return a.department.localeCompare(b.department);
    return a.machineId.localeCompare(b.machineId);
  });

  return {
    slots,
    distribution
  };
}
