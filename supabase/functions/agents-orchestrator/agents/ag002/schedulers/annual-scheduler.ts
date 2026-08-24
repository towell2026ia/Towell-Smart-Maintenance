// supabase/functions/agents-orchestrator/agents/ag002/schedulers/annual-scheduler.ts
// Master Deterministic Annual Scheduler with Weekly & Daily Distribution (PRD-AG002-R2.1.2)
// Invariants: C-001 (Dynamic Weeks), C-007 (Balanced Distribution), EC-002 (Exclusive Classification), PX-002 (Operational Days)

import { MachinePreventiveProfile, PlannedPreventiveSlot } from '../types/ag002.types.ts';
import { AnnualPlanningWindow, resolvePreventiveAnnualPlanningWindow } from '../resolvers/annual-window-resolver.ts';
import { AnnualCapacityPlanner, DynamicCapacitySlot, CapacityFeasibilityReport } from './annual-capacity-planner.ts';
import { OPERATIONAL_CALENDAR_CONFIG } from '../rules/preventive-rules.config.ts';

export interface AssetReconciliationRecord {
  machine_id: string;
  classification: 'COMPLETED_REAL' | 'VALID_FUTURE_SCHEDULED' | 'NEWLY_SCHEDULED' | 'EXPLICIT_CONFIGURATION_GAP';
  scheduled_date?: string;
  iso_week?: number;
  service_code?: string;
  notes?: string;
}

export interface AnnualScheduleResult {
  target_year: number;
  planning_window: AnnualPlanningWindow;
  capacity_report: CapacityFeasibilityReport;
  slots: PlannedPreventiveSlot[];
  reconciliation: {
    active_applicable_count: number;
    completed_real_count: number;
    valid_future_scheduled_count: number;
    newly_scheduled_count: number;
    configuration_gaps_count: number;
    total_reconciled: number;
    unreconciled_count: number;
    classification_overlap_count: number;
    duplicate_annual_conflicts_count: number;
    annual_coverage_pct: number;
    records: AssetReconciliationRecord[];
  };
  distribution_evidence: {
    weeks_used_count: number;
    distinct_scheduled_dates_count: number;
    max_assets_on_single_date: number;
    annual_plan_single_day: boolean;
    weekly_breakdown: { iso_week: number; week_key: string; asset_count: number; dates: string[] }[];
    daily_breakdown: { date: string; weekday: string; asset_count: number; assets: string[] }[];
  };
}

export function scheduleAnnualPreventiveCalendar(
  profiles: MachinePreventiveProfile[],
  targetYear: number,
  referenceDate?: string | Date | null,
  completedMachineIds: Set<string> = new Set(),
  validFutureMachineMap: Map<string, { scheduled_date: string; iso_week: number; service_code?: string }> = new Map(),
  calendarRefPrefix: string = `CAL-${targetYear}`
): AnnualScheduleResult {
  // 1. Resolve Dynamic Planning Window (C-001, PX-002, PX-006)
  const window = resolvePreventiveAnnualPlanningWindow(referenceDate, targetYear);
  const capacityMap = AnnualCapacityPlanner.initializeDynamicCapacityMap(window);

  const slots: PlannedPreventiveSlot[] = [];
  const reconciliationRecords: AssetReconciliationRecord[] = [];

  let completedRealCount = 0;
  let validFutureCount = 0;
  let newlyScheduledCount = 0;
  let configGapsCount = 0;
  let overlapCount = 0;
  let duplicateConflictsCount = 0;

  // 2. Identify and classify all active assets (EC-002)
  const eligibleToSchedule: MachinePreventiveProfile[] = [];

  for (const prof of profiles) {
    const machId = prof.machine_id;
    const isCompleted = completedMachineIds.has(machId);
    const hasValidFuture = validFutureMachineMap.has(machId);

    // Check duplicate conflict: completed real + valid future
    if (isCompleted && hasValidFuture) {
      duplicateConflictsCount++;
      overlapCount++;
      // Priority: Preserve completed real history, disregard future duplicate
      completedRealCount++;
      reconciliationRecords.push({
        machine_id: machId,
        classification: 'COMPLETED_REAL',
        notes: 'DUPLICATE_ANNUAL_PREVENTIVE_CONFLICT: Completed real work preserved, invalid future duplicate suppressed'
      });
      continue;
    }

    if (isCompleted) {
      completedRealCount++;
      reconciliationRecords.push({
        machine_id: machId,
        classification: 'COMPLETED_REAL',
        notes: 'Already completed real preventive in target year'
      });
      continue;
    }

    if (hasValidFuture) {
      validFutureCount++;
      const fut = validFutureMachineMap.get(machId)!;
      reconciliationRecords.push({
        machine_id: machId,
        classification: 'VALID_FUTURE_SCHEDULED',
        scheduled_date: fut.scheduled_date,
        iso_week: fut.iso_week,
        service_code: fut.service_code,
        notes: 'Valid future preventive already scheduled in target year'
      });
      continue;
    }

    // Check configuration gap (missing service)
    if (!prof.can_schedule || !prof.selected_service) {
      configGapsCount++;
      reconciliationRecords.push({
        machine_id: machId,
        classification: 'EXPLICIT_CONFIGURATION_GAP',
        notes: 'MISSING_PREVENTIVE_SERVICE_MAPPING: Active asset without preventive service'
      });
      continue;
    }

    // Asset requires newly scheduled slot
    eligibleToSchedule.push(prof);
  }

  // 3. Evaluate Capacity Feasibility (PX-005)
  const capacityReport = AnnualCapacityPlanner.evaluateCapacityFeasibility(eligibleToSchedule.length, window);

  // 4. Sort Eligible Machines by Deterministic Priority (Highest Score First)
  // Higher Priority = Earlier Week & Earlier Business Day
  eligibleToSchedule.sort((a, b) => {
    if (b.priority_components.total_score !== a.priority_components.total_score) {
      return b.priority_components.total_score - a.priority_components.total_score;
    }
    if (b.priority_components.criticality_score !== a.priority_components.criticality_score) {
      return b.priority_components.criticality_score - a.priority_components.criticality_score;
    }
    if (b.recurrence_metrics.failure_count_12m !== a.recurrence_metrics.failure_count_12m) {
      return b.recurrence_metrics.failure_count_12m - a.recurrence_metrics.failure_count_12m;
    }
    if (b.downtime_metrics.downtime_minutes_12m !== a.downtime_metrics.downtime_minutes_12m) {
      return b.downtime_metrics.downtime_minutes_12m - a.downtime_metrics.downtime_minutes_12m;
    }
    return a.machine_id.localeCompare(b.machine_id);
  });

  // 5. Balanced Two-Level Distribution: Available Weeks -> Operational Days (C-007, PX-002)
  const availableWeekKeys = Array.from(capacityMap.keys());
  const totalWeeks = availableWeekKeys.length;

  if (totalWeeks > 0 && window.status === 'READY') {
    let slotCounter = 1;

    // Distribute eligible profiles evenly across available weeks
    eligibleToSchedule.forEach((prof, idx) => {
      // Pick week by priority rank progression
      const targetWeekIdx = idx % totalWeeks;
      const assignedWeekNumber = availableWeekKeys[targetWeekIdx];
      const weekSlot = capacityMap.get(assignedWeekNumber)!;

      // Within the week, pick the operational day with the fewest assigned assets (Mon-Fri)
      let bestDay = weekSlot.operational_days[0];
      let minDayCount = Infinity;

      for (const d of weekSlot.operational_days) {
        const count = weekSlot.day_assignments.get(d) || 0;
        if (count < minDayCount) {
          minDayCount = count;
          bestDay = d;
        }
      }

      // Increment counters
      weekSlot.assigned_count++;
      weekSlot.day_assignments.set(bestDay, (weekSlot.day_assignments.get(bestDay) || 0) + 1);

      const srv = prof.selected_service!;
      const monthNum = new Date(bestDay + 'T00:00:00Z').getUTCMonth() + 1;

      slots.push({
        slot_id: `slot-${slotCounter++}`,
        machine_id: prof.machine_id,
        department: prof.department_code,
        is_loom: prof.is_loom,
        period: 'ANUAL',
        scheduled_date: bestDay,
        year: targetYear,
        week_number: assignedWeekNumber,
        month_number: monthNum,
        priority_score: prof.priority_components.total_score,
        priority_band: prof.priority_components.priority_band,
        service_code: srv.codigo_servicio,
        service_name: srv.nombre_servicio,
        estimated_duration_min: srv.duracion_estimada_min || 180,
        planned_parts: prof.estimated_parts.map(p => ({
          cve_refaccion: p.cve_refaccion,
          cantidad: p.cantidad,
          costo_unitario: p.costo_unitario
        })),
        parts_cost_known: prof.estimated_parts_cost_total || 0,
        budget_status: prof.budget_status,
        calendar_reference: `${calendarRefPrefix}-${prof.department_code}`
      });

      newlyScheduledCount++;
      reconciliationRecords.push({
        machine_id: prof.machine_id,
        classification: 'NEWLY_SCHEDULED',
        scheduled_date: bestDay,
        iso_week: assignedWeekNumber,
        service_code: srv.codigo_servicio,
        notes: `Scheduled in week ${weekSlot.week_key} on ${bestDay}`
      });
    });
  }

  // 6. Compute Distribution Evidence (C-007)
  const scheduledDatesMap = new Map<string, string[]>();
  const scheduledWeeksMap = new Map<number, { week_key: string; dates: Set<string>; count: number }>();

  for (const s of slots) {
    if (!scheduledDatesMap.has(s.scheduled_date)) {
      scheduledDatesMap.set(s.scheduled_date, []);
    }
    scheduledDatesMap.get(s.scheduled_date)!.push(s.machine_id);

    if (!scheduledWeeksMap.has(s.week_number)) {
      const slotCap = capacityMap.get(s.week_number);
      scheduledWeeksMap.set(s.week_number, {
        week_key: slotCap ? slotCap.week_key : `${targetYear}-W${s.week_number}`,
        dates: new Set(),
        count: 0
      });
    }
    const wObj = scheduledWeeksMap.get(s.week_number)!;
    wObj.count++;
    wObj.dates.add(s.scheduled_date);
  }

  const distinctDatesCount = scheduledDatesMap.size;
  const weeksUsedCount = scheduledWeeksMap.size;
  let maxOnSingleDate = 0;
  for (const arr of scheduledDatesMap.values()) {
    if (arr.length > maxOnSingleDate) maxOnSingleDate = arr.length;
  }

  const isSingleDayCollapse = slots.length > 1 && distinctDatesCount <= 1;

  const weekdayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const dailyBreakdown = Array.from(scheduledDatesMap.entries()).map(([date, assets]) => {
    const dObj = new Date(date + 'T00:00:00Z');
    const dayName = weekdayNames[dObj.getUTCDay()];
    return {
      date,
      weekday: dayName,
      asset_count: assets.length,
      assets
    };
  }).sort((a, b) => a.date.localeCompare(b.date));

  const weeklyBreakdown = Array.from(scheduledWeeksMap.entries()).map(([weekNum, val]) => ({
    iso_week: weekNum,
    week_key: val.week_key,
    asset_count: val.count,
    dates: Array.from(val.dates).sort()
  })).sort((a, b) => a.iso_week - b.iso_week);

  const totalReconciled = completedRealCount + validFutureCount + newlyScheduledCount + configGapsCount;
  const unreconciledCount = Math.max(0, profiles.length - totalReconciled);
  const coveragePct = profiles.length > 0
    ? Math.round(((completedRealCount + validFutureCount + newlyScheduledCount) / profiles.length) * 10000) / 100
    : 100;

  return {
    target_year: targetYear,
    planning_window: window,
    capacity_report: capacityReport,
    slots,
    reconciliation: {
      active_applicable_count: profiles.length,
      completed_real_count: completedRealCount,
      valid_future_scheduled_count: validFutureCount,
      newly_scheduled_count: newlyScheduledCount,
      configuration_gaps_count: configGapsCount,
      total_reconciled: totalReconciled,
      unreconciled_count: unreconciledCount,
      classification_overlap_count: overlapCount,
      duplicate_annual_conflicts_count: duplicateConflictsCount,
      annual_coverage_pct: coveragePct,
      records: reconciliationRecords
    },
    distribution_evidence: {
      weeks_used_count: weeksUsedCount,
      distinct_scheduled_dates_count: distinctDatesCount,
      max_assets_on_single_date: maxOnSingleDate,
      annual_plan_single_day: isSingleDayCollapse,
      weekly_breakdown: weeklyBreakdown,
      daily_breakdown: dailyBreakdown
    }
  };
}
