// supabase/functions/agents-orchestrator/agents/ag002/contracts/ag002-semantic-input.contract.ts
// JSON Schema for AG002-SEMANTIC-INPUT-001 (§12, §13, §14 PRD)

export const AG002_SEMANTIC_INPUT_VERSION = 'AG002-SEMANTIC-INPUT-001';

export const AG002_SEMANTIC_INPUT_SCHEMA = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  title: 'AG002SemanticInput',
  type: 'object',
  required: [
    'contract_id',
    'contract_version',
    'target_year',
    'generation_date',
    'machine',
    'metrics',
    'priority',
    'service',
    'parts',
    'schedule'
  ],
  additionalProperties: false,
  properties: {
    contract_id: { type: 'string', const: 'AG002-SEMANTIC-INPUT-001' },
    contract_version: { type: 'string', const: '1.0' },
    target_year: { type: 'integer' },
    generation_date: { type: 'string' },
    machine: {
      type: 'object',
      required: ['machine_id', 'department_code', 'is_active', 'is_loom', 'criticality_level'],
      additionalProperties: false,
      properties: {
        machine_id: { type: 'string' },
        department_code: { type: 'string', enum: ['PF', 'CF', 'TF', 'AF'] },
        is_active: { type: 'boolean' },
        is_loom: { type: 'boolean' },
        criticality_level: { type: 'string' }
      }
    },
    metrics: {
      type: 'object',
      required: [
        'failure_count_12m',
        'repeated_failure_count',
        'failures_by_category',
        'work_order_count_12m',
        'corrective_work_orders_12m',
        'downtime_minutes_12m',
        'downtime_hours_12m',
        'days_since_last_preventive'
      ],
      additionalProperties: false,
      properties: {
        failure_count_12m: { type: 'integer' },
        repeated_failure_count: { type: 'integer' },
        failures_by_category: { type: 'object', additionalProperties: { type: 'integer' } },
        work_order_count_12m: { type: 'integer' },
        corrective_work_orders_12m: { type: 'integer' },
        downtime_minutes_12m: { type: 'number' },
        downtime_hours_12m: { type: 'number' },
        days_since_last_preventive: { type: ['integer', 'null'] }
      }
    },
    priority: {
      type: 'object',
      required: ['priority_score', 'priority_band', 'components'],
      additionalProperties: false,
      properties: {
        priority_score: { type: 'number', minimum: 0, maximum: 100 },
        priority_band: { type: 'string', enum: ['VERY_HIGH', 'HIGH', 'MEDIUM', 'NORMAL'] },
        components: {
          type: 'object',
          required: [
            'criticality_score',
            'recurrence_score',
            'downtime_score',
            'corrective_frequency_score',
            'preventive_age_score'
          ],
          additionalProperties: false,
          properties: {
            criticality_score: { type: 'number' },
            recurrence_score: { type: 'number' },
            downtime_score: { type: 'number' },
            corrective_frequency_score: { type: 'number' },
            preventive_age_score: { type: 'number' }
          }
        }
      }
    },
    service: {
      type: 'object',
      required: ['service_code', 'service_name', 'estimated_duration_min'],
      additionalProperties: false,
      properties: {
        service_code: { type: 'string' },
        service_name: { type: 'string' },
        estimated_duration_min: { type: 'integer' }
      }
    },
    parts: {
      type: 'object',
      required: ['parts_count', 'parts_list', 'known_cost_total', 'budget_status'],
      additionalProperties: false,
      properties: {
        parts_count: { type: 'integer' },
        parts_list: {
          type: 'array',
          items: {
            type: 'object',
            required: ['cve_refaccion', 'cantidad', 'price_status'],
            additionalProperties: false,
            properties: {
              cve_refaccion: { type: 'string' },
              nombre: { type: 'string' },
              cantidad: { type: 'number' },
              price_status: { type: 'string', enum: ['KNOWN_PRICE', 'UNKNOWN_PRICE', 'ZERO_PRICE'] }
            }
          }
        },
        known_cost_total: { type: 'number' },
        budget_status: { type: 'string', enum: ['COMPLETE', 'PARTIAL', 'NO_KNOWN_PRICES'] }
      }
    },
    schedule: {
      type: 'object',
      required: ['scheduled_date', 'week_number', 'month_number', 'calendar_reference'],
      additionalProperties: false,
      properties: {
        scheduled_date: { type: 'string' },
        week_number: { type: 'integer' },
        month_number: { type: 'integer' },
        calendar_reference: { type: 'string' }
      }
    },
    precalculated_patterns: {
      type: 'array',
      items: { type: 'string' }
    },
    untrusted_historical_content: {
      type: 'array',
      items: {
        type: 'object',
        required: ['source', 'date', 'description', 'reference_id'],
        additionalProperties: false,
        properties: {
          source: { type: 'string' },
          date: { type: 'string' },
          description: { type: 'string' },
          reference_id: { type: 'string' }
        }
      }
    }
  }
};
