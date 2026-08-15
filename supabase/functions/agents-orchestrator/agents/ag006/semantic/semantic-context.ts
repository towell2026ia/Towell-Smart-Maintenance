// supabase/functions/agents-orchestrator/agents/ag006/semantic/semantic-context.ts
// Data Minimization Context Builder for AG-006.4 v1.0

import type { FormDefinitionContract, FormFieldDefinition } from '../form-definition/form-definition.types.ts';
import type { WorkbookIR } from '../intermediate/intermediate.types.ts';

export interface AmbiguousElementContext {
  source_reference: {
    sheet: string;
    cell: string;
  };
  label: string;
  section_title: string;
  nearby_text: string[];
  excel_validation: any | null;
  deterministic_result: string;
}

export interface SemanticContextPackage {
  form_family_hint: string;
  ambiguous_elements: AmbiguousElementContext[];
  allowed_field_types: string[];
}

/**
 * Builds a minimized context package containing ONLY ambiguous/unresolved fields.
 * Never sends full workbooks, credentials, or unrelated sheets.
 */
export function buildSemanticContext(
  formDraft: FormDefinitionContract,
  ir?: WorkbookIR
): SemanticContextPackage {
  const ambiguousElements: AmbiguousElementContext[] = [];

  for (const section of formDraft.form.sections) {
    for (const field of section.fields) {
      // Data Minimization: Select ONLY fields requiring AI interpretation
      if (
        field.deterministic_status === 'AMBIGUOUS_FIELD' ||
        field.deterministic_status === 'UNRESOLVED_MAPPING' ||
        field.requires_human_review === true
      ) {
        // Extract nearby text from IR if available
        let nearbyText: string[] = [];
        if (ir && field.source_reference) {
          const sheet = ir.workbook.sheets.find(s => s.name === field.source_reference.sheet);
          if (sheet) {
            for (const region of sheet.regions) {
              for (const cell of region.cells) {
                if (cell.normalized_value && cell.normalized_value !== field.label) {
                  nearbyText.push(cell.normalized_value);
                }
              }
            }
          }
        }

        // Limit nearby text to 5 items to prevent bloated context
        nearbyText = Array.from(new Set(nearbyText)).slice(0, 5);

        ambiguousElements.push({
          source_reference: {
            sheet: field.source_reference.sheet,
            cell: field.source_reference.cell
          },
          label: field.label,
          section_title: section.title,
          nearby_text: nearbyText,
          excel_validation: null,
          deterministic_result: field.deterministic_status || 'AMBIGUOUS_FIELD'
        });
      }
    }
  }

  return {
    form_family_hint: formDraft.form.form_type,
    ambiguous_elements: ambiguousElements,
    allowed_field_types: [
      'TEXT',
      'TEXTAREA',
      'INTEGER',
      'DECIMAL',
      'DATE',
      'DATETIME',
      'BOOLEAN',
      'YES_NO',
      'SELECT',
      'MULTISELECT',
      'CHECKBOX',
      'RADIO',
      'PHOTO',
      'FILE',
      'SIGNATURE',
      'MACHINE_SELECTOR',
      'TECHNICIAN_SELECTOR',
      'READ_ONLY'
    ]
  };
}
