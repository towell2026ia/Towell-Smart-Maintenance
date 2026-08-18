// supabase/functions/agents-orchestrator/agents/ag004/guards/checklist-completeness-guard.ts
// Strict Checklist Completeness Guard for AG-004

import { AutonomousSurveyResponses } from '../types/ag004.types.ts';
import { validateMandatoryTemperature } from './temperature-required-guard.ts';

export interface ChecklistCompletenessResult {
  isComplete: boolean;
  missingBlocks: string[];
  errorCode?: string;
  errorMessage?: string;
}

export function validateChecklistCompleteness(responses: Partial<AutonomousSurveyResponses> | null | undefined): ChecklistCompletenessResult {
  if (!responses || typeof responses !== 'object') {
    return {
      isComplete: false,
      missingBlocks: ['Vibración', 'Limpieza', 'Lubricación', 'Temperatura', 'Cableado'],
      errorCode: 'AUTONOMOUS_CHECKLIST_INCOMPLETE',
      errorMessage: 'El objeto de respuestas del checklist no fue proporcionado.'
    };
  }

  const missing: string[] = [];

  // 1. Vibración
  if (!responses.vibracion_estado) {
    missing.push('Vibración');
  }

  // 2. Limpieza
  if (!responses.limpieza_estado) {
    missing.push('Limpieza');
  }

  // 3. Lubricación
  if (!responses.lubricacion_estado) {
    missing.push('Lubricación');
  }

  // 4. Temperatura (Mandatory check)
  const tempCheck = validateMandatoryTemperature(responses.temperatura_c);
  if (!tempCheck.isValid) {
    missing.push('Temperatura');
  }

  // 5. Cableado
  if (!responses.cableado_estado) {
    missing.push('Cableado');
  }

  if (missing.length > 0) {
    const isTempMissing = missing.includes('Temperatura');
    return {
      isComplete: false,
      missingBlocks: missing,
      errorCode: isTempMissing && missing.length === 1 ? 'MANDATORY_TEMPERATURE_VALUE_MISSING' : 'AUTONOMOUS_CHECKLIST_INCOMPLETE',
      errorMessage: `El checklist autónomo está incompleto. Bloques faltantes o inválidos: ${missing.join(', ')}.`
    };
  }

  return {
    isComplete: true,
    missingBlocks: []
  };
}
