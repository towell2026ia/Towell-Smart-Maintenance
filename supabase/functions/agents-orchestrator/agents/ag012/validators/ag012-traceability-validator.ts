// supabase/functions/agents-orchestrator/agents/ag012/validators/ag012-traceability-validator.ts
// Traceability Validator verifying 100% factor & decision lineage for AG-012 (v1.0)
// Frozen under Token: AG012-TRACEABILITY-RULES-001

import type { InterventionRecommendationPackage } from '../types/ag012.types.ts';

export class AG012TraceabilityValidator {
  public static validate(pkg: InterventionRecommendationPackage): void {
    if (!pkg.traceability || !pkg.traceability.all_facts_traceable) {
      throw new Error('[AG012_TRACEABILITY_ERROR] Paquete de recomendación sin trazabilidad 100% garantizada.');
    }

    if (!pkg.traceability.data_map_token || pkg.traceability.data_map_token !== 'AG012-DATA-MAP-001') {
      throw new Error('[AG012_TRACEABILITY_ERROR] Token de arquitectura no coincide con AG012-DATA-MAP-001.');
    }

    for (const fact of pkg.decision_facts) {
      if (!fact.factor_id || !fact.category || !fact.source_agent || !fact.source_reference || !fact.timestamp) {
        throw new Error(`[AG012_TRACEABILITY_ERROR] Hecho de decisión ${fact.factor_id || 'UNKNOWN'} incompleto en metadatos de linaje.`);
      }
    }
  }
}
