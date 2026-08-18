// supabase/functions/agents-orchestrator/agents/ag004/rules/coverage.rules.ts
// Manifest: AG004-COVERAGE-RULES-001

export const COVERAGE_RULES_VERSION = 'AG004-COVERAGE-RULES-001';

export const COVERAGE_POLICY = 'ALL_ACTIVE_MACHINES_WEEKLY';

// Tie-break / deterministic sorting hierarchy
export const CRITICALITY_WEIGHTS: Record<string, number> = {
  'MUY_ALTA': 4,
  'ALTA': 3,
  'MEDIA': 2,
  'BAJA': 1
};
