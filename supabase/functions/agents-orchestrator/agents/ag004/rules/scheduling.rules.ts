// supabase/functions/agents-orchestrator/agents/ag004/rules/scheduling.rules.ts
// Manifest: AG004-SCHEDULING-RULES-001

export const SCHEDULING_RULES_VERSION = 'AG004-SCHEDULING-RULES-001';

export const OPERATING_DAYS_CONFIG = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'] as const;

export const SUNDAY_SCHEDULING_ALLOWED = false;
