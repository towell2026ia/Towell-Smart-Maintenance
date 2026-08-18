// supabase/functions/agents-orchestrator/agents/ag004/builders/autonomous-finding-contract-builder.ts
// Strict Contract Builder for AUTONOMOUS-FINDING-001 (v1.0 Frozen)

import { AutonomousFindingContractPayload, AutonomousBlock, FindingSeverity } from '../types/ag004.types.ts';
import { buildAutonomousFindingCode, buildAutonomousFindingId } from '../rules/finding.rules.ts';

export interface CreateFindingInput {
  machineId: string;
  surveyReference: string;
  calendarReference: string;
  weekReference: string | number;
  year?: number;
  itemCode: string;
  findingDescription: string;
  block: AutonomousBlock;
  severity?: FindingSeverity;
  evidenceReference?: string;
  correlationId: string;
  sequenceIndex?: number;
}

export function buildAutonomousFindingContract(input: CreateFindingInput): AutonomousFindingContractPayload {
  const normMachine = String(input.machineId).trim().toUpperCase();
  const findingId = buildAutonomousFindingId(normMachine, input.weekReference, input.itemCode, input.sequenceIndex || 1);
  const findingCode = buildAutonomousFindingCode(input.block, input.itemCode);

  return {
    contract_id: 'AUTONOMOUS-FINDING-001',
    contract_version: '1.0',
    finding_id: findingId,
    machine_id: normMachine,
    survey_reference: input.surveyReference,
    calendar_reference: input.calendarReference,
    week_reference: input.weekReference,
    year: input.year || new Date().getUTCFullYear(),
    finding_code: findingCode,
    finding_description: input.findingDescription,
    block: input.block,
    severity: input.severity || 'MEDIA',
    evidence_reference: input.evidenceReference,
    source_reference: 'AUTONOMO',
    correlation_id: input.correlationId,
    detected_at: new Date().toISOString()
  };
}
