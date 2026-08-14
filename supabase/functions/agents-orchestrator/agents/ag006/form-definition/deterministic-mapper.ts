// supabase/functions/agents-orchestrator/agents/ag006/form-definition/deterministic-mapper.ts
// Deterministic Field Mapper for AG-006.2 v1.2

import type { WorkbookIR } from '../intermediate/intermediate.types.ts';
import type { FormDefinitionContract, FormFamily, TargetResponseTable, FormSectionDefinition, FormFieldDefinition } from './form-definition.types.ts';
import { evaluateDeterministicRules, MAPPER_RULES_VERSION } from './mapper-rules.ts';

export function resolveTargetResponseTable(family: FormFamily): TargetResponseTable {
  switch (family) {
    case 'LEVANTAMIENTO_PREDICTIVO':
      return 'respuestas_checklist_predictivo';
    case 'LEVANTAMIENTO_AUTONOMO':
      return 'respuestas_checklist_autonomo';
    case 'REQUISICION_OT':
      return 'solicitudes_mantenimiento';
    case 'OT_CHECKLIST':
    case 'BITACORA_LEVANTAMIENTO':
    case 'FORMULARIO_GENERICO':
    default:
      return 'respuestas_checklist_orden';
  }
}

export function mapIntermediateToFormDefinition(
  ir: WorkbookIR,
  targetFamily: FormFamily = 'FORMULARIO_GENERICO'
): FormDefinitionContract {
  const sections: FormSectionDefinition[] = [];
  const warnings: string[] = [];
  const unsupportedComponents: string[] = [];
  let requiresHumanReview = ir.source.has_macros;
  let secCounter = 1;
  let fieldCounter = 1;

  if (ir.source.has_macros) {
    warnings.push('MACRO_DETECTED: Se detectaron firmas de macros o código VBA. No se ejecutó ningún script.');
    unsupportedComponents.push('VBA_Macro_Script');
  }

  for (const sheet of ir.workbook.sheets) {
    const fields: FormFieldDefinition[] = [];

    for (const region of sheet.regions) {
      for (const cell of region.cells) {
        if (!cell.normalized_value) continue;
        const valStr = cell.normalized_value.trim();
        if (!valStr || valStr.length < 2) continue;

        // Evaluate cell against closed rule catalog (FORM-MAP-001)
        const ruleEval = evaluateDeterministicRules(valStr, cell.value_type);

        if (ruleEval.is_ambiguous) {
          requiresHumanReview = true;
          warnings.push(`AMBIGUOUS_FIELD: El campo '${valStr}' no tiene regla determinística unívoca. Requiere revisión humana.`);
        }

        if (ruleEval.requires_renderer_extension) {
          warnings.push(`REQUIRES_RENDERER_EXTENSION: El campo '${valStr}' es DATETIME. Asegurar que el renderer no degrade a fecha.`);
        }

        fields.push({
          code: `field_${fieldCounter}`,
          label: valStr,
          field_type: ruleEval.field_type || 'TEXT',
          required: valStr.toLowerCase().includes('obligatorio') || valStr.includes('*'),
          order: fieldCounter,
          source: ruleEval.source || 'INPUT',
          persist_response: ruleEval.persist_response !== undefined ? ruleEval.persist_response : true,
          storage_type: ruleEval.storage_type || 'RESPONSE',
          validation: ruleEval.requires_renderer_extension ? { requires_renderer_extension: true } : undefined,
          source_reference: {
            sheet: sheet.name,
            cell_range: cell.address
          }
        });
        fieldCounter++;
      }
    }

    sections.push({
      code: `SEC_${secCounter}`,
      title: sheet.name || `Sección ${secCounter}`,
      order: secCounter,
      fields: fields.length > 0 ? fields : [
        { code: `field_${fieldCounter++}`, label: 'Observaciones Generales', field_type: 'TEXTAREA', required: false, order: 1 }
      ]
    });
    secCounter++;
  }

  const codeSlug = ir.source.file_name.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();

  return {
    schema_version: 'FORM-DEFINITION-001',
    status: 'DRAFT',
    form: {
      code: `FORM_${codeSlug}`,
      name: `Formulario Extraído: ${ir.source.file_name}`,
      form_type: targetFamily,
      target_response_table: resolveTargetResponseTable(targetFamily),
      version: '1.0',
      sections: sections.length > 0 ? sections : [{
        code: 'SEC_GENERAL',
        title: 'Datos Generales',
        order: 1,
        fields: [{ code: 'obs', label: 'Observaciones', field_type: 'TEXTAREA', required: false, order: 1 }]
      }]
    },
    warnings,
    unsupported_components: unsupportedComponents,
    requires_human_review: requiresHumanReview, // Always true when macros/ambiguities present
    metadata: {
      source_file_name: ir.source.file_name,
      source_file_hash: ir.source.file_hash,
      has_macros_detected: ir.source.has_macros,
      ir_version: ir.ir_version,
      mapper_version: MAPPER_RULES_VERSION
    }
  };
}
