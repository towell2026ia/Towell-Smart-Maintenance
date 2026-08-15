// supabase/functions/agents-orchestrator/agents/ag006/semantic/semantic-merge.ts
// Deterministic Semantic Merger FORM-SEM-MERGE-001 v1.0

import type { FormDefinitionContract, FormFieldDefinition } from '../form-definition/form-definition.types.ts';
import type { SemanticOutputPackage } from './semantic-output.types.ts';
import { AG006_PROMPT_VERSION } from '../prompts/AG006-PROMPT-001.ts';

export function mergeSemanticDecisions(
  formDraft: FormDefinitionContract,
  semanticPkg: SemanticOutputPackage
): { updatedContract: FormDefinitionContract; mergedCount: number } {
  const updatedContract: FormDefinitionContract = JSON.parse(JSON.stringify(formDraft));
  let mergedCount = 0;

  const mappingMap = new Map(
    semanticPkg.mappings.map(m => [`${m.source_reference.sheet}!${m.source_reference.cell}`, m])
  );

  for (const section of updatedContract.form.sections) {
    for (const field of section.fields) {
      const refKey = `${field.source_reference.sheet}!${field.source_reference.cell}`;
      const proposed = mappingMap.get(refKey);

      // Merge Rule: Modify ONLY fields flagged as ambiguous/unresolved
      if (
        proposed &&
        (field.deterministic_status === 'AMBIGUOUS_FIELD' ||
          field.deterministic_status === 'UNRESOLVED_MAPPING' ||
          field.requires_human_review === true)
      ) {
        field.field_type = proposed.proposed_field_type;
        field.label = proposed.proposed_label || field.label;
        if (proposed.proposed_options && proposed.proposed_options.length > 0) {
          field.options = proposed.proposed_options;
        }

        // Traceability & Human Review Governance Metadata
        field.mapping_source = 'AI_SEMANTIC';
        field.prompt_version = AG006_PROMPT_VERSION;
        field.requires_human_review = true;
        field.confidence = proposed.confidence;
        field.semantic_reason_code = proposed.reason_code;

        mergedCount++;
      }
    }
  }

  return { updatedContract, mergedCount };
}
