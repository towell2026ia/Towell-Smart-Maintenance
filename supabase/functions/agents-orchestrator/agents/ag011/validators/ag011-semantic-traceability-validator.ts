// supabase/functions/agents-orchestrator/agents/ag011/validators/ag011-semantic-traceability-validator.ts
// Material Claim Traceability Validator for AG-011 (v1.0)
// Frozen under Token: AG011-SEMANTIC-RULES-001
// Invariant: material_claim_traceability = 100% (§26-32, 97-98 PRD-AG-011.3)

import type { AG011SemanticOutput } from '../contracts/ag011-semantic-output.contract.ts';

export class AG011SemanticTraceabilityValidator {
  public static validateClaimTraceability(semanticOutput: AG011SemanticOutput): void {
    // 1. Every applicable memory item must have rationale
    for (const app of semanticOutput.applicable_memories || []) {
      if (!app.applicability_rationale || app.applicability_rationale.length < 5) {
        throw new Error(`[AG011_MISSING_CLAIM_LINEAGE] Memoria '${app.memory_id}' carece de justificación técnica.`);
      }
    }

    // 2. Every reusable lesson must reference at least one memory_id
    for (const lesson of semanticOutput.reusable_lessons || []) {
      if (!lesson.referenced_memory_ids || lesson.referenced_memory_ids.length === 0) {
        throw new Error(`[AG011_MISSING_CLAIM_LINEAGE] Lección '${lesson.lesson_id}' carece de vínculos de procedencia a memorias de origen.`);
      }
    }
  }
}
