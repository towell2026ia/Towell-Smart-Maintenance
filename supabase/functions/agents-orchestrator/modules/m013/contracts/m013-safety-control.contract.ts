// supabase/functions/agents-orchestrator/modules/m013/contracts/m013-safety-control.contract.ts
// Canonical Safety Control Package Contract for M-013 (v1.0)
// Frozen under Token: M013-SAFETY-CONTROL-PACKAGE-001

export const M013_SAFETY_CONTROL_SCHEMA = {
  type: 'object',
  properties: {
    work_order_id: { type: 'string' },
    asset_id: { type: 'string' },
    evaluation_at: { type: 'string', format: 'date-time' },
    requirements: { type: 'array' },
    loto_control: { type: 'object' },
    permit_control: { type: 'object' },
    evidence: { type: 'array' },
    human_confirmations: { type: 'array' },
    missing_controls: { type: 'array' },
    conflicts: { type: 'array' },
    blocking_reasons: { type: 'array' },
    status: { type: 'string' },
    is_blocked: { type: 'boolean' },
    controls_complete: { type: 'boolean' },
    traceability: { type: 'object' }
  },
  required: [
    'work_order_id',
    'asset_id',
    'evaluation_at',
    'requirements',
    'loto_control',
    'permit_control',
    'evidence',
    'human_confirmations',
    'missing_controls',
    'conflicts',
    'blocking_reasons',
    'status',
    'is_blocked',
    'controls_complete',
    'traceability'
  ],
  additionalProperties: false
};
