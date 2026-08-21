// supabase/functions/agents-orchestrator/agents/ag011/contracts/ag011-memory.contract.ts
// Canonical Technical Memory Item Contract for AG-011 (v1.0)
// Frozen under Token: AG011-TECHNICAL-MEMORY-MODEL-001

import type { AG011TechnicalMemoryItem } from '../types/ag011.types.ts';

export const AG011_TECHNICAL_MEMORY_SCHEMA = {
  $id: 'AG011-TECHNICAL-MEMORY-MODEL-001',
  type: 'object',
  required: [
    'memory_id',
    'title',
    'memory_type',
    'status',
    'quality',
    'version',
    'scope',
    'technical_content',
    'evidence',
    'limitations',
    'origin_case_ids',
    'origin_analysis_ids',
    'created_at',
    'effective_from'
  ],
  additionalProperties: false,
  properties: {
    memory_id: { type: 'string', pattern: '^MEM-[A-Z0-9-]+$' },
    title: { type: 'string', minLength: 5, maxLength: 200 },
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
    status: {
      type: 'string',
      enum: ['CANDIDATE', 'REVIEW_REQUIRED', 'APPROVED', 'SUPERSEDED', 'RETIRED', 'REJECTED']
    },
    quality: {
      type: 'string',
      enum: ['STRONG', 'ADEQUATE', 'PARTIAL', 'CONFLICTING', 'INSUFFICIENT']
    },
    version: { type: 'string', pattern: '^[0-9]+\\.[0-9]+$' },
    scope: {
      type: 'object',
      required: ['scope_level'],
      additionalProperties: false,
      properties: {
        scope_level: {
          type: 'string',
          enum: ['ASSET_SPECIFIC', 'MACHINE_MODEL', 'MACHINE_FAMILY', 'COMPONENT', 'DEPARTMENT', 'GENERAL']
        },
        asset_id: { type: ['string', 'null'] },
        machine_model: { type: ['string', 'null'] },
        machine_family: { type: ['string', 'null'] },
        component_id: { type: ['string', 'null'] },
        department: { type: ['string', 'null'] },
        required_conditions: { type: 'array', items: { type: 'string' } },
        excluded_conditions: { type: 'array', items: { type: 'string' } }
      }
    },
    technical_content: {
      type: 'object',
      required: ['condition_description', 'validated_observations', 'validated_procedure', 'expected_outcome'],
      additionalProperties: false,
      properties: {
        condition_description: { type: 'string' },
        validated_observations: { type: 'array', items: { type: 'string' } },
        confirmed_root_cause: { type: ['string', 'null'] },
        validated_procedure: { type: 'string' },
        expected_outcome: { type: 'string' },
        required_parts: { type: 'array', items: { type: 'string' } },
        required_tools: { type: 'array', items: { type: 'string' } },
        safety_warnings: { type: 'array', items: { type: 'string' } }
      }
    },
    evidence: {
      type: 'array',
      items: {
        type: 'object',
        required: ['evidence_id', 'evidence_class', 'source_type', 'source_id', 'fact_statement', 'occurred_at'],
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
      }
    },
    limitations: { type: 'array', items: { type: 'string' } },
    origin_case_ids: { type: 'array', items: { type: 'string' } },
    origin_analysis_ids: { type: 'array', items: { type: 'string' } },
    created_at: { type: 'string', format: 'date-time' },
    effective_from: { type: 'string', format: 'date-time' },
    effective_to: { type: ['string', 'null'], format: 'date-time' },
    supersedes_memory_id: { type: ['string', 'null'] },
    superseded_by_memory_id: { type: ['string', 'null'] },
    approval: {
      type: ['object', 'null'],
      required: ['reviewer_email', 'reviewer_role', 'decision', 'reviewed_at', 'approval_notes', 'evidence_snapshot_sha256'],
      additionalProperties: false,
      properties: {
        reviewer_email: { type: 'string', format: 'email' },
        reviewer_role: { type: 'string' },
        decision: { type: 'string', enum: ['APPROVED', 'REJECTED', 'REVISE'] },
        reviewed_at: { type: 'string', format: 'date-time' },
        approval_notes: { type: 'string' },
        evidence_snapshot_sha256: { type: 'string', pattern: '^[a-f0-9]{64}$' }
      }
    }
  }
};
