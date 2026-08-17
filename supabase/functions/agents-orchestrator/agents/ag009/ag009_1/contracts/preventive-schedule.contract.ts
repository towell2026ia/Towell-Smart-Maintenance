// supabase/functions/agents-orchestrator/agents/ag009/ag009_1/contracts/preventive-schedule.contract.ts
// Official Contract: PREVENTIVE-SCHEDULE-001 (AG-002 -> AG-009.1)

import { DepartmentCode, PlannedPartReference } from '../../types/ag009.types.ts';

export const PREVENTIVE_SCHEDULE_CONTRACT_ID = 'PREVENTIVE-SCHEDULE-001';
export const PREVENTIVE_SCHEDULE_CONTRACT_VERSION = '1.0';

export interface PreventiveSchedulePayload {
  contract_id?: string;
  contract_version?: string;
  machine_id: string;
  scheduled_date: string; // YYYY-MM-DD or ISO timestamp
  year: number;
  service_code: string;
  calendar_reference: string; // e.g. id_plan UUID or 'PLAN-2026-001'
  source_reference?: string;  // e.g. 'AG-002'
  department?: DepartmentCode;
  description?: string;
  planned_parts?: PlannedPartReference[];
  estimated_duration_min?: number;
}

export interface ContractValidationResult {
  isValid: boolean;
  errorCode?: string;
  errorMessage?: string;
  cleanedPayload?: PreventiveSchedulePayload;
}

export function validatePreventiveScheduleContract(rawPayload: unknown): ContractValidationResult {
  if (!rawPayload || typeof rawPayload !== 'object') {
    return {
      isValid: false,
      errorCode: 'INVALID_CONTRACT',
      errorMessage: 'El payload del evento preventivo debe ser un objeto JSON no nulo.'
    };
  }

  const p = rawPayload as Record<string, any>;

  // 1. Validar machine_id
  if (!p.machine_id || typeof p.machine_id !== 'string' || p.machine_id.trim().length === 0) {
    return {
      isValid: false,
      errorCode: 'MISSING_REQUIRED_DATA',
      errorMessage: 'El campo "machine_id" es obligatorio y no puede estar vacío.'
    };
  }

  // 2. Validar scheduled_date
  if (!p.scheduled_date || typeof p.scheduled_date !== 'string') {
    return {
      isValid: false,
      errorCode: 'MISSING_REQUIRED_DATA',
      errorMessage: 'El campo "scheduled_date" es obligatorio.'
    };
  }

  const dateObj = new Date(p.scheduled_date);
  if (isNaN(dateObj.getTime())) {
    return {
      isValid: false,
      errorCode: 'INVALID_DATE',
      errorMessage: `La fecha programada "${p.scheduled_date}" no es una fecha válida.`
    };
  }

  // 3. Validar year
  if (typeof p.year !== 'number' || isNaN(p.year) || p.year < 2000 || p.year > 2100) {
    return {
      isValid: false,
      errorCode: 'MISSING_REQUIRED_DATA',
      errorMessage: 'El campo "year" debe ser un año numérico válido (entre 2000 y 2100).'
    };
  }

  // 4. Validar concordancia year vs scheduled_date (PRD §14)
  const scheduledYear = dateObj.getUTCFullYear();
  if (p.year !== scheduledYear) {
    return {
      isValid: false,
      errorCode: 'PREVENTIVE_YEAR_MISMATCH',
      errorMessage: `Inconsistencia de año: el campo year (${p.year}) no coincide con el año de scheduled_date (${scheduledYear}).`
    };
  }

  // 5. Validar service_code
  if (!p.service_code || typeof p.service_code !== 'string' || p.service_code.trim().length === 0) {
    return {
      isValid: false,
      errorCode: 'MISSING_REQUIRED_DATA',
      errorMessage: 'El campo "service_code" es obligatorio.'
    };
  }

  // 6. Validar calendar_reference
  if (!p.calendar_reference || typeof p.calendar_reference !== 'string' || p.calendar_reference.trim().length === 0) {
    return {
      isValid: false,
      errorCode: 'MISSING_REQUIRED_DATA',
      errorMessage: 'El campo "calendar_reference" es obligatorio para mantener la trazabilidad con AG-002.'
    };
  }

  // 7. Sanitizar piezas planificadas si existen
  let cleanParts: PlannedPartReference[] = [];
  if (Array.isArray(p.planned_parts)) {
    cleanParts = p.planned_parts
      .filter((pt: any) => pt && typeof pt.part_code === 'string' && pt.part_code.trim().length > 0)
      .map((pt: any) => ({
        part_code: String(pt.part_code).trim().toUpperCase(),
        part_name: pt.part_name ? String(pt.part_name).trim() : undefined,
        quantity: typeof pt.quantity === 'number' && pt.quantity > 0 ? pt.quantity : 1,
        estimated_unit_cost: typeof pt.estimated_unit_cost === 'number' ? pt.estimated_unit_cost : undefined,
        source: pt.source ? String(pt.source).trim() : 'AG-002'
      }));
  }

  const cleanedPayload: PreventiveSchedulePayload = {
    contract_id: PREVENTIVE_SCHEDULE_CONTRACT_ID,
    contract_version: PREVENTIVE_SCHEDULE_CONTRACT_VERSION,
    machine_id: String(p.machine_id).trim().toUpperCase(),
    scheduled_date: p.scheduled_date,
    year: p.year,
    service_code: String(p.service_code).trim().toUpperCase(),
    calendar_reference: String(p.calendar_reference).trim(),
    source_reference: p.source_reference ? String(p.source_reference).trim() : 'AG-002',
    department: p.department ? (String(p.department).trim().toUpperCase() as DepartmentCode) : undefined,
    description: p.description ? String(p.description).trim() : undefined,
    planned_parts: cleanParts,
    estimated_duration_min: typeof p.estimated_duration_min === 'number' ? p.estimated_duration_min : undefined
  };

  return {
    isValid: true,
    cleanedPayload
  };
}
