// supabase/functions/agents-orchestrator/agents/ag004/rules/week.rules.ts
// Manifest: AG004-WEEK-RULES-002 (PRD-AG004-R1 Mon-Fri Rule)

export const WEEK_RULES_VERSION = 'AG004-WEEK-RULES-002';

export const OPERATING_DAY_NAMES: readonly ('LUNES' | 'MARTES' | 'MIERCOLES' | 'JUEVES' | 'VIERNES')[] = [
  'LUNES',
  'MARTES',
  'MIERCOLES',
  'JUEVES',
  'VIERNES'
];

export const DAYS_IN_OPERATING_WEEK = 5;
export const MAX_WEEKLY_AUTONOMOUS_CAPACITY = 15;

