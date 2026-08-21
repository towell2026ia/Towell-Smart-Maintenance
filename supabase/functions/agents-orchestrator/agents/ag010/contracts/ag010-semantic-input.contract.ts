// supabase/functions/agents-orchestrator/agents/ag010/contracts/ag010-semantic-input.contract.ts
// Semantic Input Contract for AG-010 MiMo Layer (v1.0)
// Frozen under Token: AG010-SEMANTIC-INPUT-001
// Invariant: Pure transformation of AG010-EVIDENCE-PACKAGE-001 (§9-18 PRD-AG-010.3)

import type { AG010EvidencePackage, AG010EvidenceItem, PreviousCaseMatch } from '../types/ag010.types.ts';

export interface AG010SemanticInputPayload {
  case_id: string;
  asset_id: string;
  evaluation_at: string;
  problem_statement: string;
  certified_facts: AG010EvidenceItem[];
  operator_statements: AG010EvidenceItem[];
  previous_cases: PreviousCaseMatch[];
  data_quality: string;
  retrieval_model_sha256: string;
}

export function buildSemanticInput(evidencePackage: AG010EvidencePackage, retrievalModelSha256: string): AG010SemanticInputPayload {
  return {
    case_id: evidencePackage.case_id,
    asset_id: evidencePackage.asset_id,
    evaluation_at: evidencePackage.evaluation_at,
    problem_statement: evidencePackage.problem_statement,
    certified_facts: evidencePackage.certified_facts,
    operator_statements: evidencePackage.operator_statements,
    previous_cases: evidencePackage.previous_cases,
    data_quality: evidencePackage.data_quality,
    retrieval_model_sha256: retrievalModelSha256
  };
}
