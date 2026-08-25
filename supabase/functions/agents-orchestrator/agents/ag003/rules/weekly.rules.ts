// supabase/functions/agents-orchestrator/agents/ag003/rules/weekly.rules.ts
// Official Rules for AG-003.R2 — Predictivo Semanal por Segundas (PRD-AG003-R2)

export const WEEKLY_RULES_VERSION = 'AG003-R2-WEEKLY-v2.0';

export const WEEKLY_CONFIG = {
  MAX_WEEKLY_SELECTIONS: 4,
  CYCLE_DAYS_COUNT: 7,
  SUNDAY_ELIGIBLE: true,
  TARGET_DEPARTMENT: 'PF',
  DEFAULT_SERVICE_CODE: 'SRV-PRED-01' as const,
  DEFAULT_ACTIVITY_NAME: 'Mantenimiento Predictivo por Segundas de Calidad'
};

/**
 * Deterministic tie-breaker comparator for weekly predictive candidates.
 * 1. % Segundas DESC
 * 2. Total Segundas (Defect count) DESC
 * 3. Total Piezas (Production volume) DESC
 * 4. Machine ID ASC (Stable alphanumeric tie-breaker)
 */
export function compareWeeklyCandidates(
  a: { segundas_percentage: number; total_segundas: number; total_pzas: number; machine_id: string },
  b: { segundas_percentage: number; total_segundas: number; total_pzas: number; machine_id: string }
): number {
  const pctDiff = b.segundas_percentage - a.segundas_percentage;
  if (Math.abs(pctDiff) > 0.0001) return pctDiff;

  const segDiff = b.total_segundas - a.total_segundas;
  if (segDiff !== 0) return segDiff;

  const pzasDiff = b.total_pzas - a.total_pzas;
  if (pzasDiff !== 0) return pzasDiff;

  return a.machine_id.localeCompare(b.machine_id);
}
