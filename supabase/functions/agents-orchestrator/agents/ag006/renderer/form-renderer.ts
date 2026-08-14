// supabase/functions/agents-orchestrator/agents/ag006/renderer/form-renderer.ts
// Pure Dynamic Form Renderer for AG-006.3 (FORM-RENDER-001)

import type { FormDefinitionContract } from '../form-definition/form-definition.types.ts';
import type { RenderedForm, RenderedSection, RenderedField } from './renderer.types.ts';
import { RENDERER_VERSION } from './renderer.types.ts';
import { renderFieldByRegistry } from './field-renderer-registry.ts';
import { evaluateConditionalRule } from './conditional-rule-engine.ts';
import { sanitizeHtmlText } from './html-sanitizer.ts';

/**
 * Pure Dynamic Form Renderer interpreting FORM-DEFINITION-001.
 * Renders sections, fields, labels, placeholders, options, and conditional visibility safely.
 */
export function renderFormDefinition(
  contract: FormDefinitionContract,
  currentValues: Record<string, any> = {}
): RenderedForm {
  const warnings: string[] = [...(contract.warnings || [])];
  let unsupportedFieldsCount = 0;
  let totalFields = 0;

  // Collect all field codes for conditional rule reference validation
  const allFieldCodes = new Set<string>();
  for (const sec of contract.form.sections || []) {
    for (const f of sec.fields || []) {
      allFieldCodes.add(f.code);
    }
  }

  // Sort sections strictly by section.order
  const sortedSections = [...(contract.form.sections || [])].sort((a, b) => a.order - b.order);
  const renderedSections: RenderedSection[] = [];

  for (const secDef of sortedSections) {
    // Sort fields strictly by field.order
    const sortedFields = [...(secDef.fields || [])].sort((a, b) => a.order - b.order);
    const renderedFields: RenderedField[] = [];

    for (const fDef of sortedFields) {
      totalFields++;

      // Evaluate conditional rule
      const ruleEval = evaluateConditionalRule(fDef.visibility_rule, currentValues, allFieldCodes);
      if (!ruleEval.is_valid_rule && ruleEval.error_code) {
        warnings.push(`INVALID_CONDITIONAL_RULE: ${ruleEval.message}`);
      }

      const renderedField = renderFieldByRegistry(fDef, ruleEval.is_visible);
      if (renderedField.unsupported_type_error) {
        unsupportedFieldsCount++;
        warnings.push(`UNSUPPORTED_FIELD_TYPE: El tipo '${fDef.field_type}' en el campo '${fDef.code}' no cuenta con renderer autorizado.`);
      }

      renderedFields.push(renderedField);
    }

    renderedSections.push({
      code: sanitizeHtmlText(secDef.code),
      title: sanitizeHtmlText(secDef.title),
      description: secDef.description ? sanitizeHtmlText(secDef.description) : undefined,
      order: secDef.order,
      instructions: secDef.instructions ? sanitizeHtmlText(secDef.instructions) : undefined,
      fields: renderedFields
    });
  }

  return {
    schema_version: 'FORM-DEFINITION-001',
    renderer_version: RENDERER_VERSION,
    form_code: sanitizeHtmlText(contract.form.code),
    form_name: sanitizeHtmlText(contract.form.name),
    form_type: contract.form.form_type,
    target_response_table: contract.form.target_response_table,
    sections: renderedSections,
    total_fields: totalFields,
    unsupported_fields_count: unsupportedFieldsCount,
    requires_human_review: contract.requires_human_review || unsupportedFieldsCount > 0,
    warnings
  };
}
