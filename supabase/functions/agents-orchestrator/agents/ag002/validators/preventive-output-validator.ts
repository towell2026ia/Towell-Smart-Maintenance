// supabase/functions/agents-orchestrator/agents/ag002/validators/preventive-output-validator.ts
// Output Validator for PREVENTIVE-SCHEDULE-001 payloads (§77, §78 PRD)

import { PreventiveScheduleContractPayload } from '../builders/preventive-contract-builder.ts';

export interface OutputValidationResult {
  isValid: boolean;
  errorCode?: string;
  errorMessage?: string;
}

export function validatePreventiveOutput(payload: PreventiveScheduleContractPayload, expectedYear: number): OutputValidationResult {
  if (!payload || typeof payload !== 'object') {
    return { isValid: false, errorCode: 'PREVENTIVE_OUTPUT_VALIDATION_ERROR', errorMessage: 'Payload nulo o no objeto.' };
  }

  if (payload.contract_id !== 'PREVENTIVE-SCHEDULE-001') {
    return { isValid: false, errorCode: 'PREVENTIVE_OUTPUT_VALIDATION_ERROR', errorMessage: 'contract_id debe ser PREVENTIVE-SCHEDULE-001.' };
  }

  if (!payload.machine_id || typeof payload.machine_id !== 'string' || payload.machine_id.trim().length === 0) {
    return { isValid: false, errorCode: 'PREVENTIVE_OUTPUT_VALIDATION_ERROR', errorMessage: 'machine_id es obligatorio.' };
  }

  if (!payload.scheduled_date || typeof payload.scheduled_date !== 'string') {
    return { isValid: false, errorCode: 'PREVENTIVE_OUTPUT_VALIDATION_ERROR', errorMessage: 'scheduled_date es obligatorio.' };
  }

  if (!payload.scheduled_date.startsWith(String(expectedYear))) {
    return { isValid: false, errorCode: 'PREVENTIVE_OUTPUT_VALIDATION_ERROR', errorMessage: `scheduled_date no coincide con año ${expectedYear}.` };
  }

  if (payload.year !== expectedYear) {
    return { isValid: false, errorCode: 'PREVENTIVE_OUTPUT_VALIDATION_ERROR', errorMessage: `year no coincide con ${expectedYear}.` };
  }

  if (!payload.service_code || typeof payload.service_code !== 'string') {
    return { isValid: false, errorCode: 'PREVENTIVE_OUTPUT_VALIDATION_ERROR', errorMessage: 'service_code es obligatorio.' };
  }

  if (!payload.calendar_reference || typeof payload.calendar_reference !== 'string') {
    return { isValid: false, errorCode: 'PREVENTIVE_OUTPUT_VALIDATION_ERROR', errorMessage: 'calendar_reference es obligatorio.' };
  }

  return { isValid: true };
}
