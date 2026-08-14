// supabase/functions/agents-orchestrator/agents/ag006/form-definition/form-definition-validator.ts
// Contract Validator for FORM-DEFINITION-001 (AG-006.2 v1.2)

import type { FormDefinitionContract, FormFamily, FieldType, ConditionalOperator } from './form-definition.types.ts';

export const CONTRACT_VALIDATOR_VERSION = 'FORM-VAL-001';

const ALLOWED_FAMILIES: FormFamily[] = [
  'OT_CHECKLIST',
  'LEVANTAMIENTO_PREDICTIVO',
  'LEVANTAMIENTO_AUTONOMO',
  'BITACORA_LEVANTAMIENTO',
  'REQUISICION_OT',
  'FORMULARIO_GENERICO'
];

const ALLOWED_FIELD_TYPES: FieldType[] = [
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
];

const ALLOWED_OPERATORS: ConditionalOperator[] = [
  'EQUALS',
  'NOT_EQUALS',
  'GREATER_THAN',
  'LESS_THAN',
  'IN',
  'NOT_IN',
  'IS_EMPTY',
  'IS_NOT_EMPTY'
];

export interface ContractFinding {
  code: string;
  field_code?: string;
  severity: 'WARNING' | 'ERROR' | 'CRITICAL';
  message: string;
}

export function validateFormDefinitionContract(contract: FormDefinitionContract): {
  isValid: boolean;
  findings: ContractFinding[];
} {
  const findings: ContractFinding[] = [];

  if (contract.schema_version !== 'FORM-DEFINITION-001') {
    findings.push({
      code: 'INVALID_SCHEMA_VERSION',
      severity: 'CRITICAL',
      message: `Versión de esquema inválida '${contract.schema_version}'. Se requiere 'FORM-DEFINITION-001'.`
    });
  }

  if (!contract.form || !ALLOWED_FAMILIES.includes(contract.form.form_type)) {
    findings.push({
      code: 'INVALID_FORM_FAMILY',
      severity: 'CRITICAL',
      message: `La familia de formulario '${contract.form?.form_type}' no pertenece a las familias autorizadas.`
    });
  }

  if (!contract.form || !contract.form.code || !contract.form.name) {
    findings.push({
      code: 'MISSING_FORM_METADATA',
      severity: 'ERROR',
      message: 'El formulario debe contar con code y name.'
    });
  }

  if (!contract.form || !Array.isArray(contract.form.sections) || contract.form.sections.length === 0) {
    findings.push({
      code: 'EMPTY_SECTIONS',
      severity: 'ERROR',
      message: 'El formulario debe tener al menos una sección definida.'
    });
  } else {
    const sectionCodes = new Set<string>();
    const fieldCodes = new Set<string>();

    for (const sec of contract.form.sections) {
      if (sectionCodes.has(sec.code)) {
        findings.push({
          code: 'DUPLICATE_SECTION_CODE',
          severity: 'ERROR',
          message: `Código de sección duplicado '${sec.code}'.`
        });
      }
      sectionCodes.add(sec.code);

      if (!Array.isArray(sec.fields) || sec.fields.length === 0) {
        findings.push({
          code: 'EMPTY_SECTION_FIELDS',
          severity: 'WARNING',
          message: `La sección '${sec.code}' no contiene campos.`
        });
        continue;
      }

      for (const f of sec.fields) {
        if (fieldCodes.has(f.code)) {
          findings.push({
            code: 'DUPLICATE_FIELD_CODE',
            field_code: f.code,
            severity: 'ERROR',
            message: `Código de campo duplicado '${f.code}' en la sección '${sec.code}'.`
          });
        }
        fieldCodes.add(f.code);

        if (!ALLOWED_FIELD_TYPES.includes(f.field_type)) {
          findings.push({
            code: 'UNSUPPORTED_FIELD_TYPE',
            field_code: f.code,
            severity: 'ERROR',
            message: `Tipo de campo no soportado '${f.field_type}' en el campo '${f.code}'.`
          });
        }

        if (f.field_type === 'DATETIME') {
          findings.push({
            code: 'REQUIRES_RENDERER_EXTENSION',
            field_code: f.code,
            severity: 'WARNING',
            message: `El campo '${f.code}' es DATETIME. Asegurar que el renderer no degrade a fecha.`
          });
        }

        if ((f.field_type === 'SELECT' || f.field_type === 'RADIO') && (!f.options || f.options.length === 0)) {
          findings.push({
            code: 'INVALID_FIELD_DEFINITION',
            field_code: f.code,
            severity: 'ERROR',
            message: `El campo '${f.code}' de tipo '${f.field_type}' requiere una lista de opciones.`
          });
        }

        // Validate visibility rules & references
        if (f.visibility_rule) {
          const rule = f.visibility_rule;
          if (!ALLOWED_OPERATORS.includes(rule.when.operator)) {
            findings.push({
              code: 'INVALID_CONDITIONAL_OPERATOR',
              field_code: f.code,
              severity: 'ERROR',
              message: `Operador condicional no permitido '${rule.when.operator}' en el campo '${f.code}'.`
            });
          }
          if (rule.when.field && !fieldCodes.has(rule.when.field)) {
            // Note: will be validated completely in post-pass for forward references
          }
        }
      }
    }

    // Post-pass to validate rule target/field references
    for (const sec of contract.form.sections) {
      for (const f of sec.fields || []) {
        if (f.visibility_rule && f.visibility_rule.when.field) {
          const targetField = f.visibility_rule.when.field;
          if (!fieldCodes.has(targetField)) {
            findings.push({
              code: 'INVALID_FIELD_REFERENCE',
              field_code: f.code,
              severity: 'ERROR',
              message: `La regla condicional del campo '${f.code}' hace referencia a un campo inexistente '${targetField}'.`
            });
          }
        }
      }
    }
  }

  const hasCritical = findings.some(f => f.severity === 'CRITICAL' || f.severity === 'ERROR');

  return {
    isValid: !hasCritical,
    findings
  };
}
