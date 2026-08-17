// supabase/functions/agents-orchestrator/agents/ag009/ag009_2/validators/response-validator.ts
// Validator for Response Integrity, Types, and Required Fields (§22, §23, §28 PRD)

import { AutonomousResponseItem } from '../../types/ag009.types.ts';
import { AutonomousConnectorError } from '../errors/autonomous-error-catalog.ts';

export function validateAutonomousResponses(
  responses: AutonomousResponseItem[]
): AutonomousResponseItem[] {
  if (!Array.isArray(responses) || responses.length === 0) {
    throw new AutonomousConnectorError(
      'MISSING_REQUIRED_RESPONSE',
      'El checklist no contiene preguntas o respuestas para procesar.'
    );
  }

  const validated: AutonomousResponseItem[] = [];

  for (let i = 0; i < responses.length; i++) {
    const item = responses[i];
    const itemLabel = item.item_code || `Item #${i + 1}`;

    // 1. Required Check (§22 & §23 PRD): Do not invent responses for missing fields
    const isValueEmpty = item.value === null || item.value === undefined || item.value === '';
    if (item.required === true && isValueEmpty) {
      throw new AutonomousConnectorError(
        'MISSING_REQUIRED_RESPONSE',
        `Respuesta obligatoria faltante para ${itemLabel} (${item.block} — "${item.question_text}").`
      );
    }

    // If empty and not required, pass through as null
    if (isValueEmpty) {
      validated.push({ ...item, value: null });
      continue;
    }

    // 2. Type Check (§27 PRD)
    let finalVal = item.value;
    const type = item.response_type || 'YES_NO';

    if (type === 'NUMERIC') {
      const num = typeof item.value === 'number' ? item.value : parseFloat(String(item.value).trim());
      if (isNaN(num)) {
        throw new AutonomousConnectorError(
          'INVALID_RESPONSE_TYPE',
          `El valor '${item.value}' para ${itemLabel} debe ser un número válido.`
        );
      }
      finalVal = num;
    } else if (type === 'YES_NO') {
      const strVal = String(item.value).toUpperCase().trim();
      const validYesNo = ['SI', 'NO', 'OK', 'NOK', 'TRUE', 'FALSE', 'CORRECTO', 'INCORRECTO', 'N/A', 'NA'];
      if (!validYesNo.includes(strVal) && typeof item.value !== 'boolean') {
        throw new AutonomousConnectorError(
          'INVALID_RESPONSE_TYPE',
          `El valor '${item.value}' para ${itemLabel} debe ser una respuesta afirmativa, negativa o N/A.`
        );
      }
      finalVal = typeof item.value === 'boolean' ? (item.value ? 'SI' : 'NO') : strVal;
    }

    validated.push({
      ...item,
      value: finalVal
    });
  }

  return validated;
}
