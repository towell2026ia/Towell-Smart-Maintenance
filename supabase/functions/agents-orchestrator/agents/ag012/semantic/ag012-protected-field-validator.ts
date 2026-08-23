// supabase/functions/agents-orchestrator/agents/ag012/semantic/ag012-protected-field-validator.ts
// Protected Field Validator enforcing protected_field_diff = 0 (v1.0)
// Frozen under Token: AG012-SEMANTIC-LAYER-001

import type { AG012SemanticOutput } from '../contracts/ag012-semantic-output.contract.ts';
import type { AG012SemanticInputPayload } from '../contracts/ag012-semantic-input.contract.ts';

export class AG012ProtectedFieldValidator {
  public static validate(output: AG012SemanticOutput, input: AG012SemanticInputPayload): void {
    if (output.recommendation_echo !== input.deterministic_recommendation) {
      throw new Error(
        `[AG012_PROTECTED_FIELD_VIOLATION] MiMo intentó alterar la recomendación determinística oficial (${input.deterministic_recommendation} -> ${output.recommendation_echo}).`
      );
    }
  }
}
