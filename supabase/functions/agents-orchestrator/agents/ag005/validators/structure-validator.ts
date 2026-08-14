// supabase/functions/agents-orchestrator/agents/ag005/validators/structure-validator.ts
// Structural Validator for AG-005 Auditor de Bases v1.0

import { SchemaDefinition, AG005Finding } from '../types/ag005.types.ts';
import { normalizeHeaderName } from '../schema-registry.ts';

export interface StructureValidationResult {
  status: 'STRUCTURE_VALID' | 'STRUCTURE_WARNING' | 'STRUCTURE_INVALID';
  missing_required: string[];
  extra_columns: string[];
  findings: AG005Finding[];
}

export function validateStructure(
  headers: string[],
  schema: SchemaDefinition
): StructureValidationResult {
  const findings: AG005Finding[] = [];
  const normalizedHeaders = headers.map(normalizeHeaderName);
  const expectedNormalized = schema.expected_columns.map(normalizeHeaderName);
  const requiredNormalized = schema.required_columns.map(normalizeHeaderName);

  const missing_required: string[] = [];
  const extra_columns: string[] = [];

  // Check missing required columns
  for (let i = 0; i < requiredNormalized.length; i++) {
    const req = requiredNormalized[i];
    const originalName = schema.required_columns[i];
    if (!normalizedHeaders.includes(req)) {
      missing_required.push(originalName);
      findings.push({
        row: 0,
        field: originalName,
        severity: 'CRITICAL',
        code: 'MISSING_REQUIRED_COLUMN',
        original_value: null,
        message: `Falta la columna obligatoria '${originalName}' requerida por el schema '${schema.schema_id}_V${schema.version}'.`
      });
    }
  }

  // Check extra unmapped columns
  for (let i = 0; i < normalizedHeaders.length; i++) {
    const headerNorm = normalizedHeaders[i];
    const originalHeader = headers[i];
    if (!expectedNormalized.includes(headerNorm)) {
      extra_columns.push(originalHeader);
      findings.push({
        row: 0,
        field: originalHeader,
        severity: 'WARNING',
        code: 'EXTRA_COLUMN',
        original_value: originalHeader,
        message: `Se detectó la columna no contemplada '${originalHeader}' en la posición ${i + 1}.`
      });
    }
  }

  let status: 'STRUCTURE_VALID' | 'STRUCTURE_WARNING' | 'STRUCTURE_INVALID' = 'STRUCTURE_VALID';
  if (missing_required.length > 0) {
    status = 'STRUCTURE_INVALID';
  } else if (extra_columns.length > 0) {
    status = 'STRUCTURE_WARNING';
  }

  return {
    status,
    missing_required,
    extra_columns,
    findings
  };
}
