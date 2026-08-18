// supabase/functions/agents-orchestrator/agents/ag002/contracts/ag002-semantic-output.contract.ts
// JSON Schema for AG002-SEMANTIC-001 with additionalProperties: false (§23-25 PRD)

export const AG002_SEMANTIC_OUTPUT_VERSION = 'AG002-SEMANTIC-001';

export const AG002_SEMANTIC_OUTPUT_SCHEMA = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  title: 'AG002SemanticOutput',
  type: 'object',
  required: [
    'machine_id',
    'executive_summary',
    'pattern_codes',
    'priority_explanation',
    'preventive_focus',
    'historical_observations',
    'parts_observations',
    'data_quality_warnings',
    'recommendation',
    'source_references',
    'requires_human_review'
  ],
  additionalProperties: false,
  properties: {
    machine_id: { type: 'string' },
    executive_summary: { type: 'string' },
    pattern_codes: {
      type: 'array',
      items: {
        type: 'string',
        enum: [
          'HIGH_FAILURE_RECURRENCE',
          'SHORT_FAILURE_INTERVAL',
          'HIGH_CORRECTIVE_FREQUENCY',
          'HIGH_DOWNTIME',
          'CRITICAL_ASSET',
          'REPEATED_COMPONENT_FAILURE',
          'HIGH_PARTS_CONSUMPTION',
          'LONG_TIME_SINCE_PREVENTIVE',
          'INSUFFICIENT_HISTORY',
          'INCOMPLETE_DOWNTIME_DATA',
          'UNKNOWN_PART_COST',
          'NEW_MACHINE',
          'NO_SIGNIFICANT_PATTERN'
        ]
      }
    },
    priority_explanation: { type: 'string' },
    preventive_focus: {
      type: 'array',
      items: { type: 'string' }
    },
    historical_observations: {
      type: 'array',
      items: {
        type: 'object',
        required: ['observation'],
        additionalProperties: false,
        properties: {
          observation: { type: 'string' },
          source_references: {
            type: 'array',
            items: { type: 'string' }
          }
        }
      }
    },
    parts_observations: {
      type: 'array',
      items: { type: 'string' }
    },
    data_quality_warnings: {
      type: 'array',
      items: { type: 'string' }
    },
    recommendation: { type: 'string' },
    source_references: {
      type: 'array',
      items: { type: 'string' }
    },
    requires_human_review: { type: 'boolean' }
  }
};
