// supabase/functions/agents-orchestrator/modules/m012/contracts/m012-output.contract.ts
// Canonical Output Contract for M-012 OT Preparation & Readiness (v1.0)
// Frozen under Token: M012-DATA-MAP-001

export const M012_OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    module_id: { type: 'string', const: 'M-012' },
    version: { type: 'string', const: '1.0' },
    work_order_id: { type: 'string' },
    asset_id: { type: 'string' },
    evaluation_at: { type: 'string', format: 'date-time' },
    package: { type: 'object' },
    telemetry: {
      type: 'object',
      properties: {
        duration_ms: { type: 'number' },
        llm_calls: { type: 'number', const: 0 },
        tokens: { type: 'number', const: 0 },
        cost_usd: { type: 'number', const: 0 }
      },
      required: ['duration_ms', 'llm_calls', 'tokens', 'cost_usd'],
      additionalProperties: false
    }
  },
  required: ['success', 'module_id', 'version', 'work_order_id', 'asset_id', 'evaluation_at', 'package', 'telemetry'],
  additionalProperties: false
};
