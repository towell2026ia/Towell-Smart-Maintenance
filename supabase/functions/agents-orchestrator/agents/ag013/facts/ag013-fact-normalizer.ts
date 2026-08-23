// supabase/functions/agents-orchestrator/agents/ag013/facts/ag013-fact-normalizer.ts
// Bad Actor Fact Normalizer for AG-013 (v1.0)
// Frozen under Token: AG013-BAD-ACTOR-ENGINE-001

import type { BadActorFact } from '../types/ag013.types.ts';

export class AG013FactNormalizer {
  public static normalize(
    assetId: string,
    dimension: 'CHRONICITY' | 'FAILURE_BURDEN' | 'ECONOMIC_BURDEN' | 'HEALTH_RISK' | 'INTERVENTION_EFFECTIVENESS',
    sourceAuthority: string,
    sourceId: string,
    rawValue: any,
    normalizedScore: number,
    weightApplied: number,
    timestampSource: string
  ): BadActorFact {
    return {
      fact_id: `FACT_${assetId}_${dimension}_${sourceId}`.toUpperCase().replace(/[^A-Z0-9_]/g, '_'),
      asset_id: assetId,
      dimension,
      source_authority: sourceAuthority,
      source_id: sourceId,
      raw_value: rawValue,
      normalized_score: Math.min(100, Math.max(0, Number(normalizedScore.toFixed(2)))),
      weight_applied: Number(weightApplied.toFixed(4)),
      timestamp_source: timestampSource
    };
  }
}
