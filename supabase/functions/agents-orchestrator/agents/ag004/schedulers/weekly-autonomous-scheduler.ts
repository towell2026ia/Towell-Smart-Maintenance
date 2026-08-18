// supabase/functions/agents-orchestrator/agents/ag004/schedulers/weekly-autonomous-scheduler.ts
// Weekly Autonomous Scheduler for AG-004

import { ScheduledAutonomousItem, IsoWeekInfo } from '../types/ag004.types.ts';
import { BalancedMachineSlot } from '../balancers/daily-load-balancer.ts';
import { OPERATING_DAY_NAMES } from '../rules/week.rules.ts';
import { buildAutonomousScheduleKey, buildSurveyFolio } from '../rules/idempotency.rules.ts';

export function scheduleAutonomousWeek(
  slots: BalancedMachineSlot[],
  weekInfo: IsoWeekInfo
): ScheduledAutonomousItem[] {
  const scheduledItems: ScheduledAutonomousItem[] = [];

  for (const s of slots) {
    const scheduledDate = weekInfo.operating_days[s.dayIndex];
    if (!scheduledDate) {
      throw new Error(`INVALID_OPERATING_DATE: No date found for dayIndex ${s.dayIndex}`);
    }

    // Safety checks: Ensure not Sunday
    const d = new Date(scheduledDate);
    if (d.getUTCDay() === 0) {
      throw new Error(`SUNDAY_SCHEDULING_VIOLATION: Date ${scheduledDate} is a Sunday.`);
    }

    const dayName = OPERATING_DAY_NAMES[s.dayIndex] || 'LUNES';
    const calRef = buildAutonomousScheduleKey(s.machineId, weekInfo.iso_year, weekInfo.iso_week);
    const surveyRef = buildSurveyFolio(s.machineId, weekInfo.iso_year, weekInfo.iso_week);

    scheduledItems.push({
      machineId: s.machineId,
      department: s.department,
      scheduledDate,
      iso_year: weekInfo.iso_year,
      iso_week: weekInfo.iso_week,
      week_key: weekInfo.week_key,
      day_of_week: dayName,
      status: 'SCHEDULED',
      calendar_reference: calRef,
      survey_reference: surveyRef,
      criticality: s.criticality
    });
  }

  return scheduledItems;
}
