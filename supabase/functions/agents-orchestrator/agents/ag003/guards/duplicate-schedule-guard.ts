// supabase/functions/agents-orchestrator/agents/ag003/guards/duplicate-schedule-guard.ts
// Duplicate Schedule Guard (§76-78 PRD)

export interface DuplicateScheduleCheckResult {
  isDuplicate: boolean;
  machineId: string;
  targetMonth: string;
  reason?: string;
}

export function checkDuplicateSchedule(
  machineId: string,
  targetMonth: string,
  existingScheduledMachineIds: string[]
): DuplicateScheduleCheckResult {
  const normId = String(machineId || '').trim().toUpperCase();
  const normalizedExisting = (existingScheduledMachineIds || []).map(id => String(id).trim().toUpperCase());

  if (normalizedExisting.includes(normId)) {
    return {
      isDuplicate: true,
      machineId: normId,
      targetMonth,
      reason: `El telar ${normId} ya cuenta con una intervención predictiva programada en el mes ${targetMonth}.`
    };
  }

  return {
    isDuplicate: false,
    machineId: normId,
    targetMonth
  };
}
