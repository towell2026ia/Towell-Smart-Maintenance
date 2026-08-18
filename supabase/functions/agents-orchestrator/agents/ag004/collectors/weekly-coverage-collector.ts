// supabase/functions/agents-orchestrator/agents/ag004/collectors/weekly-coverage-collector.ts
// Weekly Coverage Collector for AG-004

import { MachineRecord, ExistingScheduleRecord, DepartmentCode } from '../types/ag004.types.ts';
import { evaluateMachineEligibility } from '../guards/autonomous-eligibility-guard.ts';
import { checkExistingAutonomousSchedule } from '../guards/duplicate-schedule-guard.ts';
import { CRITICALITY_WEIGHTS } from '../rules/coverage.rules.ts';

export interface CoverageCollectionResult {
  eligibleMachines: {
    machineId: string;
    department: DepartmentCode;
    criticality: 'MUY_ALTA' | 'ALTA' | 'MEDIA' | 'BAJA';
    isAlreadyCovered: boolean;
    coverageStatus?: 'ALREADY_SCHEDULED' | 'ALREADY_COMPLETED';
  }[];
  machinesToSchedule: {
    machineId: string;
    department: DepartmentCode;
    criticality: 'MUY_ALTA' | 'ALTA' | 'MEDIA' | 'BAJA';
  }[];
  alreadyCoveredCount: number;
  ineligibleCount: number;
  departmentCounts: Record<DepartmentCode, number>;
}

export function collectWeeklyCoverage(
  machines: MachineRecord[],
  isoYear: number,
  isoWeek: number,
  existingRecords: ExistingScheduleRecord[] = []
): CoverageCollectionResult {
  const eligibleMachines: CoverageCollectionResult['eligibleMachines'] = [];
  const machinesToSchedule: CoverageCollectionResult['machinesToSchedule'] = [];
  let alreadyCoveredCount = 0;
  let ineligibleCount = 0;
  const deptCounts: Record<DepartmentCode, number> = { PF: 0, CF: 0, TF: 0, AF: 0 };

  for (const m of machines) {
    const el = evaluateMachineEligibility(m);
    if (!el.isEligible || !el.department) {
      ineligibleCount++;
      continue;
    }

    const dept = el.department;
    deptCounts[dept] = (deptCounts[dept] || 0) + 1;

    const cov = checkExistingAutonomousSchedule(el.machineId, isoYear, isoWeek, existingRecords);
    const crit = m.nivel_criticidad || 'MEDIA';

    eligibleMachines.push({
      machineId: el.machineId,
      department: dept,
      criticality: crit,
      isAlreadyCovered: cov.isAlreadyCovered,
      coverageStatus: cov.status
    });

    if (cov.isAlreadyCovered) {
      alreadyCoveredCount++;
    } else {
      machinesToSchedule.push({
        machineId: el.machineId,
        department: dept,
        criticality: crit
      });
    }
  }

  // Deterministic sorting: Department -> Criticality DESC -> machine_id ASC
  machinesToSchedule.sort((a, b) => {
    if (a.department !== b.department) {
      return a.department.localeCompare(b.department);
    }
    const weightA = CRITICALITY_WEIGHTS[a.criticality] || 2;
    const weightB = CRITICALITY_WEIGHTS[b.criticality] || 2;
    if (weightB !== weightA) {
      return weightB - weightA;
    }
    return a.machineId.localeCompare(b.machineId);
  });

  return {
    eligibleMachines,
    machinesToSchedule,
    alreadyCoveredCount,
    ineligibleCount,
    departmentCounts: deptCounts
  };
}
