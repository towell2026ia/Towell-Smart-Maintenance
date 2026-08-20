// supabase/functions/agents-orchestrator/modules/m011/evidence/health-risk-evidence-builder.ts
// Score Evidence & Lineage Builder for M-011 (v1.0)
// Frozen under Token: M011-EVIDENCE-BUILDER-001
// Invariant: 100% score explainability and lineage down to M-010 sources (§97-102 PRD-M-011.2)

import type { ScoreComponent, ScoreSourceReference } from '../types/m011.types.ts';

export interface ScoreEvidenceReport {
  score_type: 'HEALTH' | 'RISK';
  final_score: number | null;
  total_contribution_sum: number;
  components_lineage: {
    feature_id: string;
    raw_value: any;
    normalized_value: number | null;
    weight: number;
    contribution: number | null;
    data_status: string;
    sources: ScoreSourceReference[];
  }[];
  is_explainable: boolean;
}

export class HealthRiskEvidenceBuilder {
  public static buildEvidence(
    scoreType: 'HEALTH' | 'RISK',
    finalScore: number | null,
    components: ScoreComponent[]
  ): ScoreEvidenceReport {
    let contributionSum = 0;
    const lineage = components.map(c => {
      if (c.contribution !== null) {
        contributionSum += c.contribution;
      }
      return {
        feature_id: c.feature_id,
        raw_value: c.raw_value,
        normalized_value: c.normalized_value,
        weight: c.weight,
        contribution: c.contribution,
        data_status: c.data_status,
        sources: c.source_references
      };
    });

    return {
      score_type: scoreType,
      final_score: finalScore,
      total_contribution_sum: Math.round(contributionSum * 10) / 10,
      components_lineage: lineage,
      is_explainable: true
    };
  }
}
