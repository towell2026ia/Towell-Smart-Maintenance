// supabase/functions/agents-orchestrator/agents/ag009/ag009_3/normalizers/corrective-request-normalizer.ts
// Deterministic Multi-Source Normalizer for AG-009.3 (§8, §13-26 PRD)

import {
  CorrectiveRequest,
  CorrectiveSource,
  DepartmentCode,
  AutonomousFinding,
  PredictiveFinding
} from '../../types/ag009.types.ts';
import { validateCorrectiveRequestContract } from '../contracts/corrective-request.contract.ts';
import { validatePredictiveFindingContract } from '../contracts/predictive-finding.contract.ts';
import { CorrectiveConnectorError } from '../errors/corrective-error-catalog.ts';

// Determinar código de departamento canónico por nombre o código de máquina
export function inferDepartmentFromMachineOrArea(machineId: string, areaHint?: string): DepartmentCode {
  const m = String(machineId || '').toUpperCase().trim();
  const a = String(areaHint || '').toUpperCase().trim();

  if (a === 'PF' || a === 'PRODUCCION' || a === 'PRODUCCIÓN' || a === 'TEJEDURIA' || a === 'URDIDO') return 'PF';
  if (a === 'CF' || a === 'COSTURA' || a === 'CORTE' || a === 'CONFECCION') return 'CF';
  if (a === 'TF' || a === 'TINTORERIA' || a === 'TINTORERÍA' || a === 'ACABADO' || a === 'QUIMICA') return 'TF';
  if (a === 'AF' || a === 'ADMINISTRATIVO' || a === 'SERVICIOS' || a === 'CALIDAD') return 'AF';

  // Fallback por máquina
  if (m.includes('TEJI') || m.includes('URDI') || m.includes('MACC') || m.includes('ENG')) return 'PF';
  if (m.includes('CORT') || m.includes('COS') || m.includes('DOBL') || m.includes('CONFE') || m.includes('DETMET') || m.includes('SUBL')) return 'CF';
  if (m.includes('TINT') || m.includes('JET') || m.includes('SECA') || m.includes('OVER') || m.includes('CAMP') || m.includes('CALD') || m.includes('ABRI') || m.includes('RAMA') || m.includes('BARC') || m.includes('POZO') || m.includes('AGUA')) return 'TF';

  return 'AF';
}

export function normalizePortalRequest(raw: any, correlationId: string): CorrectiveRequest {
  const machine = String(raw.machine_id || raw.maquina_id || raw.maquina || '').trim().toUpperCase();
  const dept = inferDepartmentFromMachineOrArea(machine, raw.department_code || raw.area);
  const desc = String(raw.description || raw.descripcion || raw.falla || '').trim();
  const requester = String(raw.requester_reference || raw.solicitante || raw.solicitado_por || raw.nombre || 'Portal Solicitante').trim();
  const requestedAt = raw.requested_at || raw.fecha_solicitud || new Date().toISOString();

  const reqObj: Partial<CorrectiveRequest> = {
    contract_id: 'CORRECTIVE-REQUEST-001',
    contract_version: '1.0',
    request_id: raw.request_id || raw.id || `REQ-PORTAL-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    source: 'PORTAL',
    source_reference: raw.source_reference || raw.folio_portal || raw.id,
    machine_id: machine,
    department_code: dept,
    description: desc,
    priority: raw.priority || raw.prioridad || 'MEDIA',
    requested_at: requestedAt,
    requester_reference: requester,
    contact_info: raw.contact_info || raw.contacto || raw.telefono || raw.correo,
    evidence_reference: raw.evidence_reference || raw.evidencia || raw.archivo,
    correlation_id: correlationId
  };

  const val = validateCorrectiveRequestContract(reqObj);
  if (!val.isValid || !val.cleanedPayload) {
    throw new CorrectiveConnectorError(val.errorCode || 'INVALID_CONTRACT', val.errorMessage || 'Portal request inválido');
  }
  return val.cleanedPayload;
}

export function normalizeTelegramEvent(raw: any, correlationId: string): CorrectiveRequest {
  const machine = String(raw.machine_id || raw.maquina_id || raw.maquina || raw.id_telar || '').trim().toUpperCase();
  const dept = inferDepartmentFromMachineOrArea(machine, raw.department_code || raw.area || 'PF');
  const desc = String(raw.description || raw.falla || raw.descripcion || raw.observaciones || '').trim();
  const requester = String(raw.requester_reference || raw.solicitante || raw.operador || raw.cve_empleado || 'Operador Telegram').trim();
  
  const idOriginal = String(raw.id_original || raw.telegram_metadata?.id_original || raw.id || '').trim();
  const folioOriginal = String(raw.folio_original || raw.telegram_metadata?.folio_original || raw.folio || '').trim();

  const reqObj: Partial<CorrectiveRequest> = {
    contract_id: 'CORRECTIVE-REQUEST-001',
    contract_version: '1.0',
    request_id: raw.request_id || `REQ-TG-${idOriginal || Date.now()}`,
    source: 'TELEGRAM',
    source_reference: idOriginal || folioOriginal || undefined,
    machine_id: machine,
    department_code: dept,
    description: desc,
    priority: raw.priority || (desc.toLowerCase().includes('paro') ? 'ALTA' : 'MEDIA'),
    requested_at: raw.requested_at || raw.fecha_hora || raw.fecha || new Date().toISOString(),
    requester_reference: requester,
    telegram_metadata: {
      id_original: idOriginal || undefined,
      folio_original: folioOriginal || undefined,
      chat_id: raw.chat_id || raw.telegram_chat_id || raw.telegram_metadata?.chat_id || undefined,
      staging_reference: raw.staging_reference || raw.telegram_metadata?.staging_reference || 'stg_telegram_ordenes_telares'
    },
    correlation_id: correlationId
  };

  const val = validateCorrectiveRequestContract(reqObj);
  if (!val.isValid || !val.cleanedPayload) {
    throw new CorrectiveConnectorError(val.errorCode || 'INVALID_CONTRACT', val.errorMessage || 'Telegram event inválido');
  }
  return val.cleanedPayload;
}

export function normalizeAutonomousFinding(finding: AutonomousFinding | any, correlationId: string): CorrectiveRequest {
  const machine = String(finding.machine_id || finding.maquina_id || '').trim().toUpperCase();
  const dept = inferDepartmentFromMachineOrArea(machine, finding.department_code || finding.area);
  const desc = `[Hallazgo Autónomo - ${finding.block || 'Inspección'}] ${finding.finding_description || finding.description || finding.finding_code || 'Anomalía detectada en rutina autónoma'}`;
  
  const reqObj: Partial<CorrectiveRequest> = {
    contract_id: 'CORRECTIVE-REQUEST-001',
    contract_version: '1.0',
    request_id: `REQ-AUT-${finding.finding_id || Date.now()}`,
    source: 'AUTONOMO',
    source_reference: finding.finding_id || finding.survey_reference,
    machine_id: machine,
    department_code: dept,
    description: desc,
    priority: finding.severity === 'CRITICA' ? 'CRITICA' : (finding.severity === 'ALTA' ? 'ALTA' : 'MEDIA'),
    requested_at: finding.detected_at || new Date().toISOString(),
    requester_reference: `AG-009.2 / Autónomo (${finding.survey_reference || 'Semanal'})`,
    autonomous_metadata: {
      finding_id: finding.finding_id,
      survey_reference: finding.survey_reference,
      block: finding.block
    },
    evidence_reference: finding.evidence_reference,
    correlation_id: correlationId
  };

  const val = validateCorrectiveRequestContract(reqObj);
  if (!val.isValid || !val.cleanedPayload) {
    throw new CorrectiveConnectorError(val.errorCode || 'INVALID_CONTRACT', val.errorMessage || 'Autonomous finding inválido');
  }
  return val.cleanedPayload;
}

export function normalizePredictiveFinding(raw: any, correlationId: string): CorrectiveRequest {
  const valPred = validatePredictiveFindingContract(raw);
  if (!valPred.isValid || !valPred.cleanedPayload) {
    throw new CorrectiveConnectorError(valPred.errorCode || 'INVALID_CONTRACT', valPred.errorMessage || 'Predictive finding inválido');
  }

  const pred = valPred.cleanedPayload;
  const machine = pred.machine_id;
  const dept = inferDepartmentFromMachineOrArea(machine);
  const desc = `[Alerta Predictiva - ${pred.block}] ${pred.finding}${pred.threshold_exceeded ? ` (Umbral excedido: ${pred.threshold_exceeded})` : ''}`;

  const reqObj: Partial<CorrectiveRequest> = {
    contract_id: 'CORRECTIVE-REQUEST-001',
    contract_version: '1.0',
    request_id: `REQ-PRED-${pred.finding_id}`,
    source: 'PREDICTIVO',
    source_reference: pred.finding_id,
    machine_id: machine,
    department_code: dept,
    description: desc,
    priority: pred.severity === 'CRITICA' ? 'CRITICA' : (pred.severity === 'ALTA' ? 'ALTA' : 'MEDIA'),
    requested_at: pred.detected_at,
    requester_reference: `AG-003 / Predictivo (${pred.survey_reference})`,
    predictive_metadata: {
      finding_id: pred.finding_id,
      survey_reference: pred.survey_reference,
      block: pred.block,
      source_metric: pred.source_metric
    },
    evidence_reference: pred.evidence,
    correlation_id: correlationId
  };

  const val = validateCorrectiveRequestContract(reqObj);
  if (!val.isValid || !val.cleanedPayload) {
    throw new CorrectiveConnectorError(val.errorCode || 'INVALID_CONTRACT', val.errorMessage || 'Predictive payload normalizado inválido');
  }
  return val.cleanedPayload;
}

export function normalizeAlertEvent(raw: any, correlationId: string): CorrectiveRequest {
  const machine = String(raw.machine_id || raw.maquina_id || '').trim().toUpperCase();
  const dept = inferDepartmentFromMachineOrArea(machine, raw.department_code || raw.area);
  const alertId = String(raw.alert_id || raw.id_alerta || raw.id || `ALERT-${Date.now()}`).trim();
  const desc = `[Alerta Operativa AG-008] ${raw.description || raw.mensaje || raw.titulo || 'Condición anómala reportada por sistema de alertas'}`;

  const reqObj: Partial<CorrectiveRequest> = {
    contract_id: 'CORRECTIVE-REQUEST-001',
    contract_version: '1.0',
    request_id: `REQ-ALERTA-${alertId}`,
    source: 'ALERTA',
    source_reference: alertId,
    machine_id: machine,
    department_code: dept,
    description: desc,
    priority: raw.severity === 'CRITICA' ? 'CRITICA' : (raw.severity === 'ALTA' ? 'ALTA' : 'MEDIA'),
    requested_at: raw.requested_at || raw.fecha || new Date().toISOString(),
    requester_reference: `AG-008 / Sistema Alertas (${alertId})`,
    alert_metadata: {
      alert_id: alertId,
      severity: raw.severity
    },
    correlation_id: correlationId
  };

  const val = validateCorrectiveRequestContract(reqObj);
  if (!val.isValid || !val.cleanedPayload) {
    throw new CorrectiveConnectorError(val.errorCode || 'INVALID_CONTRACT', val.errorMessage || 'Alert event inválido');
  }
  return val.cleanedPayload;
}

export function normalizeStaffOrFormRequest(raw: any, source: CorrectiveSource, correlationId: string): CorrectiveRequest {
  const machine = String(raw.machine_id || raw.maquina_id || raw.maquina || '').trim().toUpperCase();
  const dept = inferDepartmentFromMachineOrArea(machine, raw.department_code || raw.area);
  const desc = String(raw.description || raw.falla || raw.descripcion || '').trim();
  const requester = String(raw.requester_reference || raw.solicitante || raw.cve_empleado || raw.cve_tecnico || 'Personal Planta').trim();

  const reqObj: Partial<CorrectiveRequest> = {
    contract_id: 'CORRECTIVE-REQUEST-001',
    contract_version: '1.0',
    request_id: raw.request_id || `REQ-${source}-${Date.now()}`,
    source: source,
    source_reference: raw.source_reference || raw.form_id || undefined,
    machine_id: machine,
    department_code: dept,
    description: desc,
    priority: raw.priority || 'MEDIA',
    requested_at: raw.requested_at || new Date().toISOString(),
    requester_reference: requester,
    contact_info: raw.contact_info || raw.contacto || undefined,
    evidence_reference: raw.evidence_reference || raw.evidencia || undefined,
    planned_parts: raw.planned_parts || undefined,
    correlation_id: correlationId
  };

  const val = validateCorrectiveRequestContract(reqObj);
  if (!val.isValid || !val.cleanedPayload) {
    throw new CorrectiveConnectorError(val.errorCode || 'INVALID_CONTRACT', val.errorMessage || `${source} request inválido`);
  }
  return val.cleanedPayload;
}

export function normalizeToCorrectiveRequest(raw: any, correlationId: string): CorrectiveRequest {
  if (!raw || typeof raw !== 'object') {
    throw new CorrectiveConnectorError('INVALID_CONTRACT', 'Payload no es un objeto válido');
  }

  // 1. Si ya es un CORRECTIVE-REQUEST-001 válido
  if (raw.contract_id === 'CORRECTIVE-REQUEST-001') {
    const val = validateCorrectiveRequestContract(raw);
    if (!val.isValid || !val.cleanedPayload) {
      throw new CorrectiveConnectorError(val.errorCode || 'INVALID_CONTRACT', val.errorMessage || 'Contrato inválido');
    }
    return val.cleanedPayload;
  }

  // 2. Si es AUTONOMOUS-FINDING-001
  if (raw.contract_id === 'AUTONOMOUS-FINDING-001' || (raw.finding_code || raw.block && raw.survey_reference && raw.severity)) {
    return normalizeAutonomousFinding(raw, correlationId);
  }

  // 3. Si es PREDICTIVE-FINDING-001
  if (raw.contract_id === 'PREDICTIVE-FINDING-001' || (raw.block && (raw.block === 'Electrónico' || raw.block === 'Mecánico' || raw.block === 'Limpieza' || raw.block === 'Lubricación') && raw.finding)) {
    return normalizePredictiveFinding(raw, correlationId);
  }

  // 4. Determinar por campo source / origen explícito
  const source = String(raw.source || raw.origen || '').trim().toUpperCase() as CorrectiveSource;

  if (source === 'PORTAL' || raw.folio_portal) {
    return normalizePortalRequest(raw, correlationId);
  }
  if (source === 'TELEGRAM' || raw.id_telar || raw.id_original || raw.telegram_metadata) {
    return normalizeTelegramEvent(raw, correlationId);
  }
  if (source === 'AUTONOMO') {
    return normalizeAutonomousFinding(raw, correlationId);
  }
  if (source === 'PREDICTIVO') {
    return normalizePredictiveFinding(raw, correlationId);
  }
  if (source === 'ALERTA' || raw.alert_id) {
    return normalizeAlertEvent(raw, correlationId);
  }
  if (source === 'TECNICO' || source === 'ADMIN' || source === 'FORMULARIO') {
    return normalizeStaffOrFormRequest(raw, source, correlationId);
  }

  // Fallback estándar con validación estricta
  const val = validateCorrectiveRequestContract(raw);
  if (!val.isValid || !val.cleanedPayload) {
    throw new CorrectiveConnectorError(val.errorCode || 'INVALID_CONTRACT', val.errorMessage || 'Payload no normalizable');
  }
  return val.cleanedPayload;
}
