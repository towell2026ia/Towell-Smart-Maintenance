// supabase/functions/agents-orchestrator/agents/ag009/ag009_3/contracts/corrective-request.contract.ts
// Canonical Contract Validator for CORRECTIVE-REQUEST-001 (§7, §8, §9, §10 PRD)

import { CorrectiveRequest, CorrectiveSource, DepartmentCode } from '../../types/ag009.types.ts';
import { CorrectiveErrorCode } from '../errors/corrective-error-catalog.ts';

export interface CorrectiveContractValidationResult {
  isValid: boolean;
  cleanedPayload?: CorrectiveRequest;
  errorCode?: CorrectiveErrorCode;
  errorMessage?: string;
}

const AUTHORIZED_SOURCES: CorrectiveSource[] = [
  'PORTAL',
  'TELEGRAM',
  'AUTONOMO',
  'PREDICTIVO',
  'ALERTA',
  'TECNICO',
  'ADMIN',
  'FORMULARIO'
];

const VALID_DEPARTMENTS: DepartmentCode[] = ['PF', 'CF', 'TF', 'AF'];
const VALID_PRIORITIES = ['CRITICA', 'ALTA', 'MEDIA', 'BAJA'];

export function validateCorrectiveRequestContract(raw: any): CorrectiveContractValidationResult {
  if (!raw || typeof raw !== 'object') {
    return {
      isValid: false,
      errorCode: 'INVALID_CONTRACT',
      errorMessage: 'El payload debe ser un objeto JSON válido.'
    };
  }

  // 1. Validar Fuente (§4 PRD)
  const rawSource = String(raw.source || raw.origen || '').trim().toUpperCase() as CorrectiveSource;
  if (!rawSource || !AUTHORIZED_SOURCES.includes(rawSource)) {
    return {
      isValid: false,
      errorCode: 'INVALID_SOURCE',
      errorMessage: `Fuente de solicitud inválida: "${raw.source}". Fuentes autorizadas: ${AUTHORIZED_SOURCES.join(', ')}.`
    };
  }

  // 2. Validar Máquina (§10, §11 PRD)
  const rawMachine = String(raw.machine_id || raw.maquina_id || raw.maquina || '').trim().toUpperCase();
  if (!rawMachine) {
    return {
      isValid: false,
      errorCode: 'MISSING_REQUIRED_DATA',
      errorMessage: 'El campo "machine_id" (máquina de planta) es obligatorio.'
    };
  }

  // 3. Validar Departamento (§10, §12 PRD)
  const rawDept = String(raw.department_code || raw.area || raw.departamento_codigo || raw.departamento || '').trim().toUpperCase() as DepartmentCode;
  if (!rawDept) {
    return {
      isValid: false,
      errorCode: 'MISSING_REQUIRED_DATA',
      errorMessage: 'El campo "department_code" (departamento de planta) es obligatorio.'
    };
  }
  if (!VALID_DEPARTMENTS.includes(rawDept)) {
    return {
      isValid: false,
      errorCode: 'DEPARTMENT_NOT_FOUND',
      errorMessage: `Código de departamento inválido: "${rawDept}". Departamentos permitidos: ${VALID_DEPARTMENTS.join(', ')}.`
    };
  }

  // 4. Validar Descripción / Falla (§10 PRD)
  const rawDesc = String(raw.description || raw.falla || raw.descripcion_problema || raw.motivo || '').trim();
  if (!rawDesc) {
    return {
      isValid: false,
      errorCode: 'MISSING_REQUIRED_DATA',
      errorMessage: 'La descripción de la falla o motivo de intervención es obligatorio.'
    };
  }

  // 5. Validar Solicitante / Requester (§10 PRD)
  const rawRequester = String(raw.requester_reference || raw.solicitante || raw.solicitado_por || raw.cve_empleado || '').trim();
  if (!rawRequester) {
    return {
      isValid: false,
      errorCode: 'MISSING_REQUIRED_DATA',
      errorMessage: 'La referencia del solicitante ("requester_reference") es obligatoria.'
    };
  }

  // 6. Normalizar Fecha de Solicitud (§10 PRD)
  let requestedAt = String(raw.requested_at || raw.fecha_solicitud || raw.fecha || raw.created_at || '').trim();
  if (!requestedAt) {
    requestedAt = new Date().toISOString();
  } else {
    const d = new Date(requestedAt);
    if (!isNaN(d.getTime())) {
      requestedAt = d.toISOString();
    }
  }

  // 7. Normalizar Prioridad (§61 PRD)
  let priority = String(raw.priority || raw.prioridad || 'MEDIA').trim().toUpperCase() as 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAJA';
  if (!VALID_PRIORITIES.includes(priority)) {
    priority = 'MEDIA';
  }

  // 8. Correlación
  const correlationId = String(raw.correlation_id || raw.id_correlacion || `corr-corr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`).trim();
  const requestId = String(raw.request_id || raw.id_solicitud || raw.id || `REQ-CORR-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`).trim();

  const cleanedPayload: CorrectiveRequest = {
    contract_id: 'CORRECTIVE-REQUEST-001',
    contract_version: '1.0',
    request_id: requestId,
    source: rawSource,
    source_reference: raw.source_reference ? String(raw.source_reference).trim() : undefined,
    machine_id: rawMachine,
    department_code: rawDept,
    description: rawDesc,
    priority: priority,
    requested_at: requestedAt,
    requester_reference: rawRequester,
    contact_info: raw.contact_info || raw.contacto || undefined,
    telegram_metadata: raw.telegram_metadata || undefined,
    autonomous_metadata: raw.autonomous_metadata || undefined,
    predictive_metadata: raw.predictive_metadata || undefined,
    alert_metadata: raw.alert_metadata || undefined,
    evidence_reference: raw.evidence_reference || raw.evidencia || undefined,
    planned_parts: Array.isArray(raw.planned_parts) ? raw.planned_parts : undefined,
    correlation_id: correlationId
  };

  return {
    isValid: true,
    cleanedPayload
  };
}
