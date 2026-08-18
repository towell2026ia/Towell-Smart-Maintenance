// supabase/functions/agents-orchestrator/agents/ag004/validators/autonomous-response-validator.ts
// Strict Response Validator for Autonomous Checklist Responses

import { AutonomousSurveyResponses } from '../types/ag004.types.ts';
import { validateChecklistCompleteness } from '../guards/checklist-completeness-guard.ts';
import { validateMandatoryTemperature } from '../guards/temperature-required-guard.ts';

export interface ResponseValidationOutput {
  isValid: boolean;
  errorCode?: string;
  errorMessage?: string;
  cleanedResponses?: AutonomousSurveyResponses;
}

export function validateAutonomousResponses(rawResponses: any): ResponseValidationOutput {
  if (!rawResponses || typeof rawResponses !== 'object') {
    return {
      isValid: false,
      errorCode: 'INVALID_RESPONSE_PAYLOAD',
      errorMessage: 'El payload de respuestas no es un objeto válido.'
    };
  }

  // Check completeness (all 5 blocks)
  const completeness = validateChecklistCompleteness(rawResponses);
  if (!completeness.isComplete) {
    return {
      isValid: false,
      errorCode: completeness.errorCode,
      errorMessage: completeness.errorMessage
    };
  }

  // Validate temperature specifically
  const tempVal = validateMandatoryTemperature(rawResponses.temperatura_c);
  if (!tempVal.isValid || tempVal.value === undefined) {
    return {
      isValid: false,
      errorCode: tempVal.errorCode,
      errorMessage: tempVal.errorMessage
    };
  }

  return {
    isValid: true,
    cleanedResponses: {
      id_levantamiento: String(rawResponses.id_levantamiento || ''),
      machine_id: String(rawResponses.machine_id || '').trim().toUpperCase(),
      vibracion_estado: rawResponses.vibracion_estado,
      vibracion_mms: rawResponses.vibracion_mms !== undefined ? Number(rawResponses.vibracion_mms) : null,
      vibracion_hz: rawResponses.vibracion_hz !== undefined ? Number(rawResponses.vibracion_hz) : null,
      vibracion_obs: rawResponses.vibracion_obs || null,
      limpieza_estado: rawResponses.limpieza_estado,
      limpieza_evidencia: rawResponses.limpieza_evidencia || null,
      limpieza_obs: rawResponses.limpieza_obs || null,
      lubricacion_estado: rawResponses.lubricacion_estado,
      lubricacion_nivel: rawResponses.lubricacion_nivel || 'NORMAL',
      lubricacion_fugas: rawResponses.lubricacion_fugas || 'SIN_FUGAS',
      lubricacion_contaminacion: rawResponses.lubricacion_contaminacion || 'NO',
      lubricacion_obs: rawResponses.lubricacion_obs || null,
      temperatura_c: tempVal.value,
      temperatura_obs: rawResponses.temperatura_obs || null,
      cableado_estado: rawResponses.cableado_estado,
      cableado_obs: rawResponses.cableado_obs || null,
      evidence_url: rawResponses.evidence_url || null
    }
  };
}
