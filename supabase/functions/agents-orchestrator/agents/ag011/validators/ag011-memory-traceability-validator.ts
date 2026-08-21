// supabase/functions/agents-orchestrator/agents/ag011/validators/ag011-memory-traceability-validator.ts
// Memory Traceability Validator for AG-011 (v1.0)
// Frozen under Token: AG011-EVIDENCE-RESOLVER-001
// Invariant: 100% Lineage from Memory -> Evidence -> Source (§137-139 PRD-AG-011.2)

import type { AG011TechnicalMemoryItem } from '../types/ag011.types.ts';

export class AG011MemoryTraceabilityValidator {
  public static assertFullTraceability(memory: AG011TechnicalMemoryItem): void {
    if (!memory.evidence || memory.evidence.length === 0) {
      throw new Error(`[AG011_MISSING_TRACEABILITY] Memoria '${memory.memory_id}' no tiene evidencias vinculadas.`);
    }

    for (const ev of memory.evidence) {
      if (!ev.evidence_id || !ev.source_id || !ev.source_type) {
        throw new Error(`[AG011_BROKEN_LINEAGE] Evidencia '${ev.evidence_id || 'UNKNOWN'}' en memoria '${memory.memory_id}' carece de procedencia completa.`);
      }
    }
  }
}
