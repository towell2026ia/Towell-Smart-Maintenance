// supabase/functions/agents-orchestrator/agents/ag013/semantic/ag013-semantic-input-builder.ts
// Semantic Input Builder for AG-013 (v1.0)
// Frozen under Token: AG013-SEMANTIC-LAYER-001

import type { BadActorAnalysisPackage } from '../types/ag013.types.ts';
import type { AG013SemanticInputPayload, AG013SemanticAssetInput } from '../contracts/ag013-semantic-input.contract.ts';

export class AG013SemanticInputBuilder {
  public static build(pkg: BadActorAnalysisPackage, upstreamSha: string): AG013SemanticInputPayload {
    const assets: AG013SemanticAssetInput[] = pkg.results.map(r => ({
      asset_id: r.asset_id,
      codigo_maquina: r.codigo_maquina,
      nombre: r.nombre,
      area: r.area,
      machine_family: r.machine_family,
      criticality: r.criticality,
      classification: r.classification,
      rank: r.rank,
      bad_actor_score: r.bad_actor_score,
      dimension_scores: r.dimension_scores,
      hard_rules_triggered: r.hard_rules_triggered,
      data_sufficiency_index: r.data_sufficiency.data_sufficiency_index,
      missing_dimensions: r.data_sufficiency.missing_critical_dimensions,
      conflicts: r.conflicts_identified,
      drivers: r.key_drivers,
      facts_summary: r.facts.map(f => ({
        dimension: f.dimension,
        source: f.source_authority,
        raw_value: f.raw_value,
        score: f.normalized_score
      }))
    }));

    return {
      request_id: pkg.request_id,
      evaluation_at: pkg.evaluation_at,
      population_scope: pkg.population_scope,
      analysis_window: pkg.analysis_window,
      upstream_model_sha256: upstreamSha,
      assets
    };
  }
}
