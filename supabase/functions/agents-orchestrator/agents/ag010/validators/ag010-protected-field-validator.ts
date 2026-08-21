// supabase/functions/agents-orchestrator/agents/ag010/validators/ag010-protected-field-validator.ts
// Protected Field Validator for AG-010 (v1.0)
// Frozen under Token: AG010-SEMANTIC-RULES-001
// Invariant: protected_field_diff = 0; Deterministic fields cannot be altered (§16-18, 85-86 PRD-AG-010.3)

import type { AG010EvidencePackage, AG010Output } from '../types/ag010.types.ts';

export class AG010ProtectedFieldViolationError extends Error {
  constructor(message: string) {
    super(`[AG010_PROTECTED_FIELD_VIOLATION] ${message}`);
    this.name = 'AG010ProtectedFieldViolationError';
  }
}

export class AG010ProtectedFieldValidator {
  public static assertProtectedFieldsUntouched(
    beforePackage: AG010EvidencePackage,
    afterOutput: AG010Output
  ): void {
    if (beforePackage.case_id !== afterOutput.case_id) {
      throw new AG010ProtectedFieldViolationError(
        `case_id modified: '${beforePackage.case_id}' vs '${afterOutput.case_id}'`
      );
    }

    if (beforePackage.asset_id !== afterOutput.asset_id) {
      throw new AG010ProtectedFieldViolationError(
        `asset_id modified: '${beforePackage.asset_id}' vs '${afterOutput.asset_id}'`
      );
    }

    if (beforePackage.evaluation_at !== afterOutput.evaluation_at) {
      throw new AG010ProtectedFieldViolationError(
        `evaluation_at modified: '${beforePackage.evaluation_at}' vs '${afterOutput.evaluation_at}'`
      );
    }

    // Check facts count and identities
    if (beforePackage.certified_facts.length !== afterOutput.facts.length) {
      throw new AG010ProtectedFieldViolationError(
        `Facts count altered: ${beforePackage.certified_facts.length} vs ${afterOutput.facts.length}`
      );
    }

    // Check previous cases count and scores
    if (beforePackage.previous_cases.length !== afterOutput.previous_cases.length) {
      throw new AG010ProtectedFieldViolationError(
        `Previous cases count altered: ${beforePackage.previous_cases.length} vs ${afterOutput.previous_cases.length}`
      );
    }

    for (let i = 0; i < beforePackage.previous_cases.length; i++) {
      const orig = beforePackage.previous_cases[i];
      const merged = afterOutput.previous_cases[i];

      if (orig.previous_case.previous_case_id !== merged.previous_case.previous_case_id) {
        throw new AG010ProtectedFieldViolationError(
          `Previous case order/identity altered at index ${i}: '${orig.previous_case.previous_case_id}' vs '${merged.previous_case.previous_case_id}'`
        );
      }

      if (orig.similarity_score !== merged.similarity_score) {
        throw new AG010ProtectedFieldViolationError(
          `Similarity score altered on '${orig.previous_case.previous_case_id}': ${orig.similarity_score} vs ${merged.similarity_score}`
        );
      }
    }
  }
}
