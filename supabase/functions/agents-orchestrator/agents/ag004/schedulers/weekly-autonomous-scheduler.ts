// supabase/functions/agents-orchestrator/agents/ag004/schedulers/weekly-autonomous-scheduler.ts
// Weekly Autonomous Scheduler for AG-004 (PRD-AG004-R1 Mon-Fri Rule)

import { ScheduledAutonomousItem, IsoWeekInfo, EligibilityReason } from '../types/ag004.types.ts';
import { BalancedMachineSlot } from '../balancers/daily-load-balancer.ts';
import { OPERATING_DAY_NAMES } from '../rules/week.rules.ts';
import { buildAutonomousScheduleKey, buildSurveyFolio } from '../rules/idempotency.rules.ts';

export interface SchedulableCandidateSlot extends BalancedMachineSlot {
  rankingPosition?: number;
  eligibilityReason?: EligibilityReason;
  failureHistoryCount?: number;
  hasRecurrence?: boolean;
  hasTrend?: boolean;
}

export function scheduleAutonomousWeek(
  slots: SchedulableCandidateSlot[],
  weekInfo: IsoWeekInfo
): ScheduledAutonomousItem[] {
  const scheduledItems: ScheduledAutonomousItem[] = [];

  for (const s of slots) {
    const scheduledDate = weekInfo.operating_days[s.dayIndex];
    if (!scheduledDate) {
      throw new Error(`INVALID_OPERATING_DATE: No date found for dayIndex ${s.dayIndex}`);
    }

    // Safety checks: Ensure not Sunday and not Saturday (Mon-Fri only)
    const d = new Date(scheduledDate + 'T00:00:00Z');
    const dow = d.getUTCDay();
    if (dow === 0) {
      throw new Error(`SUNDAY_SCHEDULING_VIOLATION: Date ${scheduledDate} is a Sunday.`);
    }
    if (dow === 6) {
      throw new Error(`SATURDAY_SCHEDULING_VIOLATION: Date ${scheduledDate} is a Saturday.`);
    }

    const dayName = OPERATING_DAY_NAMES[s.dayIndex] || 'LUNES';
    const calRef = buildAutonomousScheduleKey(s.machineId, weekInfo.iso_year, weekInfo.iso_week);
    const surveyRef = buildSurveyFolio(s.machineId, weekInfo.iso_year, weekInfo.iso_week);

    scheduledItems.push({
      machine_id: s.machineId,
      department: s.department,
      scheduled_date: scheduledDate,
      iso_year: weekInfo.iso_year,
      iso_week: weekInfo.iso_week,
      week_key: weekInfo.week_key,
      day_of_week: dayName as any,
      status: 'SCHEDULED',
      calendar_reference: calRef,
      survey_reference: surveyRef,
      criticality: s.criticality,
      ranking_position: s.rankingPosition,
      eligibility_reason: s.eligibilityReason,
      failure_history_count: s.failureHistoryCount,
      has_recurrence: s.hasRecurrence,
      has_trend: s.hasTrend
    });
  }

  return scheduledItems;
}
