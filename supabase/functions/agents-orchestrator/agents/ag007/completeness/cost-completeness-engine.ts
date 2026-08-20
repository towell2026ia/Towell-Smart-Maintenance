// supabase/functions/agents-orchestrator/agents/ag007/completeness/cost-completeness-engine.ts
// Cost Completeness Engine for AG-007 (v1.0)
// Frozen under Token: AG007-DETERMINISTIC-ENGINE-001
// Invariant: Never present partial cost as complete (§66-71 PRD)

import type { CostCompleteness, CostOrigin } from '../types/ag007.types.ts';

export interface DomainCompletenessState {
  domain: CostOrigin;
  status: 'COMPLETE' | 'PARTIAL' | 'NOT_AVAILABLE';
  knownAmount: number;
  unknownCount: number;
}

export function evaluateCostCompleteness(domains: DomainCompletenessState[]): {
  overallCompleteness: CostCompleteness;
  completenessByDomain: Record<CostOrigin, string>;
  isPartial: boolean;
} {
  const byDomain: Record<CostOrigin, string> = {
    PART: 'COMPLETE',
    LABOR: 'NOT_AVAILABLE',
    DOWNTIME: 'NOT_AVAILABLE',
    SERVICE: 'COMPLETE',
    OTHER: 'COMPLETE'
  };

  let hasUnknowns = false;

  for (const d of domains) {
    byDomain[d.domain] = d.status;
    if (d.status === 'PARTIAL' || d.status === 'NOT_AVAILABLE' || d.unknownCount > 0) {
      hasUnknowns = true;
    }
  }

  const overallCompleteness: CostCompleteness = hasUnknowns ? 'PARTIAL_COST_TOTAL' : 'COMPLETE';

  return {
    overallCompleteness,
    completenessByDomain: byDomain,
    isPartial: hasUnknowns
  };
}
