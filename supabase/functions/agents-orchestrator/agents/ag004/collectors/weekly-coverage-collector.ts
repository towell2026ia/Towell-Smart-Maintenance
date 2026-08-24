// supabase/functions/agents-orchestrator/agents/ag004/collectors/weekly-coverage-collector.ts
// Weekly Coverage & Signal Collector for AG-004 (PRD-AG004-R1)

import { 
  MachineRecord, 
  HistoricalFaultRecord, 
  TelegramEventRecord, 
  ExistingScheduleRecord, 
  DepartmentCode,
  EligibilityReason
} from '../types/ag004.types.ts';
import { evaluateAutonomousAssetEligibility } from '../guards/autonomous-eligibility-guard.ts';
import { checkExistingAutonomousSchedule } from '../guards/duplicate-schedule-guard.ts';
import { MAX_WEEKLY_AUTONOMOUS_CAPACITY } from '../rules/week.rules.ts';

export interface EligibleCandidateItem {
  machineId: string;
  department: DepartmentCode;
  criticality: 'MUY_ALTA' | 'ALTA' | 'MEDIA' | 'BAJA';
  rankingScore: number;
  rankingPosition?: number;
  eligibilityReason: EligibilityReason;
  failureHistoryCount: number;
  hasRecurrence: boolean;
  hasTrend: boolean;
  isAlreadyCovered: boolean;
  coverageStatus?: 'ALREADY_SCHEDULED' | 'ALREADY_COMPLETED';
}

export interface CoverageCollectionResult {
  eligibleMachines: EligibleCandidateItem[];
  machinesToSchedule: EligibleCandidateItem[];
  alreadyCoveredCount: number;
  ineligibleCount: number;
  departmentCounts: Record<DepartmentCode, number>;
  stats: {
    scannedMachines: number;
    assetsWithFailureHistory: number;
    assetsWithRecurrence: number;
    assetsWithTrend: number;
    eligibleCount: number;
    selectedCount: number;
  };
}

export function collectWeeklyCoverage(
  machines: MachineRecord[],
  isoYear: number,
  isoWeek: number,
  existingRecords: ExistingScheduleRecord[] = [],
  faults: HistoricalFaultRecord[] = [],
  telegramEvents: TelegramEventRecord[] = []
): CoverageCollectionResult {
  const eligibleMachines: EligibleCandidateItem[] = [];
  let alreadyCoveredCount = 0;
  let ineligibleCount = 0;
  const deptCounts: Record<DepartmentCode, number> = { PF: 0, CF: 0, TF: 0, AF: 0 };

  let assetsWithHistory = 0;
  let assetsWithRecurrence = 0;
  let assetsWithTrend = 0;

  for (const m of machines) {
    const el = evaluateAutonomousAssetEligibility(m, faults, telegramEvents);

    if (el.failureHistoryCount > 0) {
      assetsWithHistory++;
    }
    if (el.hasRecurrence) {
      assetsWithRecurrence++;
    }
    if (el.hasTrend) {
      assetsWithTrend++;
    }

    if (!el.isEligible || !el.department || !el.reason) {
      ineligibleCount++;
      continue;
    }

    const dept = el.department;
    deptCounts[dept] = (deptCounts[dept] || 0) + 1;

    const cov = checkExistingAutonomousSchedule(el.machineId, isoYear, isoWeek, existingRecords);
    const crit = m.nivel_criticidad || 'MEDIA';

    const candItem: EligibleCandidateItem = {
      machineId: el.machineId,
      department: dept,
      criticality: crit,
      rankingScore: el.rankingScore,
      eligibilityReason: el.reason,
      failureHistoryCount: el.failureHistoryCount,
      hasRecurrence: el.hasRecurrence,
      hasTrend: el.hasTrend,
      isAlreadyCovered: cov.isAlreadyCovered,
      coverageStatus: cov.status
    };

    eligibleMachines.push(candItem);

    if (cov.isAlreadyCovered) {
      alreadyCoveredCount++;
    }
  }

  // Filter not already covered
  const uncoveredEligible = eligibleMachines.filter(e => !e.isAlreadyCovered);

  // Deterministic sorting by rankingScore DESC -> failureHistoryCount DESC -> machineId ASC
  uncoveredEligible.sort((a, b) => {
    if (b.rankingScore !== a.rankingScore) {
      return b.rankingScore - a.rankingScore;
    }
    if (b.failureHistoryCount !== a.failureHistoryCount) {
      return b.failureHistoryCount - a.failureHistoryCount;
    }
    return a.machineId.localeCompare(b.machineId);
  });

  // Assign ranking position
  uncoveredEligible.forEach((item, index) => {
    item.rankingPosition = index + 1;
  });

  // Capacity limit: Top 15 Max (PRD-AG004-R1 §17-20, §42)
  const machinesToSchedule = uncoveredEligible.slice(0, MAX_WEEKLY_AUTONOMOUS_CAPACITY);

  return {
    eligibleMachines,
    machinesToSchedule,
    alreadyCoveredCount,
    ineligibleCount,
    departmentCounts: deptCounts,
    stats: {
      scannedMachines: machines.length,
      assetsWithFailureHistory: assetsWithHistory,
      assetsWithRecurrence: assetsWithRecurrence,
      assetsWithTrend: assetsWithTrend,
      eligibleCount: eligibleMachines.length,
      selectedCount: machinesToSchedule.length
    }
  };
}
