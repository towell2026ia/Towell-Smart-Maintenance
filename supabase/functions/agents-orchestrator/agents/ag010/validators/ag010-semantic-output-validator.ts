// supabase/functions/agents-orchestrator/agents/ag010/validators/ag010-semantic-output-validator.ts
// Semantic Output Validator for AG-010 MiMo Layer (v1.0)
// Frozen under Token: AG010-SEMANTIC-RULES-001
// Invariant: Schema compliance, reference checks, action verb constraints (§83-84 PRD-AG-010.3)

import type { AG010SemanticOutput } from '../contracts/ag010-semantic-output.contract.ts';
import type { AG010EvidencePackage } from '../types/ag010.types.ts';
import { PROHIBITED_ACTION_VERBS } from '../contracts/ag010-output.contract.ts';

export class AG010SemanticOutputValidationError extends Error {
  constructor(message: string) {
    super(`[AG010_SEMANTIC_OUTPUT_VALIDATION_ERROR] ${message}`);
    this.name = 'AG010SemanticOutputValidationError';
  }
}

export class AG010SemanticOutputValidator {
  public static validate(
    semanticOutput: AG010SemanticOutput,
    inputEvidencePackage: AG010EvidencePackage
  ): void {
    if (!semanticOutput || typeof semanticOutput !== 'object') {
      throw new AG010SemanticOutputValidationError('Semantic output must be a valid JSON object.');
    }

    if (typeof semanticOutput.problem_summary !== 'string') {
      throw new AG010SemanticOutputValidationError("Missing string field 'problem_summary'.");
    }

    if (!Array.isArray(semanticOutput.five_whys)) {
      throw new AG010SemanticOutputValidationError("Field 'five_whys' must be an array.");
    }

    if (semanticOutput.five_whys.length > 5) {
      throw new AG010SemanticOutputValidationError('Five Whys chain exceeds maximum depth of 5 levels.');
    }

    if (!Array.isArray(semanticOutput.root_cause_candidates)) {
      throw new AG010SemanticOutputValidationError("Field 'root_cause_candidates' must be an array.");
    }

    // 1. Evidence Reference Validity: verify all referenced evidence IDs exist in input package
    const validEvidenceIds = new Set([
      ...inputEvidencePackage.certified_facts.map(f => f.evidence_id),
      ...inputEvidencePackage.operator_statements.map(s => s.evidence_id),
      ...inputEvidencePackage.previous_cases.map(m => m.previous_case.previous_case_id),
      ...inputEvidencePackage.previous_cases.flatMap(m => (m.previous_case.evidence_items || []).map((e: any) => e.evidence_id))
    ]);

    for (const why of semanticOutput.five_whys) {
      if (Array.isArray(why.supporting_evidence_ids)) {
        for (const evId of why.supporting_evidence_ids) {
          if (!validEvidenceIds.has(evId)) {
            throw new AG010SemanticOutputValidationError(
              `[AG010_UNKNOWN_EVIDENCE_REFERENCE] Five Whys node at level ${why.level} references unknown evidence ID '${evId}'.`
            );
          }
        }
      }
    }

    for (const cand of semanticOutput.root_cause_candidates) {
      if (Array.isArray(cand.supporting_evidence_ids)) {
        for (const evId of cand.supporting_evidence_ids) {
          if (!validEvidenceIds.has(evId)) {
            throw new AG010SemanticOutputValidationError(
              `[AG010_UNKNOWN_EVIDENCE_REFERENCE] Root cause candidate '${cand.candidate_id}' references unknown evidence ID '${evId}'.`
            );
          }
        }
      }
    }

    // 2. Previous Case Reference Validity: verify all referenced previous cases exist in top-5 input
    const validPrevCaseIds = new Set(
      inputEvidencePackage.previous_cases.map(m => m.previous_case.previous_case_id)
    );

    if (Array.isArray(semanticOutput.previous_case_interpretation)) {
      for (const interp of semanticOutput.previous_case_interpretation) {
        const pId = interp.previous_case_id;
        if ((pId === 'N/A' || pId === 'NONE' || pId === 'NINGUNO' || !pId) && validPrevCaseIds.size === 0) {
          continue;
        }
        if (!validPrevCaseIds.has(pId)) {
          throw new AG010SemanticOutputValidationError(
            `[AG010_UNKNOWN_PREVIOUS_CASE_REFERENCE] Interpretation references unknown previous case ID '${pId}'.`
          );
        }
      }
    }

    // 3. Prohibited Action Verbs in Recommended Verifications
    if (Array.isArray(semanticOutput.recommended_verifications)) {
      for (const rec of semanticOutput.recommended_verifications) {
        const upperInst = (rec.instruction || '').toUpperCase();
        for (const verb of PROHIBITED_ACTION_VERBS) {
          if (upperInst.includes(verb)) {
            throw new AG010SemanticOutputValidationError(
              `Prohibited action verb '${verb}' detected in recommended verification instruction.`
            );
          }
        }
      }
    }
  }
}
