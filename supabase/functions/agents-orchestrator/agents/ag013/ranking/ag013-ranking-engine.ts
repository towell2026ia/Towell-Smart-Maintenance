// supabase/functions/agents-orchestrator/agents/ag013/ranking/ag013-ranking-engine.ts
// Bad Actor Deterministic Ranking Engine for AG-013 (v1.0)
// Frozen under Token: AG013-BAD-ACTOR-ENGINE-001

import type { AssetBadActorResult, BadActorClassificationCode } from '../types/ag013.types.ts';

export class AG013RankingEngine {
  private static readonly CLASSIFICATION_PRIORITY: Record<BadActorClassificationCode, number> = {
    'SEVERE_BAD_ACTOR': 5,
    'BAD_ACTOR': 4,
    'WATCHLIST': 3,
    'NOT_BAD_ACTOR': 2,
    'INSUFFICIENT_DATA': 1
  };

  public static rank(results: AssetBadActorResult[]): AssetBadActorResult[] {
    const sorted = [...results].sort((a, b) => {
      // 1. Classification category priority
      const prioA = AG013RankingEngine.CLASSIFICATION_PRIORITY[a.classification] || 0;
      const prioB = AG013RankingEngine.CLASSIFICATION_PRIORITY[b.classification] || 0;
      if (prioA !== prioB) {
        return prioB - prioA;
      }

      // 2. Bad actor score descending
      if (a.bad_actor_score !== b.bad_actor_score) {
        return b.bad_actor_score - a.bad_actor_score;
      }

      // 3. Chronicity score descending
      const chronA = a.dimension_scores.chronicity_score || 0;
      const chronB = b.dimension_scores.chronicity_score || 0;
      if (chronA !== chronB) {
        return chronB - chronA;
      }

      // 4. Economic burden score descending
      const econA = a.dimension_scores.economic_burden_score || 0;
      const econB = b.dimension_scores.economic_burden_score || 0;
      if (econA !== econB) {
        return econB - econA;
      }

      // 5. Invariable tie-break: asset_id ascending (lexicographical)
      return a.asset_id.localeCompare(b.asset_id);
    });

    // Assign 1-indexed ranks
    return sorted.map((item, idx) => ({
      ...item,
      rank: idx + 1
    }));
  }
}
