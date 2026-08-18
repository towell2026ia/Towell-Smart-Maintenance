// supabase/functions/agents-orchestrator/agents/ag009/ag009_3/contracts/subtask-request.contract.ts
// Canonical Contract Validator for SUBTASK-REQUEST-001 (§46, §47, §48 PRD)

import { SubtaskRequest, SubtaskArea } from '../../types/ag009.types.ts';
import { CorrectiveErrorCode } from '../errors/corrective-error-catalog.ts';

export interface SubtaskContractValidationResult {
  isValid: boolean;
  cleanedPayload?: SubtaskRequest;
  errorCode?: CorrectiveErrorCode;
  errorMessage?: string;
}

const VALID_SUBTASK_AREAS: SubtaskArea[] = [
  'Mecánico',
  'Eléctrico',
  'Electrónico',
  'Lubricación',
  'Limpieza',
  'Ajuste',
  'Servicio Externo',
  'Refacciones',
  'Otro'
];

export function validateSubtaskRequestContract(raw: any): SubtaskContractValidationResult {
  if (!raw || typeof raw !== 'object') {
    return {
      isValid: false,
      errorCode: 'INVALID_CONTRACT',
      errorMessage: 'El payload de subtarea debe ser un objeto JSON válido.'
    };
  }

  // 1. Validar OT Padre (§48 PRD)
  const rawParentOT = String(raw.parent_ot_reference || raw.id_orden_padre || raw.otId || raw.parent_ot || '').trim();
  if (!rawParentOT) {
    return {
      isValid: false,
      errorCode: 'MISSING_REQUIRED_DATA',
      errorMessage: 'La referencia de la Orden de Trabajo padre ("parent_ot_reference") es obligatoria.'
    };
  }

  // 2. Validar Área / Especialidad Requerida (§45, §48 PRD)
  let rawArea = String(raw.requested_area || raw.area || raw.especialidad || '').trim();
  // Normalizar capitalización
  const matchedArea = VALID_SUBTASK_AREAS.find(a => a.toLowerCase() === rawArea.toLowerCase());
  if (!matchedArea) {
    return {
      isValid: false,
      errorCode: 'INVALID_SUBTASK_REQUEST',
      errorMessage: `Área de subtarea inválida: "${rawArea}". Áreas permitidas: ${VALID_SUBTASK_AREAS.join(', ')}.`
    };
  }

  // 3. Validar Descripción (§48 PRD)
  const rawDesc = String(raw.description || raw.descripcion || raw.actividad || raw.title || '').trim();
  if (!rawDesc) {
    return {
      isValid: false,
      errorCode: 'MISSING_REQUIRED_DATA',
      errorMessage: 'La descripción de la actividad de subtarea es obligatoria.'
    };
  }

  // 4. Validar Solicitante / Técnico (§48 PRD)
  const rawRequester = String(raw.requested_by || raw.solicitado_por || raw.cve_tecnico || raw.tecnico || '').trim();
  if (!rawRequester) {
    return {
      isValid: false,
      errorCode: 'MISSING_REQUIRED_DATA',
      errorMessage: 'La referencia del técnico o usuario que solicita la subtarea ("requested_by") es obligatoria.'
    };
  }

  // 5. Normalizar Fecha Requerida (§48 PRD)
  let requestedDate = String(raw.requested_date || raw.dueDate || raw.fecha_compromiso || '').trim();
  if (!requestedDate) {
    requestedDate = new Date().toISOString();
  }

  // 6. Correlación e Identificador
  const correlationId = String(raw.correlation_id || raw.id_correlacion || `corr-sub-${Date.now()}`).trim();
  const subtaskId = String(raw.subtask_id || raw.id || `SUB-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`).trim();

  const cleanedPayload: SubtaskRequest = {
    contract_id: 'SUBTASK-REQUEST-001',
    contract_version: '1.0',
    subtask_id: subtaskId,
    parent_ot_reference: rawParentOT,
    requested_area: matchedArea,
    requested_date: requestedDate,
    requested_by: rawRequester,
    description: rawDesc,
    priority: raw.priority || 'MEDIA',
    reason: raw.reason || raw.motivo || undefined,
    requires_paro: Boolean(raw.requires_paro || raw.requiresParo),
    requires_parts: Boolean(raw.requires_parts || raw.requiresPart),
    evidence_reference: raw.evidence_reference || raw.evidence || undefined,
    correlation_id: correlationId,
    created_at: raw.created_at || new Date().toISOString()
  };

  return {
    isValid: true,
    cleanedPayload
  };
}
