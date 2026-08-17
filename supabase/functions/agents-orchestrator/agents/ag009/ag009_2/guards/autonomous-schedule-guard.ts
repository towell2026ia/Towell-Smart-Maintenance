// supabase/functions/agents-orchestrator/agents/ag009/ag009_2/guards/autonomous-schedule-guard.ts
// Validation for Weekly Schedule & Calendar Reference for Autonomous Maintenance (§14 PRD)

import { AutonomousConnectorError } from '../errors/autonomous-error-catalog.ts';

export interface AutonomousScheduleValidationResult {
  calendar_reference: string;
  week_reference: string | number;
  year: number;
  scheduled_date: string;
}

export function validateAutonomousScheduleGuard(
  calendarReference: string,
  weekReference: string | number,
  scheduledDate: string,
  year?: number
): AutonomousScheduleValidationResult {
  const normCal = String(calendarReference || '').trim();
  if (!normCal) {
    throw new AutonomousConnectorError(
      'AUTONOMOUS_SCHEDULE_NOT_FOUND',
      'El calendar_reference es obligatorio para vincular la rutina autónoma.'
    );
  }

  const normWeek = String(weekReference !== undefined && weekReference !== null ? weekReference : '').trim();
  if (!normWeek) {
    throw new AutonomousConnectorError(
      'AUTONOMOUS_SCHEDULE_NOT_FOUND',
      'El week_reference es obligatorio.'
    );
  }

  const d = new Date(scheduledDate);
  if (isNaN(d.getTime())) {
    throw new AutonomousConnectorError(
      'INVALID_CONTRACT',
      `scheduled_date '${scheduledDate}' es inválida.`
    );
  }

  const yearNum = year || d.getUTCFullYear();

  return {
    calendar_reference: normCal,
    week_reference: normWeek,
    year: yearNum,
    scheduled_date: scheduledDate
  };
}
