// supabase/functions/agents-orchestrator/modules/m012/resolvers/m012-asset360-resolver.ts
// Asset360 Context Resolver for M-012 (v1.0)
// Frozen under Token: M012-DATA-MAP-001
// Invariant: Read-only consumption of M-010 context without duplicating storage (§20-21 PRD-M-012.2)

import { M012TemporalGuard } from '../guards/m012-temporal-guard.ts';

export interface M010ResolvedContext {
  summary: string;
  previous_interventions_count: number;
  last_intervention_date?: string | null;
  recent_failures_count: number;
}

export class M012Asset360Resolver {
  public static resolve(assetId: string, m010Context?: any, evaluationAt?: string): M010ResolvedContext {
    if (!m010Context) {
      return {
        summary: `Contexto M-010 no disponible para activo ${assetId}`,
        previous_interventions_count: 0,
        last_intervention_date: null,
        recent_failures_count: 0
      };
    }

    const cutoff = evaluationAt || new Date().toISOString();
    const interventions = Array.isArray(m010Context.interventions)
      ? M012TemporalGuard.filterRecordsByCutoff(m010Context.interventions, cutoff)
      : [];

    const failures = Array.isArray(m010Context.failures)
      ? M012TemporalGuard.filterRecordsByCutoff(m010Context.failures, cutoff)
      : [];

    return {
      summary: m010Context.summary || `${interventions.length} intervenciones registradas en el expediente del activo.`,
      previous_interventions_count: interventions.length,
      last_intervention_date: interventions[0]?.created_at || null,
      recent_failures_count: failures.length
    };
  }
}
