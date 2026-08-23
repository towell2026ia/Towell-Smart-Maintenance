// supabase/functions/agents-orchestrator/agents/ag012/contracts/ag012-decision-fact.contract.ts
// Canonical Decision Fact Contract for AG-012 (v1.0)
// Frozen under Token: AG012-DECISION-FACT-001

export const AG012_DECISION_FACT_SCHEMA = {
  type: 'object',
  properties: {
    factor_id: { type: 'string' },
    category: {
      type: 'string',
      enum: ['TECHNICAL', 'RELIABILITY', 'ECONOMIC', 'MAINTAINABILITY', 'OBSOLESCENCE', 'OPERATIONAL', 'DATA_QUALITY']
    },
    name: { type: 'string' },
    value: {},
    unit: { type: 'string' },
    source_agent: { type: 'string' },
    source_reference: { type: 'string' },
    timestamp: { type: 'string', format: 'date-time' },
    quality: { type: 'string', enum: ['CERTIFIED', 'DERIVED', 'HYPOTHESIS', 'UNKNOWN'] }
  },
  required: ['factor_id', 'category', 'name', 'source_agent', 'source_reference', 'timestamp', 'quality'],
  additionalProperties: false
};
