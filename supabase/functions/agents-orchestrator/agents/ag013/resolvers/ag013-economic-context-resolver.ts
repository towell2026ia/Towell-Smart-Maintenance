// supabase/functions/agents-orchestrator/agents/ag013/resolvers/ag013-economic-context-resolver.ts
// AG-007 Economic Context Read-Only Resolver for AG-013 (v1.0)
// Frozen under Token: AG013-BAD-ACTOR-ENGINE-001

import type { AG007EconomicContextRaw } from '../types/ag013.types.ts';

export class AG013EconomicContextResolver {
  public static resolve(raw?: AG007EconomicContextRaw | null): {
    maintenance_cost_window: number | null;
    budget_window: number | null;
    budget_variance: number | null;
    estimated_replacement_cost: number | null;
    mci: number | null;
    currency: string;
    is_available: boolean;
  } {
    if (!raw || typeof raw.maintenance_cost_window !== 'number') {
      return {
        maintenance_cost_window: null,
        budget_window: null,
        budget_variance: null,
        estimated_replacement_cost: null,
        mci: null,
        currency: 'MXN',
        is_available: false
      };
    }

    return {
      maintenance_cost_window: Number(raw.maintenance_cost_window),
      budget_window: typeof raw.budget_window === 'number' ? raw.budget_window : null,
      budget_variance: typeof raw.budget_variance === 'number' ? raw.budget_variance : null,
      estimated_replacement_cost: typeof raw.estimated_replacement_cost === 'number' ? raw.estimated_replacement_cost : null,
      mci: typeof raw.mci === 'number' ? raw.mci : null,
      currency: raw.currency || 'MXN',
      is_available: true
    };
  }
}
