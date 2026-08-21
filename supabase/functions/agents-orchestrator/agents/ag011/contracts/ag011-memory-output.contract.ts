// supabase/functions/agents-orchestrator/agents/ag011/contracts/ag011-memory-output.contract.ts
// Canonical Memory Retrieval Output Contract for AG-011 (v1.0)
// Frozen under Token: AG011-OUTPUT-001

import type { AG011MemoryRetrievalOutput } from '../types/ag011.types.ts';

export const AG011_MEMORY_OUTPUT_SCHEMA = {
  $id: 'AG011-OUTPUT-001',
  type: 'object',
  required: [
    'query_id',
    'asset_id',
    'evaluation_at',
    'consumer',
    'top_n_limit',
    'retrieved_count',
    'memories',
    'retrieval_model_sha256',
    'data_quality'
  ],
  additionalProperties: false,
  properties: {
    query_id: { type: 'string' },
    asset_id: { type: 'string' },
    evaluation_at: { type: 'string', format: 'date-time' },
    consumer: { type: 'string' },
    top_n_limit: { type: 'number' },
    retrieved_count: { type: 'number' },
    memories: {
      type: 'array',
      items: {
        type: 'object',
        required: ['memory', 'relevance_score', 'relevance_factors', 'rank'],
        additionalProperties: false,
        properties: {
          memory: { type: 'object' },
          relevance_score: { type: 'number', minimum: 0, maximum: 100 },
          relevance_factors: { type: 'array', items: { type: 'string' } },
          rank: { type: 'number', minimum: 1 }
        }
      }
    },
    retrieval_model_sha256: { type: 'string' },
    data_quality: {
      type: 'string',
      enum: ['SUFFICIENT', 'PARTIAL', 'EMPTY']
    }
  }
};
