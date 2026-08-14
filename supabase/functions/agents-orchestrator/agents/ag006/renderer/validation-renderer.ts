// supabase/functions/agents-orchestrator/agents/ag006/renderer/validation-renderer.ts
// Renderer Validation Engine for AG-006.3

import type { RenderedField } from './renderer.types.ts';

export interface FieldValidationError {
  field_code: string;
  constraint: 'REQUIRED' | 'MIN_VALUE' | 'MAX_VALUE' | 'MIN_LENGTH' | 'MAX_LENGTH' | 'INVALID_OPTION';
  message: string;
}

export function validateRenderedFieldValue(
  field: RenderedField,
  val: any
): FieldValidationError[] {
  const errors: FieldValidationError[] = [];
  const valStr = val !== undefined && val !== null ? String(val).trim() : '';

  // 1. Required Check
  if (field.required && !valStr) {
    errors.push({
      field_code: field.code,
      constraint: 'REQUIRED',
      message: `El campo '${field.label}' es obligatorio.`
    });
    return errors;
  }

  if (!valStr) return errors;

  // 2. Numeric Min/Max
  if (field.field_type === 'INTEGER' || field.field_type === 'DECIMAL') {
    const num = Number(valStr);
    if (!isNaN(num)) {
      if (field.min_value !== undefined && num < field.min_value) {
        errors.push({
          field_code: field.code,
          constraint: 'MIN_VALUE',
          message: `El campo '${field.label}' debe ser mayor o igual a ${field.min_value}.`
        });
      }
      if (field.max_value !== undefined && num > field.max_value) {
        errors.push({
          field_code: field.code,
          constraint: 'MAX_VALUE',
          message: `El campo '${field.label}' debe ser menor o igual a ${field.max_value}.`
        });
      }
    }
  }

  // 3. String Length Min/Max
  if (field.min_length !== undefined && valStr.length < field.min_length) {
    errors.push({
      field_code: field.code,
      constraint: 'MIN_LENGTH',
      message: `El campo '${field.label}' debe tener al menos ${field.min_length} caracteres.`
    });
  }
  if (field.max_length !== undefined && valStr.length > field.max_length) {
    errors.push({
      field_code: field.code,
      constraint: 'MAX_LENGTH',
      message: `El campo '${field.label}' debe tener como máximo ${field.max_length} caracteres.`
    });
  }

  // 4. Allowed Options Check (SELECT, RADIO)
  if ((field.field_type === 'SELECT' || field.field_type === 'RADIO') && field.options && field.options.length > 0) {
    const validValues = field.options.map(o => o.value);
    if (!validValues.includes(valStr)) {
      errors.push({
        field_code: field.code,
        constraint: 'INVALID_OPTION',
        message: `El valor '${valStr}' no es una opción válida para el campo '${field.label}'.`
      });
    }
  }

  return errors;
}
