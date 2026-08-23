// supabase/functions/agents-orchestrator/agents/ag013/resolvers/ag013-failure-intelligence-resolver.ts
// AG-008 Failure Intelligence Read-Only Context Resolver for AG-013 (v1.0)
// Frozen under Token: AG013-BAD-ACTOR-ENGINE-001

import type { AG008FailureContextRaw } from '../types/ag013.types.ts';

export class AG013FailureIntelligenceResolver {
  public static resolve(raw?: AG008FailureContextRaw | null): {
    failure_count_window: number;
    recurrence_rate: number;
    reincidence_count_30d: number;
    downtime_hours: number;
    mtbf_hours: number | null;
    mttr_hours: number | null;
    trend: 'INCREASING' | 'STABLE' | 'DECREASING';
    is_available: boolean;
  } {
    if (!raw) {
      return {
        failure_count_window: 0,
        recurrence_rate: 0.0,
        reincidence_count_30d: 0,
        downtime_hours: 0,
        mtbf_hours: null,
        mttr_hours: null,
        trend: 'STABLE',
        is_available: false
      };
    }

    return {
      failure_count_window: Number(raw.failure_count_window || 0),
      recurrence_rate: Number(raw.recurrence_rate || 0.0),
      reincidence_count_30d: Number(raw.reincidence_count_30d || 0),
      downtime_hours: Number(raw.downtime_hours || 0),
      mtbf_hours: typeof raw.mtbf_hours === 'number' ? raw.mtbf_hours : null,
      mttr_hours: typeof raw.mttr_hours === 'number' ? raw.mttr_hours : null,
      trend: raw.trend || 'STABLE',
      is_available: true
    };
  }
}
