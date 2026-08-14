// supabase/functions/agents-orchestrator/agents/ag005/validators/data-validator.ts
// Data Type and Field Validator for AG-005 Auditor de Bases v1.0

import { SchemaDefinition, AG005Finding } from '../types/ag005.types.ts';
import { normalizeDate, normalizeNumeric } from '../normalizer/normalizer.ts';

export function validateRowData(
  row: Record<string, any>,
  rowIndex: number,
  schema: SchemaDefinition
): { isValid: boolean; findings: AG005Finding[]; cleanedRow: Record<string, any> } {
  const findings: AG005Finding[] = [];
  const cleanedRow: Record<string, any> = { ...row };

  for (const fieldName of schema.required_columns) {
    const val = row[fieldName];
    if (val === undefined || val === null || String(val).trim() === '') {
      findings.push({
        row: rowIndex,
        field: fieldName,
        severity: 'ERROR',
        code: 'MISSING_REQUIRED_FIELD',
        original_value: val,
        message: `El campo obligatorio '${fieldName}' está vacío en la fila ${rowIndex}.`
      });
    }
  }

  // Type Checks
  for (const [field, expectedType] of Object.entries(schema.data_types)) {
    const val = row[field];
    if (val === undefined || val === null || val === '') continue;

    if (expectedType === 'INTEGER') {
      const numRes = normalizeNumeric(val, false);
      if (!numRes.isValid) {
        findings.push({
          row: rowIndex,
          field,
          severity: 'ERROR',
          code: 'INVALID_TYPE',
          original_value: val,
          message: `El valor '${val}' en el campo '${field}' no es un entero válido.`
        });
      } else {
        cleanedRow[field] = numRes.numberValue;
      }
    } else if (expectedType === 'DECIMAL') {
      const numRes = normalizeNumeric(val, true);
      if (!numRes.isValid) {
        findings.push({
          row: rowIndex,
          field,
          severity: 'ERROR',
          code: 'INVALID_TYPE',
          original_value: val,
          message: `El valor '${val}' en el campo '${field}' no es un número decimal válido.`
        });
      } else {
        cleanedRow[field] = numRes.numberValue;
      }
    } else if (expectedType === 'DATE' || expectedType === 'DATETIME') {
      const dateRes = normalizeDate(val);
      if (!dateRes.isValid) {
        findings.push({
          row: rowIndex,
          field,
          severity: 'ERROR',
          code: 'INVALID_DATE',
          original_value: val,
          message: `La fecha '${val}' en el campo '${field}' es inválida o no tiene un formato reconocido.`
        });
      } else {
        // Range check: no future dates for historical data
        if (dateRes.date && dateRes.date.getTime() > Date.now() + 86400000) {
          findings.push({
            row: rowIndex,
            field,
            severity: 'WARNING',
            code: 'FUTURE_DATE_WARNING',
            original_value: val,
            message: `La fecha '${val}' en la fila ${rowIndex} es futura.`
          });
        }
        cleanedRow[field] = dateRes.iso_string;
      }
    } else if (expectedType === 'ENUM' && schema.enums && schema.enums[field]) {
      const allowedEnums = schema.enums[field];
      const strVal = String(val).trim().toUpperCase();
      if (!allowedEnums.map(e => e.toUpperCase()).includes(strVal)) {
        findings.push({
          row: rowIndex,
          field,
          severity: 'ERROR',
          code: 'INVALID_ENUM',
          original_value: val,
          message: `El valor '${val}' en '${field}' no pertenece a los valores permitidos [${allowedEnums.join(', ')}].`
        });
      }
    }
  }

  const hasCritical = findings.some(f => f.severity === 'ERROR' || f.severity === 'CRITICAL');
  return {
    isValid: !hasCritical,
    findings,
    cleanedRow
  };
}
