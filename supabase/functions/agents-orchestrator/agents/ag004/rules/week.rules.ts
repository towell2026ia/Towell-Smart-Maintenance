// supabase/functions/agents-orchestrator/agents/ag004/rules/week.rules.ts
// Manifest: AG004-WEEK-RULES-001

export const WEEK_RULES_VERSION = 'AG004-WEEK-RULES-001';

export const OPERATING_DAY_NAMES: readonly ('LUNES' | 'MARTES' | 'MIERCOLES' | 'JUEVES' | 'VIERNES' | 'SABADO')[] = [
  'LUNES',
  'MARTES',
  'MIERCOLES',
  'JUEVES',
  'VIERNES',
  'SABADO'
];

export const DAYS_IN_OPERATING_WEEK = 6;
