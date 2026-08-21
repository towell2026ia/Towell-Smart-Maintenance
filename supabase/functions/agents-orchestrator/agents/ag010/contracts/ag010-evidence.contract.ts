// supabase/functions/agents-orchestrator/agents/ag010/contracts/ag010-evidence.contract.ts
// Evidence Model & Evidence Package Contract for AG-010 (v1.0)
// Frozen under Tokens: AG010-EVIDENCE-MODEL-001, AG010-EVIDENCE-PACKAGE-001
// Invariant: FACT != HYPOTHESIS; Operator statement is untrusted content (§27-37 PRD-AG-010.1)

import type { AG010EvidenceItem, AG010EvidencePackage, EvidenceClass, EvidenceType, EvidenceQuality, ScoreSourceReference } from '../types/ag010.types.ts';

export function createEvidenceItem(params: {
  evidence_id: string;
  evidence_type: EvidenceType;
  evidence_class: EvidenceClass;
  asset_id: string;
  occurred_at: string;
  fact: string;
  source_reference: ScoreSourceReference;
  quality?: EvidenceQuality;
  raw_payload?: any;
}): AG010EvidenceItem {
  return {
    evidence_id: params.evidence_id,
    evidence_type: params.evidence_type,
    evidence_class: params.evidence_class,
    asset_id: params.asset_id,
    occurred_at: params.occurred_at,
    fact: params.fact,
    raw_payload: params.raw_payload,
    source_reference: params.source_reference,
    quality: params.quality || 'CERTIFIED'
  };
}

export function validateEvidencePackage(pkg: AG010EvidencePackage): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!pkg.case_id) errors.push('case_id is required.');
  if (!pkg.asset_id) errors.push('asset_id is required.');
  if (!pkg.evaluation_at) errors.push('evaluation_at is required.');
  if (!Array.isArray(pkg.certified_facts)) errors.push('certified_facts must be an array.');
  if (!Array.isArray(pkg.operator_statements)) errors.push('operator_statements must be an array.');

  // Check no operator statements infiltrated certified facts
  for (const fact of pkg.certified_facts) {
    if (fact.evidence_class === 'OPERATOR_STATEMENT' || fact.evidence_class === 'MODEL_HYPOTHESIS') {
      errors.push(`Contamination: Item '${fact.evidence_id}' with class '${fact.evidence_class}' is in certified_facts.`);
    }
  }

  return { isValid: errors.length === 0, errors };
}
