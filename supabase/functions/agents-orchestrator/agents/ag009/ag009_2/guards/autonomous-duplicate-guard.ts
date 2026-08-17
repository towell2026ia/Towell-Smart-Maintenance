// supabase/functions/agents-orchestrator/agents/ag009/ag009_2/guards/autonomous-duplicate-guard.ts
// Duplicate Execution Guard for Weekly Autonomous Surveys (§15, §16, §45, §70 PRD)

import { AutonomousConnectorError } from '../errors/autonomous-error-catalog.ts';

export interface AutonomousSurveyRecord {
  survey_id?: string;
  machine_id: string;
  week_reference: string | number;
  year?: number;
  calendar_reference?: string;
  status?: string;
}

export function validateAutonomousDuplicateGuard(
  machineId: string,
  weekReference: string | number,
  year: number,
  existingSurveys: AutonomousSurveyRecord[]
): { isDuplicate: boolean } {
  const normMachine = String(machineId).trim().toUpperCase();
  const normWeek = String(weekReference).trim().toUpperCase();

  const duplicate = existingSurveys.find(s => {
    if (!s || !s.machine_id) return false;
    const sameMachine = s.machine_id.trim().toUpperCase() === normMachine;
    const sameWeek = String(s.week_reference).trim().toUpperCase() === normWeek;
    const sameYear = s.year ? s.year === year : true;
    const isCancelled = s.status && ['CANCELADO', 'CANCELADA', 'RECHAZADO'].includes(s.status.toUpperCase());
    return sameMachine && sameWeek && sameYear && !isCancelled;
  });

  if (duplicate) {
    throw new AutonomousConnectorError(
      'AUTONOMOUS_EXECUTION_DUPLICATE',
      `Duplicado semanal: la máquina '${normMachine}' ya cuenta con un levantamiento autónomo ejecutado para la semana '${normWeek}' del año ${year}.`
    );
  }

  return { isDuplicate: false };
}
