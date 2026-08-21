// supabase/functions/agents-orchestrator/agents/ag011/freshness/ag011-memory-freshness-engine.ts
// Freshness & Stale Detection Engine for AG-011 (v1.0)
// Frozen under Token: AG011-FRESHNESS-ENGINE-001
// Invariant: Non-Arbitrary Freshness & Engineering Change Detection (§109-114 PRD-AG-011.2)

import type { AG011TechnicalMemoryItem } from '../types/ag011.types.ts';

export interface FreshnessEvaluation {
  isFresh: boolean;
  isStale: boolean;
  staleReason?: string;
}

export class AG011MemoryFreshnessEngine {
  public static evaluateFreshness(params: {
    memory: AG011TechnicalMemoryItem;
    current_asset_model?: string | null;
    current_component_id?: string | null;
    has_post_intervention_recurrence_30d?: boolean;
  }): FreshnessEvaluation {
    const mem = params.memory;

    // 1. Model Mismatch after physical machine modification
    if (mem.scope.machine_model && params.current_asset_model && mem.scope.machine_model !== params.current_asset_model) {
      return {
        isFresh: false,
        isStale: true,
        staleReason: `Cambio de modelo de máquina: memoria para '${mem.scope.machine_model}', activo actual es '${params.current_asset_model}'.`
      };
    }

    // 2. Post-intervention recurrence in < 30 days
    if (params.has_post_intervention_recurrence_30d) {
      return {
        isFresh: false,
        isStale: true,
        staleReason: 'Se registró reincidencia de falla en < 30 días tras aplicar el procedimiento.'
      };
    }

    return {
      isFresh: true,
      isStale: false
    };
  }
}
