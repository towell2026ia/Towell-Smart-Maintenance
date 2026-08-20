// supabase/functions/agents-orchestrator/agents/ag007/aggregators/cost-period-aggregator.ts
// Multi-dimensional Period Aggregator for AG-007 (v1.0)
// Frozen under Token: AG007-DETERMINISTIC-ENGINE-001
// Invariant: Deterministic sum without float errors (§72-78 PRD)

import type { CostOrigin, EconomicEvent, MaintenanceType, MachineCostSummary } from '../types/ag007.types.ts';

export interface PeriodAggregationResult {
  periodKey: string;
  actual_total: number;
  planned_total: number;
  committed_total: number;
  unknown_events_count: number;
  by_domain: Record<CostOrigin, { amount: number; count: number; unknown_count: number }>;
  by_maintenance_type: Record<MaintenanceType, number>;
  by_department: Record<string, number>;
  by_machine: Record<string, MachineCostSummary>;
}

export function aggregateCostPeriod(
  periodKey: string,
  events: EconomicEvent[],
  plannedPreventiveBudget: number = 0
): PeriodAggregationResult {
  let actualTotal = 0;
  let plannedTotal = plannedPreventiveBudget;
  let committedTotal = 0;
  let unknownEventsCount = 0;

  const byDomain: Record<CostOrigin, { amount: number; count: number; unknown_count: number }> = {
    PART: { amount: 0, count: 0, unknown_count: 0 },
    LABOR: { amount: 0, count: 0, unknown_count: 0 },
    DOWNTIME: { amount: 0, count: 0, unknown_count: 0 },
    SERVICE: { amount: 0, count: 0, unknown_count: 0 },
    OTHER: { amount: 0, count: 0, unknown_count: 0 }
  };

  const byMaintType: Record<MaintenanceType, number> = {
    PREVENTIVO: 0,
    CORRECTIVO: 0,
    AUTONOMO: 0,
    PREDICTIVO: 0,
    GENERAL: 0
  };

  const byDept: Record<string, number> = {
    PF: 0,
    CF: 0,
    TF: 0,
    AF: 0
  };

  const byMachine: Record<string, MachineCostSummary> = {};

  for (const ev of events) {
    const amt = ev.total_amount;
    const domain = ev.cost_origin || 'OTHER';
    const mType = ev.maintenance_type || 'GENERAL';
    const dept = ev.department || 'TF';
    const mach = ev.machine_id || 'UNATTRIBUTED_MACHINE';

    if (amt === null || amt === undefined) {
      unknownEventsCount++;
      byDomain[domain].unknown_count++;
    } else {
      const validAmt = Math.round(amt * 100) / 100;

      if (ev.cost_status === 'ACTUAL') {
        actualTotal += validAmt;
        byDomain[domain].amount += validAmt;
        byMaintType[mType] = (byMaintType[mType] || 0) + validAmt;
        byDept[dept] = (byDept[dept] || 0) + validAmt;

        if (!byMachine[mach]) {
          byMachine[mach] = {
            machine_id: mach,
            department: dept,
            period: ev.period,
            planned_preventive_cost: 0,
            actual_parts_cost: 0,
            total_technical_hours: 0,
            total_downtime_minutes: 0,
            known_cost_total: 0,
            cost_completeness: 'COMPLETE',
            events_count: 0
          };
        }

        byMachine[mach].known_cost_total += validAmt;
        if (domain === 'PART') byMachine[mach].actual_parts_cost += validAmt;
        byMachine[mach].events_count++;
      } else if (ev.cost_status === 'PLANNED') {
        plannedTotal += validAmt;
      } else if (ev.cost_status === 'COMMITTED') {
        committedTotal += validAmt;
      }
    }

    byDomain[domain].count++;
  }

  // Safe rounding
  actualTotal = Math.round(actualTotal * 100) / 100;
  plannedTotal = Math.round(plannedTotal * 100) / 100;
  committedTotal = Math.round(committedTotal * 100) / 100;

  for (const d of Object.keys(byDomain)) {
    byDomain[d as CostOrigin].amount = Math.round(byDomain[d as CostOrigin].amount * 100) / 100;
  }
  for (const m of Object.keys(byMaintType)) {
    byMaintType[m as MaintenanceType] = Math.round(byMaintType[m as MaintenanceType] * 100) / 100;
  }
  for (const dp of Object.keys(byDept)) {
    byDept[dp] = Math.round(byDept[dp] * 100) / 100;
  }
  for (const mc of Object.keys(byMachine)) {
    byMachine[mc].known_cost_total = Math.round(byMachine[mc].known_cost_total * 100) / 100;
    byMachine[mc].actual_parts_cost = Math.round(byMachine[mc].actual_parts_cost * 100) / 100;
  }

  return {
    periodKey,
    actual_total: actualTotal,
    planned_total: plannedTotal,
    committed_total: committedTotal,
    unknown_events_count: unknownEventsCount,
    by_domain: byDomain,
    by_maintenance_type: byMaintType,
    by_department: byDept,
    by_machine: byMachine
  };
}
