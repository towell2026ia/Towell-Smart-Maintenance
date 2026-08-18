// supabase/functions/agents-orchestrator/agents/ag009/ag009_3/contracts/predictive-finding.contract.ts
// Canonical Contract Validator for PREDICTIVE-FINDING-001 (§20, §21, §22 PRD)

import { PredictiveFinding, PredictiveBlock } from '../../types/ag009.types.ts';
import { CorrectiveErrorCode } from '../errors/corrective-error-catalog.ts';

export interface PredictiveContractValidationResult {
  isValid: boolean;
  cleanedPayload?: PredictiveFinding;
  errorCode?: CorrectiveErrorCode;
  errorMessage?: string;
}

const VALID_PREDICTIVE_BLOCKS: PredictiveBlock[] = [
  'Electrónico',
  'Mecánico',
  'Limpieza',
  'Lubricación'
];

export function validatePredictiveFindingContract(raw: any): PredictiveContractValidationResult {
  if (!raw || typeof raw !== 'object') {
    return {
      isValid: false,
      errorCode: 'INVALID_CONTRACT',
      errorMessage: 'El payload de hallazgo predictivo debe ser un objeto JSON válido.'
    };
  }

  // 1. Validar Máquina (§20 PRD)
  const rawMachine = String(raw.machine_id || raw.maquina_id || raw.maquina || '').trim().toUpperCase();
  if (!rawMachine) {
    return {
      isValid: false,
      errorCode: 'MISSING_REQUIRED_DATA',
      errorMessage: 'El campo "machine_id" es obligatorio en el hallazgo predictivo.'
    };
  }

  // 2. Validar Bloque Predictivo (§22 PRD: 4 bloques permitidos)
  const rawBlock = String(raw.block || raw.bloque || '').trim();
  const matchedBlock = VALID_PREDICTIVE_BLOCKS.find(b => b.toLowerCase() === rawBlock.toLowerCase());
  if (!matchedBlock) {
    return {
      isValid: false,
      errorCode: 'INVALID_CONTRACT',
      errorMessage: `Bloque predictivo inválido: "${rawBlock}". Bloques válidos: ${VALID_PREDICTIVE_BLOCKS.join(', ')}.`
    };
  }

  // 3. Validar Hallazgo / Anomalía (§20 PRD)
  const rawFinding = String(raw.finding || raw.hallazgo || raw.description || raw.descripcion || '').trim();
  if (!rawFinding) {
    return {
      isValid: false,
      errorCode: 'MISSING_REQUIRED_DATA',
      errorMessage: 'La descripción del hallazgo predictivo ("finding") es obligatoria.'
    };
  }

  // 4. Referencia de Levantamiento / Inspección (§20 PRD)
  const surveyRef = String(raw.survey_reference || raw.levantamiento_id || `LEV-PRED-${rawMachine}-${Date.now()}`).trim();

  // 5. Severidad
  const severity = String(raw.severity || raw.severidad || 'MEDIA').trim().toUpperCase() as 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAJA';

  const correlationId = String(raw.correlation_id || `corr-pred-${Date.now()}`).trim();
  const findingId = String(raw.finding_id || raw.id || `FIND-PRED-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`).trim();

  const cleanedPayload: PredictiveFinding = {
    contract_id: 'PREDICTIVE-FINDING-001',
    contract_version: '1.0',
    finding_id: findingId,
    machine_id: rawMachine,
    survey_reference: surveyRef,
    block: matchedBlock,
    finding: rawFinding,
    severity: ['CRITICA', 'ALTA', 'MEDIA', 'BAJA'].includes(severity) ? severity : 'MEDIA',
    source_metric: raw.source_metric || raw.metrica || undefined,
    metric_value: raw.metric_value !== undefined ? raw.metric_value : undefined,
    threshold_exceeded: raw.threshold_exceeded || undefined,
    evidence: raw.evidence || raw.evidencia || undefined,
    correlation_id: correlationId,
    detected_at: raw.detected_at || raw.fecha_deteccion || new Date().toISOString()
  };

  return {
    isValid: true,
    cleanedPayload
  };
}
