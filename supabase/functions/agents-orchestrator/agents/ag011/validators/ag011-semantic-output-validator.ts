// supabase/functions/agents-orchestrator/agents/ag011/validators/ag011-semantic-output-validator.ts
// Master Semantic Output Validator for AG-011 (v1.0)
// Frozen under Token: AG011-SEMANTIC-RULES-001
// Invariant: Full Semantic Pipeline Validation (§99-100 PRD-AG-011.3)

import { AG011MemoryReferenceValidator } from './ag011-memory-reference-validator.ts';
import { AG011SemanticScopeValidator } from './ag011-semantic-scope-validator.ts';
import { AG011SemanticApprovalValidator } from './ag011-semantic-approval-validator.ts';
import { AG011LimitationValidator } from './ag011-limitation-validator.ts';
import { AG011SemanticTraceabilityValidator } from './ag011-semantic-traceability-validator.ts';
import type { AG011SemanticInput } from '../contracts/ag011-semantic-input.contract.ts';
import type { AG011SemanticOutput } from '../contracts/ag011-semantic-output.contract.ts';

export class AG011SemanticOutputValidator {
  public static validate(
    semanticOutput: AG011SemanticOutput,
    semanticInput: AG011SemanticInput
  ): void {
    if (!semanticOutput || typeof semanticOutput !== 'object') {
      throw new Error('[AG011SemanticOutputValidator] Salida semántica no es un objeto válido.');
    }

    if (!semanticOutput.technical_summary || semanticOutput.technical_summary.length < 10) {
      throw new Error('[AG011SemanticOutputValidator] technical_summary no cumple con longitud mínima.');
    }

    // 1. Reference Validation
    AG011MemoryReferenceValidator.validateReferences(semanticOutput, semanticInput);

    // 2. Scope Validation
    AG011SemanticScopeValidator.validateScopePreservation(semanticOutput, semanticInput);

    // 3. Approval Validation
    AG011SemanticApprovalValidator.validateNoApproval(semanticOutput);

    // 4. Limitation Validation
    AG011LimitationValidator.validateLimitationPreservation(semanticOutput, semanticInput);

    // 5. Traceability Validation
    AG011SemanticTraceabilityValidator.validateClaimTraceability(semanticOutput);
  }
}
