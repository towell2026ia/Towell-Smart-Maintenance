// supabase/functions/agents-orchestrator/agents/ag013/core/ag013-protected-classification-snapshot.ts
// Protected Classification Snapshot Creator for AG-013 (v1.0)
// Frozen under Token: AG013-BAD-ACTOR-ENGINE-001

import type { BadActorAnalysisPackage } from '../types/ag013.types.ts';

export class AG013ProtectedClassificationSnapshot {
  public static createSnapshot(pkg: BadActorAnalysisPackage): string {
    const protectedContent = {
      request_id: pkg.request_id,
      evaluation_at: pkg.evaluation_at,
      population_scope: pkg.population_scope,
      total_assets_evaluated: pkg.total_assets_evaluated,
      summary_counts: pkg.summary_counts,
      results: pkg.results.map(r => ({
        asset_id: r.asset_id,
        classification: r.classification,
        rank: r.rank,
        bad_actor_score: r.bad_actor_score,
        dimension_scores: r.dimension_scores,
        hard_rules: r.hard_rules_triggered,
        conflicts: r.conflicts_identified,
        drivers: r.key_drivers,
        data_sufficiency: r.data_sufficiency
      })),
      decision_model_sha256: pkg.traceability.decision_model_sha256
    };

    return JSON.stringify(protectedContent);
  }
}
