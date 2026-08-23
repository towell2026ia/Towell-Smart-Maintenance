// supabase/functions/agents-orchestrator/agents/ag012/contracts/ag012-semantic-output.contract.ts
// Canonical Semantic Output Contract & JSON Schema for MiMo v2.5 (v1.0)
// Frozen under Token: AG012-SEMANTIC-OUTPUT-001

export interface AG012SemanticOutput {
  recommendation_echo: 'REPAIR' | 'RENEW' | 'REPLACE' | 'INSUFFICIENT_DATA' | 'HUMAN_REVIEW_REQUIRED';
  executive_summary: string;
  key_technical_drivers: string[];
  key_economic_drivers: string[];
  strategic_risks: string[];
  limitations_and_missing_data: string[];
  reevaluation_triggers: string[];
  cited_fact_ids: string[];
}

export const AG012_SEMANTIC_JSON_SCHEMA = {
  type: 'object',
  properties: {
    recommendation_echo: {
      type: 'string',
      enum: ['REPAIR', 'RENEW', 'REPLACE', 'INSUFFICIENT_DATA', 'HUMAN_REVIEW_REQUIRED']
    },
    executive_summary: { type: 'string' },
    key_technical_drivers: {
      type: 'array',
      items: { type: 'string' }
    },
    key_economic_drivers: {
      type: 'array',
      items: { type: 'string' }
    },
    strategic_risks: {
      type: 'array',
      items: { type: 'string' }
    },
    limitations_and_missing_data: {
      type: 'array',
      items: { type: 'string' }
    },
    reevaluation_triggers: {
      type: 'array',
      items: { type: 'string' }
    },
    cited_fact_ids: {
      type: 'array',
      items: { type: 'string' }
    }
  },
  required: [
    'recommendation_echo',
    'executive_summary',
    'key_technical_drivers',
    'key_economic_drivers',
    'strategic_risks',
    'limitations_and_missing_data',
    'reevaluation_triggers',
    'cited_fact_ids'
  ],
  additionalProperties: false
};
