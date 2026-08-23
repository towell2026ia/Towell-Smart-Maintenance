// supabase/functions/agents-orchestrator/agents/ag013/contracts/ag013-semantic-output.contract.ts
// Semantic Output Contract & JSON Schema for AG-013 (AG013-SEMANTIC-OUTPUT-001)
// Frozen under Token: AG013-SEMANTIC-LAYER-001

import type { BadActorClassificationCode } from '../types/ag013.types.ts';

export interface AG013SemanticAssetExplanation {
  asset_id: string;
  classification_echo: BadActorClassificationCode;
  rank_echo: number;
  score_echo: number;
  classification_explanation: string;
  ranking_explanation: string;
  key_drivers: string[];
  chronicity_summary: string;
  failure_burden_summary: string;
  economic_burden_summary: string;
  health_risk_context_summary: string;
  intervention_effectiveness_summary: string;
  conflicting_signals: string[];
  data_limitations: string[];
  missing_information_explanation: string[];
  reevaluation_triggers: string[];
  cited_references: string[];
}

export interface AG013SemanticOutput {
  summary: string;
  population_insights: string;
  critical_asset_narratives: AG013SemanticAssetExplanation[];
}

export const AG013_SEMANTIC_JSON_SCHEMA = {
  type: 'object',
  required: ['summary', 'population_insights', 'critical_asset_narratives'],
  properties: {
    summary: { type: 'string' },
    population_insights: { type: 'string' },
    critical_asset_narratives: {
      type: 'array',
      items: {
        type: 'object',
        required: [
          'asset_id',
          'classification_echo',
          'rank_echo',
          'score_echo',
          'classification_explanation',
          'ranking_explanation',
          'key_drivers',
          'chronicity_summary',
          'failure_burden_summary',
          'economic_burden_summary',
          'health_risk_context_summary',
          'intervention_effectiveness_summary',
          'conflicting_signals',
          'data_limitations',
          'missing_information_explanation',
          'reevaluation_triggers',
          'cited_references'
        ],
        properties: {
          asset_id: { type: 'string' },
          classification_echo: {
            type: 'string',
            enum: ['NOT_BAD_ACTOR', 'WATCHLIST', 'BAD_ACTOR', 'SEVERE_BAD_ACTOR', 'INSUFFICIENT_DATA']
          },
          rank_echo: { type: 'number' },
          score_echo: { type: 'number' },
          classification_explanation: { type: 'string' },
          ranking_explanation: { type: 'string' },
          key_drivers: { type: 'array', items: { type: 'string' } },
          chronicity_summary: { type: 'string' },
          failure_burden_summary: { type: 'string' },
          economic_burden_summary: { type: 'string' },
          health_risk_context_summary: { type: 'string' },
          intervention_effectiveness_summary: { type: 'string' },
          conflicting_signals: { type: 'array', items: { type: 'string' } },
          data_limitations: { type: 'array', items: { type: 'string' } },
          missing_information_explanation: { type: 'array', items: { type: 'string' } },
          reevaluation_triggers: { type: 'array', items: { type: 'string' } },
          cited_references: { type: 'array', items: { type: 'string' } }
        },
        additionalProperties: false
      }
    }
  },
  additionalProperties: false
};

export const AG013SemanticOutputContract = {
  version: '1.0',
  contract_token: 'AG013-SEMANTIC-OUTPUT-001',
  schema: AG013_SEMANTIC_JSON_SCHEMA,
  validate(output: AG013SemanticOutput): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!output.summary) errors.push('summary es obligatorio');
    if (!output.population_insights) errors.push('population_insights es obligatorio');
    if (!Array.isArray(output.critical_asset_narratives)) {
      errors.push('critical_asset_narratives debe ser un arreglo');
    }
    return { valid: errors.length === 0, errors };
  }
};
