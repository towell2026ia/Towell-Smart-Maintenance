// supabase/functions/agents-orchestrator/agents/ag010/contracts/ag010-output.contract.ts
// AG-010 Final Output Contract, Data Quality & Audit Layer (v1.0)
// Frozen under Tokens: AG010-OUTPUT-001, AG010-DATA-QUALITY-001, AG010-AUDIT-001
// Invariant: Five Whys is diagnostic only; zero direct action/OT creation authority (§85-90 PRD-AG-010.1)

import type { AG010Output, RecommendedVerification } from '../types/ag010.types.ts';

export const PROHIBITED_ACTION_VERBS = [
  'CREATE_OT',
  'CLOSE_OT',
  'STOP_MACHINE',
  'APPROVE_PURCHASE',
  'MODIFY_CALENDAR',
  'RESERVE_PART',
  'MODIFY_INVENTORY'
];

export interface AG010AuditRecord {
  request_id: string;
  event_id?: string | null;
  correlation_id?: string | null;
  agent_id: 'AG-010';
  case_id: string;
  asset_id: string;
  evaluation_at: string;
  evidence_count: number;
  previous_case_count: number;
  five_whys_depth: number;
  root_cause_candidate_count: number;
  root_cause_status: string;
  requires_human_validation: boolean;
  provider: string;
  model: string;
  tokens: number;
  cost: number;
  duration_ms: number;
  status: string;
  created_at: string;
}

export function validateAG010Output(output: AG010Output): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!output.case_id) errors.push('case_id is required.');
  if (!output.asset_id) errors.push('asset_id is required.');
  if (!output.evaluation_at) errors.push('evaluation_at is required.');
  if (!output.problem_statement) errors.push('problem_statement is required.');
  if (!Array.isArray(output.facts)) errors.push('facts must be an array.');
  if (!Array.isArray(output.previous_cases)) errors.push('previous_cases must be an array.');
  if (!Array.isArray(output.five_whys)) errors.push('five_whys must be an array.');
  if (!Array.isArray(output.root_cause_candidates)) errors.push('root_cause_candidates must be an array.');

  // Validate recommended verifications don't contain prohibited action triggers
  if (Array.isArray(output.recommended_verifications)) {
    for (const rec of output.recommended_verifications) {
      const upperInst = rec.instruction.toUpperCase();
      for (const verb of PROHIBITED_ACTION_VERBS) {
        if (upperInst.includes(verb)) {
          errors.push(`Prohibited action verb '${verb}' detected in recommended verification instruction.`);
        }
      }
    }
  }

  return { isValid: errors.length === 0, errors };
}
