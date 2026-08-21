// supabase/functions/agents-orchestrator/agents/ag010/evidence/ag010-evidence-package-builder.ts
// Deterministic Evidence Package Builder for AG-010 (v1.0)
// Frozen under Token: AG010-EVIDENCE-PACKAGE-001
// Invariant: Prepares certified evidence package for MiMo (§94-97 PRD-AG-010.2)

import type { AG010EvidencePackage, AG010EvidenceItem, PreviousCaseMatch, DataQualityState, ScoreSourceReference } from '../types/ag010.types.ts';

export class AG010EvidencePackageBuilder {
  public static buildPackage(params: {
    caseId: string;
    assetId: string;
    evaluationAt: string;
    problemStatement: string;
    certifiedFacts: AG010EvidenceItem[];
    operatorStatements: AG010EvidenceItem[];
    previousCases: PreviousCaseMatch[];
    dataQuality: DataQualityState;
    sourceReferences: ScoreSourceReference[];
  }): AG010EvidencePackage {
    return {
      case_id: params.caseId,
      asset_id: params.assetId,
      evaluation_at: params.evaluationAt,
      problem_statement: params.problemStatement,
      certified_facts: params.certifiedFacts,
      operator_statements: params.operatorStatements,
      previous_cases: params.previousCases,
      data_quality: params.dataQuality,
      source_references: params.sourceReferences
    };
  }
}
