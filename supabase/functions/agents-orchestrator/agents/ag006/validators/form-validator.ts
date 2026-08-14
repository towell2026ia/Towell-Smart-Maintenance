// supabase/functions/agents-orchestrator/agents/ag006/validators/form-validator.ts
// Form Definition Validator for FORM-DEFINITION-001 (AG-006 v1.1)

import { FormDefinition, FormFamily, FieldType } from '../types/ag006.types.ts';

export const VALIDATOR_VERSION = 'FORM-VAL-001';

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

export interface FormValidationFinding {
  code: string;
  field_code?: string;
  severity: 'WARNING' | 'ERROR' | 'CRITICAL';
  message: string;
}

export function validateFormDefinition(def: FormDefinition): {
  isValid: boolean;
  findings: FormValidationFinding[];
} {
  const findings: FormValidationFinding[] = [];

  if (def.schema_version !== 'FORM-DEFINITION-001') {
    findings.push({
      code: 'INVALID_SCHEMA_VERSION',
      severity: 'CRITICAL',
      message: `Versión de esquema inválida '${def.schema_version}'. Se requiere 'FORM-DEFINITION-001'.`
    });
  }

  if (!ALLOWED_FAMILIES.includes(def.form_family)) {
    findings.push({
      code: 'INVALID_FORM_FAMILY',
      severity: 'CRITICAL',
      message: `La familia de formulario '${def.form_family}' no pertenece a las familias autorizadas.`
    });
  }

  if (!def.form_code || !def.title) {
    findings.push({
      code: 'MISSING_FORM_METADATA',
      severity: 'ERROR',
      message: 'El formulario debe contar con form_code y title.'
    });
  }

  if (!Array.isArray(def.sections) || def.sections.length === 0) {
    findings.push({
      code: 'EMPTY_SECTIONS',
      severity: 'ERROR',
      message: 'El formulario debe tener al menos una sección definida.'
    });
  } else {
    const sectionCodes = new Set<string>();
    const fieldCodes = new Set<string>();

    for (const sec of def.sections) {
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
            message: `El campo '${f.code}' es DATETIME. Asegurar que el renderer no degrade silenciosamente a fecha.`
          });
        }

        if ((f.field_type === 'SELECT' || f.field_type === 'RADIO') && (!f.options || f.options.length === 0)) {
          findings.push({
            code: 'MISSING_FIELD_OPTIONS',
            field_code: f.code,
            severity: 'WARNING',
            message: `El campo '${f.code}' de tipo '${f.field_type}' requiere una lista de opciones.`
          });
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
