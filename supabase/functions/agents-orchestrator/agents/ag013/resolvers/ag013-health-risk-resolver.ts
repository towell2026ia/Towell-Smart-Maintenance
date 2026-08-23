// supabase/functions/agents-orchestrator/agents/ag013/resolvers/ag013-health-risk-resolver.ts
// M-011 Health and Risk Read-Only Context Resolver for AG-013 (v1.0)
// Frozen under Token: AG013-BAD-ACTOR-ENGINE-001

import type { M011HealthContextRaw } from '../types/ag013.types.ts';

export class AG013HealthRiskResolver {
  public static resolve(raw?: M011HealthContextRaw | null): {
    health_score: number | null;
    risk_score: number | null;
    is_available: boolean;
  } {
    if (!raw) {
      return { health_score: null, risk_score: null, is_available: false };
    }

    return {
      health_score: typeof raw.health_score === 'number' ? raw.health_score : null,
      risk_score: typeof raw.risk_score === 'number' ? raw.risk_score : null,
      is_available: typeof raw.health_score === 'number' || typeof raw.risk_score === 'number'
    };
  }
}
