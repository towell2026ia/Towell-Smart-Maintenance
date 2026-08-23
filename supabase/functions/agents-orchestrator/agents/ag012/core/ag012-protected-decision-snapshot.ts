// supabase/functions/agents-orchestrator/agents/ag012/core/ag012-protected-decision-snapshot.ts
// Protected Deterministic Snapshot for MiMo Semantic Explanation in AG-012.3 (v1.0)
// Frozen under Token: AG012-DECISION-ENGINE-001

import type { InterventionRecommendationPackage } from '../types/ag012.types.ts';

export class AG012ProtectedDecisionSnapshot {
  public static createSnapshot(pkg: InterventionRecommendationPackage): any {
    return {
      snapshot_timestamp: new Date().toISOString(),
      asset_id: pkg.asset_id,
      evaluation_at: pkg.evaluation_at,
      decision_context: pkg.decision_context,
      recommendation: pkg.recommendation,
      decision_scores: JSON.parse(JSON.stringify(pkg.decision_scores)),
      hard_rules_applied: JSON.parse(JSON.stringify(pkg.hard_rules_applied)),
      data_quality: JSON.parse(JSON.stringify(pkg.data_quality)),
      missing_information: [...pkg.missing_information],
      requires_human_approval: pkg.requires_human_approval,
      traceability: JSON.parse(JSON.stringify(pkg.traceability))
    };
  }
}
