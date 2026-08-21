// supabase/functions/agents-orchestrator/agents/ag011/contracts/ag011-memory-evidence.contract.ts
// Canonical Memory Evidence & Lineage Contract for AG-011 (v1.0)
// Frozen under Token: AG011-MEMORY-EVIDENCE-001

import type { AG011MemoryEvidence } from '../types/ag011.types.ts';

export const AG011_MEMORY_EVIDENCE_SCHEMA = {
  $id: 'AG011-MEMORY-EVIDENCE-001',
  type: 'object',
  required: [
    'evidence_id',
    'evidence_class',
    'source_type',
    'source_id',
    'fact_statement',
    'occurred_at'
  ],
  additionalProperties: false,
  properties: {
    evidence_id: { type: 'string' },
    evidence_class: {
      type: 'string',
      enum: [
        'CERTIFIED_FACT',
        'HUMAN_CONFIRMED_CAUSE',
        'VALIDATED_INTERVENTION',
        'DOCUMENTED_OUTCOME',
        'DERIVED_SIGNAL',
        'TECHNICIAN_STATEMENT',
        'OPERATOR_STATEMENT',
        'MODEL_HYPOTHESIS'
      ]
    },
    source_type: {
      type: 'string',
      enum: ['WORK_ORDER', 'FINDING', 'TELEGRAM_MSG', 'AG010_RCA', 'AG008_SIGNAL', 'TECHNICAL_MANUAL']
    },
    source_id: { type: 'string' },
    fact_statement: { type: 'string' },
    occurred_at: { type: 'string', format: 'date-time' },
    source_table: { type: 'string' },
    reliability_score: { type: 'number', minimum: 0, maximum: 100 }
  }
};
