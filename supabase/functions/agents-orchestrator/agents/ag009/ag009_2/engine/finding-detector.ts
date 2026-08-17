// supabase/functions/agents-orchestrator/agents/ag009/ag009_2/engine/finding-detector.ts
// Deterministic Finding Detection Engine for Autonomous Maintenance (§25, §34, §35, §36 PRD)

import { AutonomousResponseItem, AutonomousFinding } from '../../types/ag009.types.ts';
import { CANONICAL_FINDING_RULES } from './finding-rules.ts';
import { buildAutonomousFinding } from '../contracts/autonomous-finding.contract.ts';

export interface FindingDetectionParams {
  machine_id: string;
  survey_reference: string;
  calendar_reference: string;
  week_reference: string | number;
  year?: number;
  responses: AutonomousResponseItem[];
  correlation_id: string;
}

export function detectAutonomousFindings(params: FindingDetectionParams): AutonomousFinding[] {
  const findings: AutonomousFinding[] = [];

  for (const item of params.responses) {
    if (!item) continue;

    // Find rules matching this block
    const matchingRules = CANONICAL_FINDING_RULES.filter(r => r.block === item.block);

    for (const rule of matchingRules) {
      const evaluation = rule.evaluate(item);

      if (evaluation.isFinding) {
        const finding = buildAutonomousFinding({
          machine_id: params.machine_id,
          survey_reference: params.survey_reference,
          calendar_reference: params.calendar_reference,
          week_reference: params.week_reference,
          year: params.year,
          item_code: item.item_code,
          finding_description: evaluation.description || `Anomalía detectada en ${item.block} (${item.question_text}).`,
          block: item.block,
          severity: evaluation.severity || 'MEDIA',
          evidence_reference: item.evidence_reference,
          correlation_id: params.correlation_id,
          sequenceIndex: findings.length
        });

        findings.push(finding);
      }
    }
  }

  return findings;
}
