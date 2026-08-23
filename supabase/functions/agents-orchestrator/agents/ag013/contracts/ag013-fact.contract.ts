// supabase/functions/agents-orchestrator/agents/ag013/contracts/ag013-fact.contract.ts
// Normalized Bad Actor Fact Contract (AG013-FACT-001)
// Frozen under Token: AG013-DATA-MAP-001

import type { BadActorFact } from '../types/ag013.types.ts';

export const AG013FactContract = {
  version: '1.0',
  contract_token: 'AG013-FACT-001',
  dimensions: [
    'CHRONICITY',
    'FAILURE_BURDEN',
    'ECONOMIC_BURDEN',
    'HEALTH_RISK',
    'INTERVENTION_EFFECTIVENESS'
  ] as const,
  validate(fact: BadActorFact): boolean {
    return (
      typeof fact.fact_id === 'string' &&
      typeof fact.asset_id === 'string' &&
      this.dimensions.includes(fact.dimension as any) &&
      typeof fact.source_authority === 'string' &&
      typeof fact.normalized_score === 'number' &&
      fact.normalized_score >= 0 &&
      fact.normalized_score <= 100 &&
      typeof fact.weight_applied === 'number' &&
      typeof fact.timestamp_source === 'string'
    );
  }
};
