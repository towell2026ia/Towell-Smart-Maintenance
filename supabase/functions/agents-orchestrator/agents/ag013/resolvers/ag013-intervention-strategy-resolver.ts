// supabase/functions/agents-orchestrator/agents/ag013/resolvers/ag013-intervention-strategy-resolver.ts
// AG-012 Lifecycle Intervention Strategy Read-Only Resolver for AG-013 (v1.0)
// Frozen under Token: AG013-BAD-ACTOR-ENGINE-001

import type { AG012StrategyContextRaw } from '../types/ag013.types.ts';

export class AG013InterventionStrategyResolver {
  public static resolve(raw?: AG012StrategyContextRaw | null): {
    recommended_strategy: 'REPAIR' | 'RENEW' | 'REPLACE' | 'INSUFFICIENT_DATA' | 'NONE';
    is_available: boolean;
  } {
    if (!raw || !raw.recommended_strategy) {
      return { recommended_strategy: 'NONE', is_available: false };
    }
    return {
      recommended_strategy: raw.recommended_strategy,
      is_available: true
    };
  }
}
