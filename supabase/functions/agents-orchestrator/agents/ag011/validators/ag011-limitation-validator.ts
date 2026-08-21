// supabase/functions/agents-orchestrator/agents/ag011/validators/ag011-limitation-validator.ts
// Semantic Limitation Validator for AG-011 (v1.0)
// Frozen under Token: AG011-SEMANTIC-RULES-001
// Invariant: semantic_limitation_removal = 0 (§43, 95-96 PRD-AG-011.3)

import type { AG011SemanticInput } from '../contracts/ag011-semantic-input.contract.ts';
import type { AG011SemanticOutput } from '../contracts/ag011-semantic-output.contract.ts';

export class AG011LimitationValidator {
  public static validateLimitationPreservation(
    semanticOutput: AG011SemanticOutput,
    semanticInput: AG011SemanticInput
  ): void {
    const inputLimitations = new Set<string>();
    for (const mem of semanticInput.memories) {
      for (const lim of mem.limitations || []) {
        inputLimitations.add(lim.toLowerCase().trim());
      }
    }

    if (inputLimitations.size > 0 && (!semanticOutput.limitations_summary || semanticOutput.limitations_summary.length === 0)) {
      throw new Error('[AG011_LIMITATION_REMOVAL] El input contiene limitaciones técnicas que fueron suprimidas de limitations_summary.');
    }
  }
}
