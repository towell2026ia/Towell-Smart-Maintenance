// supabase/functions/agents-orchestrator/agents/ag010/core/ag010-semantic-merge.ts
// Semantic Merge Engine for AG-010 (v1.0)
// Frozen under Token: AG010-SEMANTIC-RULES-001
// Invariant: Merges deterministic package + validated semantic fields without overwriting (§93-97 PRD-AG-010.3)

import type { AG010EvidencePackage, AG010Output, AG010EvidenceItem } from '../types/ag010.types.ts';
import type { AG010SemanticOutput } from '../contracts/ag010-semantic-output.contract.ts';

export class AG010SemanticMergeEngine {
  public static merge(
    deterministicPackage: AG010EvidencePackage,
    semanticOutput: AG010SemanticOutput
  ): AG010Output {
    // Preserve certified facts and deterministic previous cases exactly
    const mergedFacts = [...deterministicPackage.certified_facts];
    const mergedPreviousCases = [...deterministicPackage.previous_cases];
    const mergedSourceRefs = [...deterministicPackage.source_references];

    // Combine deterministic contradicting evidence with any semantically flagged contradicting evidence
    const contradictingMap = new Map<string, AG010EvidenceItem>();
    if (Array.isArray(semanticOutput.contradicting_evidence)) {
      for (const item of semanticOutput.contradicting_evidence) {
        contradictingMap.set(item.evidence_id, item);
      }
    }
    const combinedContradicting = Array.from(contradictingMap.values());

    return {
      case_id: deterministicPackage.case_id,
      asset_id: deterministicPackage.asset_id,
      evaluation_at: deterministicPackage.evaluation_at,
      problem_statement: semanticOutput.problem_summary || deterministicPackage.problem_statement,
      facts: mergedFacts,
      previous_cases: mergedPreviousCases,
      five_whys: semanticOutput.five_whys || [],
      root_cause_candidates: semanticOutput.root_cause_candidates || [],
      contradicting_evidence: combinedContradicting,
      data_gaps: semanticOutput.data_gaps || [],
      recommended_verifications: semanticOutput.recommended_verifications || [],
      requires_human_validation: semanticOutput.requires_human_validation !== false,
      overall_data_quality: deterministicPackage.data_quality,
      source_references: mergedSourceRefs
    };
  }
}
