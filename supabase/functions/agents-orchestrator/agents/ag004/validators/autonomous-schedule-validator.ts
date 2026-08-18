// supabase/functions/agents-orchestrator/agents/ag004/validators/autonomous-schedule-validator.ts
// Strict Validator for AUTONOMOUS-SCHEDULE-001

import { AutonomousScheduleContractPayload } from '../types/ag004.types.ts';
import { ALLOWED_DEPARTMENTS } from '../rules/eligibility.rules.ts';

export interface ScheduleValidationResult {
  isValid: boolean;
  errorCode?: string;
  errorMessage?: string;
}

export function validateAutonomousScheduleContract(payload: any): ScheduleValidationResult {
  if (!payload || typeof payload !== 'object') {
    return { isValid: false, errorCode: 'INVALID_PAYLOAD', errorMessage: 'El payload no es un objeto válido.' };
  }

  // Security guard against unauthorized control keys
  const forbiddenKeys = ['force_schedule', 'skip_validation', 'create_ot', 'assign_technician', 'close_ot'];
  for (const k of forbiddenKeys) {
    if (k in payload && payload[k] !== undefined && payload[k] !== false && payload[k] !== null) {
      return {
        isValid: false,
        errorCode: 'UNAUTHORIZED_ACTION_ATTEMPT',
        errorMessage: `Parámetro prohibido detectado en el payload: '${k}'.`
      };
    }
  }

  if (payload.contract_id !== 'AUTONOMOUS-SCHEDULE-001') {
    return { isValid: false, errorCode: 'INVALID_CONTRACT_ID', errorMessage: `contract_id inválido: ${payload.contract_id}` };
  }
  if (payload.contract_version !== '1.0') {
    return { isValid: false, errorCode: 'INVALID_CONTRACT_VERSION', errorMessage: `contract_version inválido: ${payload.contract_version}` };
  }
  if (!payload.machine_id || typeof payload.machine_id !== 'string') {
    return { isValid: false, errorCode: 'MISSING_MACHINE_ID', errorMessage: 'machine_id es obligatorio.' };
  }
  if (!payload.scheduled_date || typeof payload.scheduled_date !== 'string') {
    return { isValid: false, errorCode: 'MISSING_SCHEDULED_DATE', errorMessage: 'scheduled_date es obligatorio.' };
  }
  if (!payload.department || !ALLOWED_DEPARTMENTS.has(payload.department)) {
    return { isValid: false, errorCode: 'INVALID_DEPARTMENT', errorMessage: `department inválido: ${payload.department}` };
  }
  if (!payload.calendar_reference || typeof payload.calendar_reference !== 'string') {
    return { isValid: false, errorCode: 'MISSING_CALENDAR_REFERENCE', errorMessage: 'calendar_reference es obligatorio.' };
  }
  if (!payload.correlation_id || typeof payload.correlation_id !== 'string') {
    return { isValid: false, errorCode: 'MISSING_CORRELATION_ID', errorMessage: 'correlation_id es obligatorio.' };
  }

  return { isValid: true };
}
