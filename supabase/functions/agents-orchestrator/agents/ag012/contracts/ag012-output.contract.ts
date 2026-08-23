// supabase/functions/agents-orchestrator/agents/ag012/contracts/ag012-output.contract.ts
// Canonical Output Contract for AG-012 (v1.0)
// Frozen under Token: AG012-OUTPUT-001

export const AG012_OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    agent_id: { type: 'string', const: 'AG-012' },
    version: { type: 'string', const: '1.0' },
    asset_id: { type: 'string' },
    evaluation_at: { type: 'string', format: 'date-time' },
    package: { type: 'object' },
    telemetry: {
      type: 'object',
      properties: {
        duration_ms: { type: 'number' },
        llm_calls: { type: 'number' },
        tokens: { type: 'number' },
        cost_usd: { type: 'number' },
        provider: { type: 'string' }
      },
      required: ['duration_ms', 'llm_calls', 'tokens', 'cost_usd', 'provider'],
      additionalProperties: false
    }
  },
  required: ['success', 'agent_id', 'version', 'asset_id', 'evaluation_at', 'package', 'telemetry'],
  additionalProperties: false
};
