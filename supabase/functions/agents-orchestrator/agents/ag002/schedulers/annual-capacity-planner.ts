// supabase/functions/agents-orchestrator/agents/ag002/schedulers/annual-capacity-planner.ts
// Dynamic Annual Capacity Planner for AG-002 (PRD-AG002-R2.1.2)
// Invariants: C-001 (Dynamic Weeks), PX-002 (Official Calendar Source), PX-005 (Capacity Authority)

import { CAPACITY_CONFIG, OPERATIONAL_CALENDAR_CONFIG } from '../rules/preventive-rules.config.ts';
import { AnnualPlanningWindow, WeeklyPlanningSlot } from '../resolvers/annual-window-resolver.ts';

export interface DynamicCapacitySlot {
  week_number: number;
  iso_year: number;
  week_key: string;
  month_number: number;
  monday_date: string;
  operational_days: string[]; // [YYYY-MM-DD]
  assigned_count: number;
  day_assignments: Map<string, number>; // Date -> count
}

export interface CapacityFeasibilityReport {
  capacity_constraint_source: string;
  capacity_status: 'ANNUAL_CATCHUP_CAPACITY_FEASIBLE' | 'ANNUAL_CATCHUP_CAPACITY_GAP' | 'CAPACITY_CONSTRAINT_NOT_CONFIGURED';
  assets_to_schedule: number;
  available_weeks: number;
  available_operational_days: number;
  required_avg_weekly_load: number;
  required_avg_daily_load: number;
  max_authorized_per_week: number | null;
  max_authorized_per_day: number | null;
  operational_days_source: string;
}

export class AnnualCapacityPlanner {
  /**
   * Initializes dynamic capacity slots directly from the resolved annual planning window.
   */
  public static initializeDynamicCapacityMap(window: AnnualPlanningWindow): Map<number, DynamicCapacitySlot> {
    const capacityMap = new Map<number, DynamicCapacitySlot>();

    for (const slot of window.weekly_slots) {
      const dayMap = new Map<string, number>();
      for (const d of slot.operational_days) {
        dayMap.set(d, 0);
      }

      capacityMap.set(slot.iso_week, {
        week_number: slot.iso_week,
        iso_year: slot.iso_year,
        week_key: slot.week_key,
        month_number: slot.month_number,
        monday_date: slot.monday_date,
        operational_days: slot.operational_days,
        assigned_count: 0,
        day_assignments: dayMap
      });
    }

    return capacityMap;
  }

  /**
   * Evaluates feasibility based on authorized capacity constraints (PX-005).
   */
  public static evaluateCapacityFeasibility(
    assetsCount: number,
    window: AnnualPlanningWindow
  ): CapacityFeasibilityReport {
    const availableWeeks = Math.max(1, window.total_available_weeks);
    const availableDays = Math.max(1, window.total_available_operational_days);

    const requiredAvgWeekly = Math.round((assetsCount / availableWeeks) * 100) / 100;
    const requiredAvgDaily = Math.round((assetsCount / availableDays) * 100) / 100;

    let status: 'ANNUAL_CATCHUP_CAPACITY_FEASIBLE' | 'ANNUAL_CATCHUP_CAPACITY_GAP' | 'CAPACITY_CONSTRAINT_NOT_CONFIGURED';

    if (CAPACITY_CONFIG.capacity_constraint_source === 'NONE' || CAPACITY_CONFIG.max_preventives_per_week === null) {
      status = 'CAPACITY_CONSTRAINT_NOT_CONFIGURED';
    } else {
      const maxAllowedWeekly = CAPACITY_CONFIG.max_preventives_per_week;
      if (Math.ceil(assetsCount / availableWeeks) <= maxAllowedWeekly) {
        status = 'ANNUAL_CATCHUP_CAPACITY_FEASIBLE';
      } else {
        status = 'ANNUAL_CATCHUP_CAPACITY_GAP';
      }
    }

    return {
      capacity_constraint_source: CAPACITY_CONFIG.capacity_constraint_source,
      capacity_status: status,
      assets_to_schedule: assetsCount,
      available_weeks: availableWeeks,
      available_operational_days: availableDays,
      required_avg_weekly_load: requiredAvgWeekly,
      required_avg_daily_load: requiredAvgDaily,
      max_authorized_per_week: CAPACITY_CONFIG.max_preventives_per_week,
      max_authorized_per_day: CAPACITY_CONFIG.max_preventives_per_day,
      operational_days_source: OPERATIONAL_CALENDAR_CONFIG.source
    };
  }
}
