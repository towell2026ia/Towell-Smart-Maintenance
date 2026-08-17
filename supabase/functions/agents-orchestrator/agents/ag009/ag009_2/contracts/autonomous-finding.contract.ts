// supabase/functions/agents-orchestrator/agents/ag009/ag009_2/contracts/autonomous-finding.contract.ts
// Strict Contract Definition & Factory for AUTONOMOUS-FINDING-001 v1.0

import { AutonomousFinding, AutonomousBlock } from '../../types/ag009.types.ts';

export interface CreateFindingParams {
  machine_id: string;
  survey_reference: string;
  calendar_reference: string;
  week_reference: string | number;
  year?: number;
  item_code: string;
  finding_description: string;
  block: AutonomousBlock;
  severity?: 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAJA';
  evidence_reference?: string;
  correlation_id: string;
  sequenceIndex?: number;
}

export function buildAutonomousFinding(params: CreateFindingParams): AutonomousFinding {
  const normMachine = String(params.machine_id).trim().toUpperCase();
  const weekStr = String(params.week_reference).replace(/[^0-9a-zA-Z]/g, '');
  const seq = params.sequenceIndex !== undefined ? String(params.sequenceIndex + 1).padStart(2, '0') : '01';
  const findingId = `FND-${normMachine}-W${weekStr}-${params.item_code}-${seq}`;

  return {
    contract_id: 'AUTONOMOUS-FINDING-001',
    contract_version: '1.0',
    finding_id: findingId,
    machine_id: normMachine,
    survey_reference: params.survey_reference,
    calendar_reference: params.calendar_reference,
    week_reference: params.week_reference,
    year: params.year || new Date().getUTCFullYear(),
    finding_code: `ANOMALIA_${params.block.toUpperCase()}_${params.item_code}`,
    finding_description: params.finding_description,
    block: params.block,
    severity: params.severity || 'MEDIA',
    evidence_reference: params.evidence_reference,
    source_reference: 'AUTONOMO',
    correlation_id: params.correlation_id,
    detected_at: new Date().toISOString()
  };
}

export function validateAutonomousFindingContract(finding: any): { isValid: boolean; error?: string } {
  if (!finding || typeof finding !== 'object') {
    return { isValid: false, error: 'Finding payload is not an object.' };
  }
  if (finding.contract_id !== 'AUTONOMOUS-FINDING-001') {
    return { isValid: false, error: `Invalid contract_id: expected AUTONOMOUS-FINDING-001, got ${finding.contract_id}` };
  }
  if (!finding.finding_id || typeof finding.finding_id !== 'string') {
    return { isValid: false, error: 'finding_id is missing or invalid.' };
  }
  if (!finding.machine_id || typeof finding.machine_id !== 'string') {
    return { isValid: false, error: 'machine_id is missing or invalid.' };
  }
  if (!finding.block || typeof finding.block !== 'string') {
    return { isValid: false, error: 'block is missing.' };
  }
  if (!finding.finding_description || typeof finding.finding_description !== 'string') {
    return { isValid: false, error: 'finding_description is missing.' };
  }
  if (!finding.correlation_id || typeof finding.correlation_id !== 'string') {
    return { isValid: false, error: 'correlation_id is missing.' };
  }
  return { isValid: true };
}
