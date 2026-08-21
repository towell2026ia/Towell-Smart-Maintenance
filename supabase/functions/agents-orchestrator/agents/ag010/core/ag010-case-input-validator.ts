// supabase/functions/agents-orchestrator/agents/ag010/core/ag010-case-input-validator.ts
// Input Validator for AG-010 Case Scope (v1.0)
// Frozen under Token: AG010-CASE-RESOLVER-RULES-001
// Invariant: User problem statement is treated as UNTRUSTED_SOURCE_TEXT (§11-16 PRD-AG-010.2)

import type { AG010CaseScope } from '../contracts/ag010-case.contract.ts';

export class AG010CaseInputValidationError extends Error {
  constructor(message: string) {
    super(`[AG010_CASE_INPUT_VALIDATION_ERROR] ${message}`);
    this.name = 'AG010CaseInputValidationError';
  }
}

export class AG010CaseInputValidator {
  public static validate(input: any): AG010CaseScope {
    if (!input || typeof input !== 'object') {
      throw new AG010CaseInputValidationError('Case input payload must be an object.');
    }

    if (!input.asset_id || typeof input.asset_id !== 'string') {
      throw new AG010CaseInputValidationError("Missing required string field 'asset_id'.");
    }

    const evaluationAt = input.evaluation_at || new Date().toISOString();
    const problemDescription = input.problem_description || input.problem_statement || 'Falla no especificada';
    const failureTitle = input.failure_title || problemDescription.slice(0, 80);

    return {
      case_id: input.case_id || '',
      asset_id: input.asset_id,
      failure_title: failureTitle,
      problem_description: problemDescription,
      evaluation_at: evaluationAt,
      source_trigger: input.source_trigger || 'WORK_ORDER',
      source_entity_id: input.source_entity_id || null
    };
  }
}
