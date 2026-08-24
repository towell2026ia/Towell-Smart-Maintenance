// supabase/functions/agents-orchestrator/agents/ag002/resolvers/annual-window-resolver.ts
// Master Annual Planning Window Resolver for AG-002 (PRD-AG002-R2.1.2)
// Invariants: C-001 (Dynamic Weeks, no 52 hardcoded), PX-002 (Official Mon-Fri Calendar), PX-006 (Past-Year Protection)

import { OPERATIONAL_CALENDAR_CONFIG } from '../rules/preventive-rules.config.ts';

export interface WeeklyPlanningSlot {
  iso_year: number;
  iso_week: number;
  week_key: string;
  month_number: number;
  monday_date: string;
  operational_days: string[]; // List of YYYY-MM-DD business days
}

export interface AnnualPlanningWindow {
  target_year: number;
  reference_date: string;
  status: 'READY' | 'PAST_YEAR_PLANNING_NOT_ALLOWED';
  is_current_year: boolean;
  is_future_year: boolean;
  planning_start_date: string;
  planning_end_date: string;
  total_available_weeks: number;
  total_available_operational_days: number;
  weekly_slots: WeeklyPlanningSlot[];
  operational_days_source: string;
}

/**
 * Derives ISO week number and ISO year for a given date UTC.
 */
function getIsoWeekData(d: Date): { isoYear: number; isoWeek: number } {
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNr = (target.getUTCDay() + 6) % 7 + 1; // 1 = Mon .. 7 = Sun
  target.setUTCDate(target.getUTCDate() - dayNr + 4);
  const isoYear = target.getUTCFullYear();
  const yearStart = new Date(Date.UTC(isoYear, 0, 1));
  const isoWeek = Math.ceil((((target.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return { isoYear, isoWeek };
}

/**
 * Resolves the next available Monday from a reference date.
 */
function getNextAvailableMonday(refDate: Date): Date {
  const currentDow = (refDate.getUTCDay() + 6) % 7 + 1; // 1 = Mon .. 7 = Sun
  const daysUntilNextMon = currentDow === 1 ? 7 : (8 - currentDow);
  const nextMon = new Date(refDate.getTime() + daysUntilNextMon * 86400000);
  return new Date(Date.UTC(nextMon.getUTCFullYear(), nextMon.getUTCMonth(), nextMon.getUTCDate()));
}

/**
 * Pure deterministic Annual Planning Window Resolver (0 LLM Calls).
 */
export function resolvePreventiveAnnualPlanningWindow(
  referenceDateInput?: Date | string | null,
  targetYearInput?: number | null
): AnnualPlanningWindow {
  let refDate: Date;
  if (!referenceDateInput) {
    refDate = new Date();
  } else if (referenceDateInput instanceof Date) {
    refDate = new Date(referenceDateInput.getTime());
  } else {
    const s = String(referenceDateInput).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
      refDate = new Date(s.substring(0, 10) + 'T00:00:00Z');
    } else {
      refDate = new Date(s);
    }
  }

  if (isNaN(refDate.getTime())) {
    refDate = new Date();
  }

  const currentYear = refDate.getUTCFullYear();
  const targetYear = typeof targetYearInput === 'number' && !isNaN(targetYearInput) ? targetYearInput : currentYear;
  const refDateStr = refDate.toISOString().split('T')[0];

  // PX-006: Past-Year Protection
  if (targetYear < currentYear) {
    return {
      target_year: targetYear,
      reference_date: refDateStr,
      status: 'PAST_YEAR_PLANNING_NOT_ALLOWED',
      is_current_year: false,
      is_future_year: false,
      planning_start_date: `${targetYear}-01-01`,
      planning_end_date: `${targetYear}-12-31`,
      total_available_weeks: 0,
      total_available_operational_days: 0,
      weekly_slots: [],
      operational_days_source: OPERATIONAL_CALENDAR_CONFIG.source
    };
  }

  const isCurrentYear = targetYear === currentYear;
  const isFutureYear = targetYear > currentYear;

  let startPlanningDate: Date;
  let endPlanningDate: Date = new Date(Date.UTC(targetYear, 11, 31)); // Dec 31

  if (isCurrentYear) {
    // Current-year catchup: Next available Monday
    const nextMon = getNextAvailableMonday(refDate);
    startPlanningDate = nextMon;
    // Guard: if nextMon is in next year, clamp
    if (startPlanningDate > endPlanningDate) {
      startPlanningDate = new Date(Date.UTC(targetYear, 11, 31));
    }
  } else {
    // Future year: Full year starting Jan 1
    startPlanningDate = new Date(Date.UTC(targetYear, 0, 1));
  }

  // Generate all weekly slots spanning from startPlanningDate to endPlanningDate
  const weeklySlots: WeeklyPlanningSlot[] = [];
  const processedWeeks = new Set<string>();

  // Iterate by day from start to end, capturing each unique ISO week Monday
  let cursor = new Date(startPlanningDate.getTime());

  while (cursor <= endPlanningDate) {
    const { isoYear, isoWeek } = getIsoWeekData(cursor);
    const weekKey = `${isoYear}-W${String(isoWeek).padStart(2, '0')}`;

    if (!processedWeeks.has(weekKey)) {
      processedWeeks.add(weekKey);

      // Find Monday of this ISO week
      const dow = (cursor.getUTCDay() + 6) % 7 + 1; // 1 = Mon .. 7 = Sun
      const monday = new Date(cursor.getTime() - (dow - 1) * 86400000);
      const mondayStr = monday.toISOString().split('T')[0];

      // Build valid operational business days (Mon to Fri: 5 days) (PX-002)
      const opDays: string[] = [];
      for (let i = 0; i < 5; i++) {
        const dayDate = new Date(monday.getTime() + i * 86400000);
        const dayDateStr = dayDate.toISOString().split('T')[0];
        const dayYear = dayDate.getUTCFullYear();

        // Enforce strict year boundaries and planning range
        if (dayYear === targetYear && dayDate >= startPlanningDate && dayDate <= endPlanningDate) {
          opDays.push(dayDateStr);
        } else if (!isCurrentYear && dayYear === targetYear) {
          opDays.push(dayDateStr);
        }
      }

      if (opDays.length > 0) {
        // Month of the slot (use approx midpoint or Monday month)
        const monthNum = cursor.getUTCMonth() + 1;

        weeklySlots.push({
          iso_year: isoYear,
          iso_week: isoWeek,
          week_key: weekKey,
          month_number: monthNum,
          monday_date: mondayStr,
          operational_days: opDays
        });
      }
    }

    // Advance cursor by 1 day
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  const totalOpDays = weeklySlots.reduce((acc, w) => acc + w.operational_days.length, 0);

  return {
    target_year: targetYear,
    reference_date: refDateStr,
    status: 'READY',
    is_current_year: isCurrentYear,
    is_future_year: isFutureYear,
    planning_start_date: startPlanningDate.toISOString().split('T')[0],
    planning_end_date: endPlanningDate.toISOString().split('T')[0],
    total_available_weeks: weeklySlots.length,
    total_available_operational_days: totalOpDays,
    weekly_slots: weeklySlots,
    operational_days_source: OPERATIONAL_CALENDAR_CONFIG.source
  };
}
