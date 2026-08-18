// supabase/functions/agents-orchestrator/agents/ag003/validators/predictive-output-validator.ts
// Predictive Output Validator (§149, §150 PRD)

import { PredictiveMonthlyScheduleItem } from '../types/ag003.types.ts';

export interface OutputValidationResult {
  isValid: boolean;
  errors: string[];
}

export function validatePredictiveOutput(
  items: PredictiveMonthlyScheduleItem[],
  targetYear: number,
  targetMonth: number
): OutputValidationResult {
  const errors: string[] = [];

  if (items.length > 4) {
    errors.push(`Violación de límite mensual: se generaron ${items.length} intervenciones (máximo permitido: 4).`);
  }

  const seenMachines = new Set<string>();
  const expectedMonthStr = `${targetYear}-${String(targetMonth).padStart(2, '0')}`;

  items.forEach((item, idx) => {
    if (item.contract_id !== 'PREDICTIVE-SCHEDULE-001') {
      errors.push(`Item #${idx + 1}: contract_id inválido (${item.contract_id}).`);
    }

    if (item.department !== 'PF') {
      errors.push(`Item #${idx + 1}: departamento no elegible (${item.department}). Solo se permite PF.`);
    }

    if (seenMachines.has(item.machine_id)) {
      errors.push(`Item #${idx + 1}: telar duplicado en el mismo mes (${item.machine_id}).`);
    }
    seenMachines.add(item.machine_id);

    if (item.month_str !== expectedMonthStr) {
      errors.push(`Item #${idx + 1}: month_str (${item.month_str}) no coincide con el mes objetivo (${expectedMonthStr}).`);
    }

    const itemDate = item.scheduled_date;
    if (!itemDate.startsWith(expectedMonthStr)) {
      errors.push(`Item #${idx + 1}: fecha programada (${itemDate}) fuera del mes objetivo (${expectedMonthStr}).`);
    }

    if (!item.required_blocks || item.required_blocks.length !== 4) {
      errors.push(`Item #${idx + 1}: el checklist debe incluir exactamente los 4 bloques aprobados.`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
}
