// supabase/functions/agents-orchestrator/agents/ag006/intermediate/intermediate-validator.ts
// Validator for WORKBOOK-IR-001 (AG-006.2)

import type { WorkbookIR } from './intermediate.types.ts';

export function validateIntermediateRepresentation(ir: WorkbookIR): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (ir.ir_version !== 'WORKBOOK-IR-001') {
    errors.push(`Versión IR inválida '${ir.ir_version}'. Se requiere 'WORKBOOK-IR-001'.`);
  }

  if (!ir.source || !ir.source.file_name || !ir.source.file_hash) {
    errors.push('Los metadatos de fuente (source) son incompletos.');
  }

  if (!ir.workbook || !Array.isArray(ir.workbook.sheets)) {
    errors.push('La estructura de hojas del workbook es inválida.');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
