// supabase/functions/agents-orchestrator/agents/ag006/review/draft-editor.ts
// Human Draft Review Editor for AG-006.3 (FORM-REVIEW-001)

import type { FormDefinitionContract, FormFieldDefinition } from '../form-definition/form-definition.types.ts';
import type { DraftEditPayload, DraftRevisionMetadata } from './review.types.ts';
import { validateFormDefinitionContract } from '../form-definition/form-definition-validator.ts';
import { ReviewAuditLogger } from './review-audit.ts';

export interface EditDraftResult {
  isValid: boolean;
  contract: FormDefinitionContract;
  revision: DraftRevisionMetadata;
  validation_errors: string[];
}

/**
 * Applies human edits to a FormDefinitionContract draft safely.
 * Re-runs CONTRACT VALIDATOR and generates a new revision without overwriting prior revision history.
 */
export function applyHumanEditToDraft(
  currentContract: FormDefinitionContract,
  edits: DraftEditPayload[],
  userId: string = 'reviewer_user',
  changeSummary: string = 'Edición manual de campos por revisor',
  auditLogger?: ReviewAuditLogger
): EditDraftResult {
  // Deep clone contract to preserve prior revision
  const newContract: FormDefinitionContract = JSON.parse(JSON.stringify(currentContract));
  
  const currentRevisionNum = (newContract.metadata as any)?.revision_number || 1;
  const newRevisionNum = currentRevisionNum + 1;
  const draftId = (newContract.metadata as any)?.draft_id || `DRAFT_${newContract.form.code}`;

  for (const edit of edits) {
    let fieldFound = false;

    for (const sec of newContract.form.sections || []) {
      for (const f of sec.fields || []) {
        if (f.code === edit.field_code) {
          fieldFound = true;

          if (edit.new_label !== undefined && edit.new_label !== f.label) {
            auditLogger?.logAction(draftId, newRevisionNum, userId, 'FIELD_EDITED', {
              field_code: f.code,
              previous_value: f.label,
              new_value: edit.new_label
            });
            f.label = edit.new_label;
          }

          if (edit.new_field_type !== undefined && edit.new_field_type !== f.field_type) {
            auditLogger?.logAction(draftId, newRevisionNum, userId, 'FIELD_TYPE_CHANGED', {
              field_code: f.code,
              previous_value: f.field_type,
              new_value: edit.new_field_type
            });
            f.field_type = edit.new_field_type;
          }

          if (edit.new_required !== undefined && edit.new_required !== f.required) {
            auditLogger?.logAction(draftId, newRevisionNum, userId, 'FIELD_REQUIRED_CHANGED', {
              field_code: f.code,
              previous_value: f.required,
              new_value: edit.new_required
            });
            f.required = edit.new_required;
          }

          if (edit.new_options !== undefined) {
            auditLogger?.logAction(draftId, newRevisionNum, userId, 'OPTION_CHANGED', {
              field_code: f.code,
              previous_value: f.options,
              new_value: edit.new_options
            });
            f.options = edit.new_options;
          }

          if (edit.new_min !== undefined) f.min = edit.new_min;
          if (edit.new_max !== undefined) f.max = edit.new_max;
          if (edit.new_order !== undefined) f.order = edit.new_order;
        }
      }
    }

    if (!fieldFound) {
      return {
        isValid: false,
        contract: currentContract,
        revision: {
          revision_number: currentRevisionNum,
          parent_revision: null,
          created_at: new Date().toISOString(),
          created_by: userId,
          change_summary: `Error: Campo '${edit.field_code}' no encontrado.`
        },
        validation_errors: [`El campo '${edit.field_code}' no existe en el borrador.`]
      };
    }
  }

  // Re-run Contract Validator
  const valResult = validateFormDefinitionContract(newContract);
  const validationErrors = valResult.findings.filter(f => f.severity === 'CRITICAL' || f.severity === 'ERROR').map(f => f.message);

  if (!valResult.isValid) {
    return {
      isValid: false,
      contract: currentContract,
      revision: {
        revision_number: currentRevisionNum,
        parent_revision: null,
        created_at: new Date().toISOString(),
        created_by: userId,
        change_summary: 'Edición rechazada por validador de contrato.'
      },
      validation_errors: validationErrors
    };
  }

  // Create new revision metadata
  const revisionMeta: DraftRevisionMetadata = {
    revision_number: newRevisionNum,
    parent_revision: currentRevisionNum,
    created_at: new Date().toISOString(),
    created_by: userId,
    change_summary: changeSummary
  };

  newContract.metadata = {
    ...(newContract.metadata || {}),
    draft_id: draftId,
    revision_number: newRevisionNum,
    parent_revision: currentRevisionNum,
    last_edited_by: userId,
    last_edited_at: revisionMeta.created_at
  };

  auditLogger?.logAction(draftId, newRevisionNum, userId, 'DRAFT_VALIDATED', {
    new_value: `Revisión ${newRevisionNum} aprobada por validador.`
  });

  return {
    isValid: true,
    contract: newContract,
    revision: revisionMeta,
    validation_errors: []
  };
}
