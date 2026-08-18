// supabase/functions/agents-orchestrator/agents/ag004/rules/idempotency.rules.ts
// Manifest: AG004-IDEMPOTENCY-RULES-001

export const IDEMPOTENCY_RULES_VERSION = 'AG004-IDEMPOTENCY-RULES-001';

export function buildAutonomousScheduleKey(machineId: string, isoYear: number, isoWeek: number): string {
  const normMachine = String(machineId).trim().toUpperCase();
  const weekPadded = String(isoWeek).padStart(2, '0');
  return `AUT-${normMachine}-${isoYear}-W${weekPadded}`;
}

export function buildSurveyFolio(machineId: string, isoYear: number, isoWeek: number): string {
  const normMachine = String(machineId).trim().toUpperCase();
  const weekPadded = String(isoWeek).padStart(2, '0');
  return `AUT-LEV-${normMachine}-${isoYear}W${weekPadded}`;
}
