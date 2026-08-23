// supabase/functions/agents-orchestrator/modules/m012/contracts/m012-readiness.contract.ts
// Canonical Readiness Result Contract for M-012 (v1.0)
// Frozen under Token: M012-DATA-MAP-001

export const M012_READINESS_SCHEMA = {
  type: 'object',
  properties: {
    status: {
      type: 'string',
      enum: ['READY', 'PARTIALLY_READY', 'BLOCKED_MISSING_INFORMATION', 'BLOCKED_MISSING_RESOURCE', 'REVIEW_REQUIRED']
    },
    readiness_score: { type: 'number', minimum: 0, maximum: 100 },
    is_ready_for_execution: { type: 'boolean' },
    blocking_reasons: { type: 'array', items: { type: 'string' } },
    warnings: { type: 'array', items: { type: 'string' } },
    ready_items_count: { type: 'number' },
    missing_items_count: { type: 'number' },
    safety_handoff_required: { type: 'boolean' }
  },
  required: [
    'status',
    'readiness_score',
    'is_ready_for_execution',
    'blocking_reasons',
    'warnings',
    'ready_items_count',
    'missing_items_count',
    'safety_handoff_required'
  ],
  additionalProperties: false
};
