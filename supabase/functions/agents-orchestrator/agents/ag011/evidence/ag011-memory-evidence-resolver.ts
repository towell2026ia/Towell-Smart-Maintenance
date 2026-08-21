// supabase/functions/agents-orchestrator/agents/ag011/evidence/ag011-memory-evidence-resolver.ts
// Memory Evidence Resolver for AG-011 (v1.0)
// Frozen under Token: AG011-EVIDENCE-RESOLVER-001
// Invariant: 8 Evidence Classes & 100% Traceability (§35-46 PRD-AG-011.2)

import type { AG011MemoryEvidence, AG011MemoryEvidenceClass } from '../types/ag011.types.ts';

const VALID_EVIDENCE_CLASSES = new Set<AG011MemoryEvidenceClass>([
  'CERTIFIED_FACT',
  'HUMAN_CONFIRMED_CAUSE',
  'VALIDATED_INTERVENTION',
  'DOCUMENTED_OUTCOME',
  'DERIVED_SIGNAL',
  'TECHNICIAN_STATEMENT',
  'OPERATOR_STATEMENT',
  'MODEL_HYPOTHESIS'
]);

export class AG011MemoryEvidenceResolver {
  public static validateAndNormalizeEvidence(items: any[]): AG011MemoryEvidence[] {
    if (!Array.isArray(items)) return [];

    return items.map((item, idx) => {
      if (!item.evidence_id) {
        throw new Error(`[AG011EvidenceResolver] Evidencia #${idx} carece de evidence_id.`);
      }
      if (!item.evidence_class || !VALID_EVIDENCE_CLASSES.has(item.evidence_class)) {
        throw new Error(`[AG011_UNKNOWN_EVIDENCE_CLASS] Clase de evidencia '${item.evidence_class}' no permitida.`);
      }
      if (!item.source_id || !item.source_type) {
        throw new Error(`[AG011EvidenceResolver] Evidencia '${item.evidence_id}' carece de referencia de fuente.`);
      }

      return {
        evidence_id: String(item.evidence_id),
        evidence_class: item.evidence_class,
        source_type: item.source_type,
        source_id: String(item.source_id),
        fact_statement: String(item.fact_statement || item.declaracion_hecho || ''),
        occurred_at: item.occurred_at || item.fecha_evento || new Date().toISOString(),
        source_table: item.source_table || item.tabla_fuente,
        reliability_score: item.reliability_score !== undefined ? Number(item.reliability_score) : 100.0
      };
    });
  }
}
