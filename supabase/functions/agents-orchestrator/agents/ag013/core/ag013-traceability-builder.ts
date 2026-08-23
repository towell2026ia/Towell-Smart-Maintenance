// supabase/functions/agents-orchestrator/agents/ag013/core/ag013-traceability-builder.ts
// Traceability Builder for AG-013 Analista de Malos Actores v1.0
// Frozen under Token: AG013-BAD-ACTOR-ENGINE-001

import type { BadActorFact } from '../types/ag013.types.ts';

export class AG013TraceabilityBuilder {
  public static build(facts: BadActorFact[], modelSha: string): {
    all_facts_traceable: boolean;
    certified_sources_used: string[];
    decision_model_sha256: string;
  } {
    const sources = Array.from(new Set(facts.map(f => f.source_authority)));
    const allTraceable = facts.every(f => f.source_authority && f.source_id && f.timestamp_source);

    return {
      all_facts_traceable: allTraceable,
      certified_sources_used: sources,
      decision_model_sha256: modelSha
    };
  }
}
