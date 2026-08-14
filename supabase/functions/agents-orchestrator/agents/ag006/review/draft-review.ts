// supabase/functions/agents-orchestrator/agents/ag006/review/draft-review.ts
// Draft Review Workflow Controller for AG-006.3 (FORM-REVIEW-001)

import type { FormDefinitionContract } from '../form-definition/form-definition.types.ts';
import type { ReviewState } from './review.types.ts';
import { validateFormDefinitionContract } from '../form-definition/form-definition-validator.ts';
import { ReviewAuditLogger } from './review-audit.ts';

export interface DraftReviewStateResult {
  status: ReviewState;
  draft_revision: number;
  form_code: string;
  form_name: string;
  is_valid: boolean;
  validation_errors: string[];
  ready_for_semantic_phase: boolean;
  persisted_to_production: false;
}

export function transitionDraftToInReview(
  contract: FormDefinitionContract,
  userId: string = 'reviewer_user',
  auditLogger?: ReviewAuditLogger
): DraftReviewStateResult {
  const valResult = validateFormDefinitionContract(contract);
  const errors = valResult.findings.filter(f => f.severity === 'CRITICAL' || f.severity === 'ERROR').map(f => f.message);

  const draftId = (contract.metadata as any)?.draft_id || `DRAFT_${contract.form.code}`;
  const revision = (contract.metadata as any)?.revision_number || 1;

  if (!valResult.isValid) {
    return {
      status: 'DRAFT',
      draft_revision: revision,
      form_code: contract.form.code,
      form_name: contract.form.name,
      is_valid: false,
      validation_errors: errors,
      ready_for_semantic_phase: false,
      persisted_to_production: false
    };
  }

  contract.status = 'IN_REVIEW';

  auditLogger?.logAction(draftId, revision, userId, 'DRAFT_SENT_TO_REVIEW', {
    new_value: `Borrador '${contract.form.code}' promovido a IN_REVIEW.`
  });

  return {
    status: 'IN_REVIEW',
    draft_revision: revision,
    form_code: contract.form.code,
    form_name: contract.form.name,
    is_valid: true,
    validation_errors: [],
    ready_for_semantic_phase: true,
    persisted_to_production: false
  };
}
