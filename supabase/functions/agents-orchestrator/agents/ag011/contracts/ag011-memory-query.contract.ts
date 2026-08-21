// supabase/functions/agents-orchestrator/agents/ag011/contracts/ag011-memory-query.contract.ts
// Canonical Memory Query Contract for AG-011 (v1.0)
// Frozen under Token: AG011-MEMORY-RETRIEVAL-001

import type { AG011MemoryQuery } from '../types/ag011.types.ts';

export const AG011_MEMORY_QUERY_SCHEMA = {
  $id: 'AG011-MEMORY-QUERY-001',
  type: 'object',
  required: ['asset_id', 'evaluation_at', 'problem_context', 'consumer'],
  additionalProperties: false,
  properties: {
    query_id: { type: 'string' },
    asset_id: { type: 'string' },
    evaluation_at: { type: 'string', format: 'date-time' },
    problem_context: {
      type: 'object',
      required: ['statement'],
      additionalProperties: false,
      properties: {
        statement: { type: 'string' },
        component: { type: ['string', 'null'] },
        failure_mode: { type: ['string', 'null'] }
      }
    },
    consumer: {
      type: 'string',
      enum: ['M-012', 'M-013', 'AG-012', 'AG-013', 'AG-010', 'AG-001', 'UI']
    },
    scope_level_filter: {
      type: 'array',
      items: {
        type: 'string',
        enum: ['ASSET_SPECIFIC', 'MACHINE_MODEL', 'MACHINE_FAMILY', 'COMPONENT', 'DEPARTMENT', 'GENERAL']
      }
    },
    top_n_limit: { type: 'number', minimum: 1, maximum: 20, default: 5 }
  }
};
