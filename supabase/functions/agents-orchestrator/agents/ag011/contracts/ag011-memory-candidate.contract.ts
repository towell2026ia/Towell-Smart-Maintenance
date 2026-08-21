// supabase/functions/agents-orchestrator/agents/ag011/contracts/ag011-memory-candidate.contract.ts
// Canonical Memory Candidate Contract for AG-011 (v1.0)
// Frozen under Token: AG011-MEMORY-CANDIDATE-001

import type { AG011MemoryCandidate } from '../types/ag011.types.ts';

export const AG011_MEMORY_CANDIDATE_SCHEMA = {
  $id: 'AG011-MEMORY-CANDIDATE-001',
  type: 'object',
  required: [
    'candidate_id',
    'title',
    'memory_type',
    'status',
    'quality',
    'suggested_scope',
    'draft_content',
    'evidence',
    'contradicting_evidence',
    'limitations',
    'origin_case_ids',
    'created_at',
    'requires_human_review'
  ],
  additionalProperties: false,
  properties: {
    candidate_id: { type: 'string', pattern: '^CAND-[A-Z0-9-]+$' },
    title: { type: 'string' },
    memory_type: {
      type: 'string',
      enum: [
        'CONFIRMED_ROOT_CAUSE',
        'VALIDATED_REPAIR',
        'VALIDATED_DIAGNOSTIC_CHECK',
        'RECURRING_FAILURE_GUIDANCE',
        'COMPONENT_LESSON',
        'MAINTENANCE_LESSON',
        'SAFETY_REFERENCE',
        'KNOWN_LIMITATION'
      ]
    },
    status: { type: 'string', const: 'CANDIDATE' },
    quality: {
      type: 'string',
      enum: ['STRONG', 'ADEQUATE', 'PARTIAL', 'CONFLICTING', 'INSUFFICIENT']
    },
    suggested_scope: { type: 'object' },
    draft_content: { type: 'object' },
    evidence: { type: 'array' },
    contradicting_evidence: { type: 'array' },
    limitations: { type: 'array', items: { type: 'string' } },
    origin_case_ids: { type: 'array', items: { type: 'string' } },
    created_at: { type: 'string', format: 'date-time' },
    requires_human_review: { type: 'boolean', const: true }
  }
};
