// supabase/functions/agents-orchestrator/agents/ag010/contracts/ag010-five-whys.contract.ts
// Five Whys & Root Cause Status Model Contract for AG-010 (v1.0)
// Frozen under Tokens: AG010-FIVE-WHYS-MODEL-001, AG010-ROOT-CAUSE-STATUS-001
// Invariant: FIVE WHYS != CONFIRMATION; STOP_EARLY permitted; Confirmation requires human authority (§65-84 PRD-AG-010.1)

import type { FiveWhyNode, RootCauseCandidate, RootCauseStatus, WhyAnswerType } from '../types/ag010.types.ts';

export const VALID_ROOT_CAUSE_STATUSES: RootCauseStatus[] = [
  'NOT_ANALYZED',
  'HYPOTHESIS',
  'SUPPORTED_HYPOTHESIS',
  'CONFIRMED',
  'INSUFFICIENT_EVIDENCE',
  'DISPROVEN'
];

export function validateFiveWhysChain(nodes: FiveWhyNode[]): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!Array.isArray(nodes) || nodes.length === 0) {
    return { isValid: false, errors: ['Five Whys chain must contain at least 1 node.'] };
  }

  if (nodes.length > 5) {
    errors.push('Five Whys chain cannot exceed level 5.');
  }

  let previousLevel = 0;
  for (const node of nodes) {
    if (node.level !== previousLevel + 1) {
      errors.push(`Invalid level sequence: node level ${node.level} followed level ${previousLevel}.`);
    }
    previousLevel = node.level;

    if (!node.question || !node.answer) {
      errors.push(`Node at level ${node.level} must have both question and answer.`);
    }

    if (node.answer_type === 'FACT' && (!node.supporting_evidence_ids || node.supporting_evidence_ids.length === 0)) {
      errors.push(`Node at level ${node.level} marked as FACT must have supporting evidence IDs.`);
    }
  }

  return { isValid: errors.length === 0, errors };
}

export function validateRootCauseCandidate(candidate: RootCauseCandidate): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!candidate.candidate_id) errors.push('candidate_id is required.');
  if (!candidate.statement) errors.push('statement is required.');
  if (!VALID_ROOT_CAUSE_STATUSES.includes(candidate.status)) {
    errors.push(`Invalid status '${candidate.status}'. Must be one of: ${VALID_ROOT_CAUSE_STATUSES.join(', ')}`);
  }

  // An AI generated root cause is by default a HYPOTHESIS and requires human validation unless pre-confirmed by human
  if (candidate.status === 'CONFIRMED' && candidate.requires_human_validation) {
    errors.push("Contradiction: Status is 'CONFIRMED' but 'requires_human_validation' is true without human authorization signature.");
  }

  return { isValid: errors.length === 0, errors };
}
