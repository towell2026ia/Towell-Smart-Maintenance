// supabase/functions/agents-orchestrator/agents/ag013/resolvers/ag013-root-cause-context-resolver.ts
// AG-010 RCA Context Read-Only Resolver for AG-013 (v1.0)
// Frozen under Token: AG013-BAD-ACTOR-ENGINE-001

import type { AG010RCAContextRaw } from '../types/ag013.types.ts';

export class AG013RootCauseContextResolver {
  public static resolve(raw?: AG010RCAContextRaw | null): {
    has_confirmed_rca: boolean;
    root_cause: string | null;
  } {
    if (!raw) {
      return { has_confirmed_rca: false, root_cause: null };
    }
    return {
      has_confirmed_rca: Boolean(raw.has_confirmed_rca),
      root_cause: raw.root_cause || null
    };
  }
}
