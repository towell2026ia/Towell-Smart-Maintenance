// supabase/functions/agents-orchestrator/agents/ag012/contracts/ag012-recommendation.contract.ts
// Canonical Intervention Recommendation Contract for AG-012 (v1.0)
// Frozen under Token: AG012-INTERVENTION-RECOMMENDATION-001

export const AG012_RECOMMENDATION_SCHEMA = {
  type: 'object',
  properties: {
    asset_id: { type: 'string' },
    evaluation_at: { type: 'string', format: 'date-time' },
    decision_context: { type: 'string' },
    recommendation: {
      type: 'string',
      enum: ['REPAIR', 'RENEW', 'REPLACE', 'INSUFFICIENT_DATA', 'HUMAN_REVIEW_REQUIRED']
    },
    decision_scores: { type: 'array' },
    hard_rules_applied: { type: 'array' },
    data_quality: { type: 'object' },
    decision_facts: { type: 'array' },
    missing_information: { type: 'array' },
    requires_human_approval: { type: 'boolean', const: true },
    traceability: { type: 'object' }
  },
  required: [
    'asset_id',
    'evaluation_at',
    'decision_context',
    'recommendation',
    'decision_scores',
    'hard_rules_applied',
    'data_quality',
    'decision_facts',
    'missing_information',
    'requires_human_approval',
    'traceability'
  ],
  additionalProperties: true
};
