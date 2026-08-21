// supabase/functions/agents-orchestrator/agents/ag010/validators/ag010-fact-hypothesis-validator.ts
// Fact vs Hypothesis Validator for AG-010 MiMo Output (v1.0)
// Frozen under Token: AG010-SEMANTIC-RULES-001
// Invariant: FACT answers must have supporting certified evidence IDs (§87-88 PRD-AG-010.3)

import type { FiveWhyNode } from '../types/ag010.types.ts';

export class AG010FactHypothesisValidationError extends Error {
  constructor(message: string) {
    super(`[AG010_FACT_HYPOTHESIS_VALIDATION_ERROR] ${message}`);
    this.name = 'AG010FactHypothesisValidationError';
  }
}

export class AG010FactHypothesisValidator {
  public static validateFiveWhysNodes(nodes: FiveWhyNode[]): void {
    for (const node of nodes) {
      if (node.answer_type === 'FACT') {
        if (!node.supporting_evidence_ids || node.supporting_evidence_ids.length === 0) {
          throw new AG010FactHypothesisValidationError(
            `Five Whys node at level ${node.level} is marked as 'FACT' but has 0 supporting evidence IDs.`
          );
        }
      }
    }
  }
}
