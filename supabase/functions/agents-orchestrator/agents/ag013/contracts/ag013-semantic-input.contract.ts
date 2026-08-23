// supabase/functions/agents-orchestrator/agents/ag013/contracts/ag013-semantic-input.contract.ts
// Semantic Input Contract Specification for AG-013 (AG013-SEMANTIC-INPUT-001)
// Frozen under Token: AG013-SEMANTIC-LAYER-001

import type { BadActorClassificationCode, PopulationScope, AnalysisWindow } from '../types/ag013.types.ts';

export interface AG013SemanticAssetInput {
  asset_id: string;
  codigo_maquina: string;
  nombre: string;
  area: string;
  machine_family: string;
  criticality: string;
  classification: BadActorClassificationCode;
  rank: number;
  bad_actor_score: number;
  dimension_scores: {
    chronicity_score: number;
    failure_burden_score: number;
    economic_burden_score: number;
    health_risk_score: number;
    intervention_ineffectiveness_score: number;
  };
  hard_rules_triggered: string[];
  data_sufficiency_index: number;
  missing_dimensions: string[];
  conflicts: string[];
  drivers: string[];
  ag012_strategy?: string;
  facts_summary: Array<{
    dimension: string;
    source: string;
    raw_value: any;
    score: number;
  }>;
}

export interface AG013SemanticInputPayload {
  request_id: string;
  evaluation_at: string;
  population_scope: PopulationScope;
  analysis_window: AnalysisWindow;
  upstream_model_sha256: string;
  assets: AG013SemanticAssetInput[];
}

export const AG013SemanticInputContract = {
  version: '1.0',
  contract_token: 'AG013-SEMANTIC-INPUT-001',
  validate(payload: AG013SemanticInputPayload): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!payload.request_id) errors.push('request_id es obligatorio');
    if (!payload.evaluation_at) errors.push('evaluation_at es obligatorio');
    if (!payload.upstream_model_sha256) errors.push('upstream_model_sha256 es obligatorio');
    if (!Array.isArray(payload.assets) || payload.assets.length === 0) {
      errors.push('assets debe ser un arreglo no vacío');
    }
    return { valid: errors.length === 0, errors };
  }
};
