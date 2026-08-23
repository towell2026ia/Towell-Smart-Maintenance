// supabase/functions/agents-orchestrator/agents/ag013/validators/ag013-traceability-validator.ts
// Traceability Validator for AG-013 Analista de Malos Actores v1.0
// Frozen under Token: AG013-BAD-ACTOR-ENGINE-001

import type { AssetBadActorResult } from '../types/ag013.types.ts';

export class AG013TraceabilityValidator {
  public static validate(results: AssetBadActorResult[]): boolean {
    for (const r of results) {
      if (!Array.isArray(r.facts) || r.facts.length === 0) {
        return false;
      }
      for (const f of r.facts) {
        if (!f.fact_id || !f.source_authority || !f.source_id || !f.timestamp_source) {
          return false;
        }
      }
    }
    return true;
  }
}
