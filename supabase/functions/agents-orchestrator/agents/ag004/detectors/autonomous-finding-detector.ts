// supabase/functions/agents-orchestrator/agents/ag004/detectors/autonomous-finding-detector.ts
// Autonomous Finding Detector for AG-004

import { AutonomousSurveyResponses, AutonomousFindingContractPayload } from '../types/ag004.types.ts';
import { evaluateBlockAnomalies } from '../evaluators/autonomous-reference-evaluator.ts';
import { buildAutonomousFindingContract } from '../builders/autonomous-finding-contract-builder.ts';

export interface FindingDetectionResult {
  hasFindings: boolean;
  findings: AutonomousFindingContractPayload[];
}

export function detectAutonomousFindings(
  responses: AutonomousSurveyResponses,
  surveyReference: string,
  calendarReference: string,
  weekReference: string | number,
  isoYear: number,
  correlationId: string
): FindingDetectionResult {
  const anomalies = evaluateBlockAnomalies(responses);

  if (anomalies.length === 0) {
    return {
      hasFindings: false,
      findings: []
    };
  }

  const findings: AutonomousFindingContractPayload[] = anomalies.map((anomaly, idx) => {
    return buildAutonomousFindingContract({
      machineId: responses.machine_id,
      surveyReference,
      calendarReference,
      weekReference,
      year: isoYear,
      itemCode: anomaly.itemCode,
      findingDescription: anomaly.description,
      block: anomaly.block,
      severity: anomaly.severity,
      evidenceReference: responses.evidence_url || undefined,
      correlationId,
      sequenceIndex: idx + 1
    });
  });

  return {
    hasFindings: true,
    findings
  };
}
