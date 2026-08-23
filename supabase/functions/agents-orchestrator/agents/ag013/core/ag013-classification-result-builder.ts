// supabase/functions/agents-orchestrator/agents/ag013/core/ag013-classification-result-builder.ts
// Classification Result Package Builder for AG-013 (v1.0)
// Frozen under Token: AG013-BAD-ACTOR-ENGINE-001

import type { BadActorAnalysisPackage, AssetBadActorResult, PopulationScope, AnalysisWindow } from '../types/ag013.types.ts';
import { AG013TraceabilityBuilder } from './ag013-traceability-builder.ts';

export class AG013ClassificationResultBuilder {
  public static buildPackage(
    requestId: string,
    evaluationAt: string,
    scope: PopulationScope,
    window: AnalysisWindow,
    results: AssetBadActorResult[],
    decisionModelSha: string
  ): BadActorAnalysisPackage {
    const allFacts = results.flatMap(r => r.facts);
    const traceability = AG013TraceabilityBuilder.build(allFacts, decisionModelSha);

    const counts = {
      not_bad_actor: 0,
      watchlist: 0,
      bad_actor: 0,
      severe_bad_actor: 0,
      insufficient_data: 0
    };

    for (const r of results) {
      if (r.classification === 'NOT_BAD_ACTOR') counts.not_bad_actor++;
      else if (r.classification === 'WATCHLIST') counts.watchlist++;
      else if (r.classification === 'BAD_ACTOR') counts.bad_actor++;
      else if (r.classification === 'SEVERE_BAD_ACTOR') counts.severe_bad_actor++;
      else if (r.classification === 'INSUFFICIENT_DATA') counts.insufficient_data++;
    }

    return {
      request_id: requestId,
      evaluation_at: evaluationAt,
      population_scope: scope,
      analysis_window: window,
      total_assets_evaluated: results.length,
      summary_counts: counts,
      results,
      traceability,
      semantic_explanation: null
    };
  }
}
