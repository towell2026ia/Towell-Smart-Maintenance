// supabase/functions/agents-orchestrator/agents/ag012/semantic/ag012-semantic-reference-validator.ts
// Semantic Reference Validator verifying cited facts exist in input snapshot (v1.0)
// Frozen under Token: AG012-SEMANTIC-LAYER-001

import type { AG012SemanticOutput } from '../contracts/ag012-semantic-output.contract.ts';
import type { AG012SemanticInputPayload } from '../contracts/ag012-semantic-input.contract.ts';

export class AG012SemanticReferenceValidator {
  public static validate(output: AG012SemanticOutput, input: AG012SemanticInputPayload): void {
    const validFactIds = new Set(input.decision_facts.map(f => f.factor_id));

    for (const citedId of output.cited_fact_ids) {
      if (!validFactIds.has(citedId)) {
        throw new Error(`[AG012_REFERENCE_ERROR] MiMo citó un factor inexistente en el snapshot determinístico: ${citedId}`);
      }
    }
  }
}
