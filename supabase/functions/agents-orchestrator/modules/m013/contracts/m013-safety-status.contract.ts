// supabase/functions/agents-orchestrator/modules/m013/contracts/m013-safety-status.contract.ts
// Canonical Safety Status Contract for M-013 (v1.0)
// Frozen under Token: M013-SAFETY-STATUS-001

export const M013_SAFETY_STATUS_SCHEMA = {
  type: 'object',
  properties: {
    status: {
      type: 'string',
      enum: ['CONTROLS_COMPLETE', 'CONTROLS_INCOMPLETE', 'BLOCKED', 'REVIEW_REQUIRED', 'NOT_EVALUATED']
    },
    is_blocked: { type: 'boolean' },
    controls_complete: { type: 'boolean' },
    blocking_reasons: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          rule_code: { type: 'string' },
          requirement_id: { type: 'string' },
          description: { type: 'string' },
          severity: { type: 'string', enum: ['CRITICAL_BLOCK', 'WARNING'] }
        },
        required: ['rule_code', 'description', 'severity']
      }
    }
  },
  required: ['status', 'is_blocked', 'controls_complete', 'blocking_reasons'],
  additionalProperties: false
};
