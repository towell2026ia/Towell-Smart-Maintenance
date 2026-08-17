// supabase/functions/agents-orchestrator/agents/ag009/ag009_2/contracts/autonomous-schedule.contract.ts
// Strict Contract Validator for AUTONOMOUS-SCHEDULE-001 v1.0

import { AutonomousResponseItem, AutonomousBlock } from '../../types/ag009.types.ts';

export interface AutonomousScheduleContractPayload {
  contract_id: 'AUTONOMOUS-SCHEDULE-001';
  contract_version: '1.0';
  machine_id: string;
  scheduled_date: string;
  week_reference: string | number;
  year: number;
  calendar_reference: string;
  form_reference: string;
  source_reference: 'AUTONOMO';
  department?: string;
  responses: AutonomousResponseItem[];
  operator_id?: string;
  operator_name?: string;
}

export interface ContractValidationResult {
  isValid: boolean;
  errorCode?: string;
  errorMessage?: string;
  cleanedPayload?: AutonomousScheduleContractPayload;
}

const ALLOWED_BLOCKS: Set<string> = new Set(['Vibración', 'Limpieza', 'Lubricación', 'Temperatura', 'Cableado']);
const ALLOWED_TYPES: Set<string> = new Set(['YES_NO', 'NUMERIC', 'SELECT', 'TEXT']);

export function validateAutonomousScheduleContract(rawPayload: any): ContractValidationResult {
  if (!rawPayload || typeof rawPayload !== 'object' || Array.isArray(rawPayload)) {
    return {
      isValid: false,
      errorCode: 'INVALID_CONTRACT',
      errorMessage: 'El payload recibido no es un objeto JSON válido.'
    };
  }

  // 1. Security Check (§71 PRD): Detect unauthorized privilege injection attempts
  const forbiddenSecurityKeys = ['force_create_ot', 'skip_validation', 'is_admin', 'execute_sql', 'target_agent'];
  for (const key of forbiddenSecurityKeys) {
    if (key in rawPayload && rawPayload[key] !== undefined && rawPayload[key] !== false && rawPayload[key] !== null) {
      return {
        isValid: false,
        errorCode: 'UNAUTHORIZED_ACTION_ATTEMPT',
        errorMessage: `Parámetro de autoridad prohibido detectado en el payload: '${key}'. AG-009.2 opera bajo gobernanza estricta.`
      };
    }
  }

  const p = rawPayload;

  // 2. Machine ID
  if (!p.machine_id || typeof p.machine_id !== 'string' || p.machine_id.trim().length === 0) {
    return {
      isValid: false,
      errorCode: 'MISSING_REQUIRED_DATA',
      errorMessage: 'El campo machine_id es obligatorio y no puede estar vacío.'
    };
  }

  // 3. Scheduled Date
  if (!p.scheduled_date || typeof p.scheduled_date !== 'string') {
    return {
      isValid: false,
      errorCode: 'MISSING_REQUIRED_DATA',
      errorMessage: 'El campo scheduled_date es obligatorio.'
    };
  }
  const dateObj = new Date(p.scheduled_date);
  if (isNaN(dateObj.getTime())) {
    return {
      isValid: false,
      errorCode: 'INVALID_DATE',
      errorMessage: `scheduled_date '${p.scheduled_date}' no tiene un formato de fecha válido.`
    };
  }

  // 4. Week Reference
  if (p.week_reference === undefined || p.week_reference === null || String(p.week_reference).trim().length === 0) {
    return {
      isValid: false,
      errorCode: 'MISSING_REQUIRED_DATA',
      errorMessage: 'El campo week_reference es obligatorio.'
    };
  }

  // 5. Year
  const yearVal = typeof p.year === 'number' ? p.year : (parseInt(String(p.year), 10) || dateObj.getUTCFullYear());
  if (isNaN(yearVal) || yearVal < 2000 || yearVal > 2100) {
    return {
      isValid: false,
      errorCode: 'MISSING_REQUIRED_DATA',
      errorMessage: 'El campo year debe ser un año numérico válido (2000-2100).'
    };
  }

  // 6. Calendar Reference
  if (!p.calendar_reference || typeof p.calendar_reference !== 'string' || p.calendar_reference.trim().length === 0) {
    return {
      isValid: false,
      errorCode: 'MISSING_REQUIRED_DATA',
      errorMessage: 'El campo calendar_reference es obligatorio.'
    };
  }

  // 7. Source check (§11 PRD)
  const source = p.source_reference ? String(p.source_reference).trim().toUpperCase() : 'AUTONOMO';
  if (source !== 'AUTONOMO' && source !== 'AG-004' && source !== 'CALENDARIO_AUTONOMO') {
    return {
      isValid: false,
      errorCode: 'INVALID_SOURCE',
      errorMessage: `Fuente de evento '${source}' inválida. Debe ser AUTONOMO.`
    };
  }

  // 8. Responses sanitization & normalization
  const rawResponses = Array.isArray(p.responses) ? p.responses : [];
  const cleanResponses: AutonomousResponseItem[] = [];

  for (let i = 0; i < rawResponses.length; i++) {
    const item = rawResponses[i];
    if (!item || typeof item !== 'object') continue;

    const blockStr = String(item.block || '').trim();
    let normBlock: AutonomousBlock = 'Vibración';
    if (ALLOWED_BLOCKS.has(blockStr)) {
      normBlock = blockStr as AutonomousBlock;
    } else if (blockStr.toLowerCase().includes('vibr')) normBlock = 'Vibración';
    else if (blockStr.toLowerCase().includes('limp')) normBlock = 'Limpieza';
    else if (blockStr.toLowerCase().includes('lubr')) normBlock = 'Lubricación';
    else if (blockStr.toLowerCase().includes('temp')) normBlock = 'Temperatura';
    else if (blockStr.toLowerCase().includes('cabl')) normBlock = 'Cableado';

    const respType = String(item.response_type || 'YES_NO').toUpperCase().trim();
    const normType = ALLOWED_TYPES.has(respType) ? (respType as any) : 'YES_NO';

    cleanResponses.push({
      item_code: String(item.item_code || `ITEM-${i + 1}`).trim().toUpperCase(),
      block: normBlock,
      question_text: String(item.question_text || `Pregunta ${i + 1}`).trim(),
      response_type: normType,
      value: item.value !== undefined ? item.value : null,
      unit: item.unit ? String(item.unit).trim() : undefined,
      required: item.required === true,
      reference_min: typeof item.reference_min === 'number' ? item.reference_min : undefined,
      reference_max: typeof item.reference_max === 'number' ? item.reference_max : undefined,
      evidence_reference: item.evidence_reference ? String(item.evidence_reference).trim() : undefined,
      notes: item.notes ? String(item.notes).trim() : undefined
    });
  }

  return {
    isValid: true,
    cleanedPayload: {
      contract_id: 'AUTONOMOUS-SCHEDULE-001',
      contract_version: '1.0',
      machine_id: String(p.machine_id).trim().toUpperCase(),
      scheduled_date: p.scheduled_date,
      week_reference: p.week_reference,
      year: yearVal,
      calendar_reference: String(p.calendar_reference).trim(),
      form_reference: p.form_reference ? String(p.form_reference).trim() : 'LEVANTAMIENTO_AUTONOMO',
      source_reference: 'AUTONOMO',
      department: p.department ? String(p.department).trim().toUpperCase() : undefined,
      responses: cleanResponses,
      operator_id: p.operator_id ? String(p.operator_id).trim() : undefined,
      operator_name: p.operator_name ? String(p.operator_name).trim() : undefined
    }
  };
}
