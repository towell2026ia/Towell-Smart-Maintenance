// supabase/functions/agents-orchestrator/agents/ag005/validators/calculation-validator.ts
// Calculation Consistency Validator for AG-005 Auditor de Bases v1.0

import { SchemaDefinition, AG005Finding } from '../types/ag005.types.ts';

export function validateCalculatedFields(
  row: Record<string, any>,
  rowIndex: number,
  schema: SchemaDefinition
): { isValid: boolean; findings: AG005Finding[] } {
  const findings: AG005Finding[] = [];

  if (!schema.calculated_fields) {
    return { isValid: true, findings: [] };
  }

  for (const [targetField, calcRule] of Object.entries(schema.calculated_fields)) {
    const originalImporte = row[targetField];
    const cantidad = row['cantidad'] || row['cantidad_estandar'];
    const precio = row['precio de costo'] || row['precio_costo_unitario'] || row['precio'];

    if (cantidad !== undefined && precio !== undefined && originalImporte !== undefined) {
      const cantNum = parseFloat(String(cantidad));
      const precNum = parseFloat(String(precio));
      const origNum = parseFloat(String(originalImporte));

      if (!isNaN(cantNum) && !isNaN(precNum) && !isNaN(origNum)) {
        const calculated = cantNum * precNum;
        const diff = Math.abs(calculated - origNum);
        const tolerance = calcRule.tolerance || 0.10;

        if (diff > tolerance) {
          findings.push({
            row: rowIndex,
            field: targetField,
            severity: 'WARNING',
            code: 'CALCULATION_MISMATCH',
            original_value: origNum,
            normalized_value: calculated,
            message: `Diferencia de cálculo en fila ${rowIndex}: importe original ${origNum} difiere del calculado ${calculated} (cantidad: ${cantNum} × precio: ${precNum}).`
          });
        }
      }
    }
  }

  return {
    isValid: true,
    findings
  };
}
