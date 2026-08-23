// supabase/functions/agents-orchestrator/agents/ag013/resolvers/ag013-technical-memory-resolver.ts
// AG-011 Technical Memory Read-Only Resolver for AG-013 (v1.0)
// Frozen under Token: AG013-BAD-ACTOR-ENGINE-001

import type { AG011MemoryContextRaw } from '../types/ag013.types.ts';

export class AG013TechnicalMemoryResolver {
  public static resolve(raw?: AG011MemoryContextRaw | null): {
    has_approved_memory: boolean;
    repeated_unsuccessful_interventions_count: number;
  } {
    if (!raw) {
      return { has_approved_memory: false, repeated_unsuccessful_interventions_count: 0 };
    }
    return {
      has_approved_memory: Boolean(raw.has_approved_memory),
      repeated_unsuccessful_interventions_count: Number(raw.repeated_unsuccessful_interventions_count || 0)
    };
  }
}
