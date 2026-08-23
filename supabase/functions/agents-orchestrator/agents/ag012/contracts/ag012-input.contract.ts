// supabase/functions/agents-orchestrator/agents/ag012/contracts/ag012-input.contract.ts
// Canonical Input Contract for AG-012 (v1.0)
// Frozen under Token: AG012-DATA-MAP-001

import type { AG012ExecutionRequest } from '../types/ag012.types.ts';

export const AG012_INPUT_SCHEMA = {
  type: 'object',
  properties: {
    request_id: { type: 'string' },
    asset_id: { type: 'string' },
    decision_context: {
      type: 'string',
      enum: [
        'MAJOR_FAILURE',
        'REPEATED_FAILURES',
        'HIGH_MAINTENANCE_BURDEN',
        'LIFECYCLE_REVIEW',
        'OBSOLESCENCE_REVIEW',
        'CAPEX_PREANALYSIS'
      ]
    },
    evaluation_at: { type: 'string', format: 'date-time' },
    consumer: { type: 'string' },
    m010_context: { type: 'object' },
    m011_context: { type: 'object' },
    ag008_context: { type: 'object' },
    ag010_context: { type: 'object' },
    ag011_context: { type: 'object' },
    ag007_context: { type: 'object' }
  },
  required: ['asset_id'],
  additionalProperties: true
};

export class AG012InputValidator {
  public static validate(input: AG012ExecutionRequest): void {
    if (!input) {
      throw new Error('[AG012_INPUT_ERROR] Request payload no puede ser nulo o indefinido.');
    }
    if (!input.asset_id || typeof input.asset_id !== 'string' || input.asset_id.trim() === '') {
      throw new Error('[AG012_INPUT_ERROR] asset_id es obligatorio para evaluar la estrategia del activo.');
    }
    if (input.evaluation_at && isNaN(Date.parse(input.evaluation_at))) {
      throw new Error('[AG012_INPUT_ERROR] evaluation_at debe ser un timestamp ISO 8601 válido.');
    }
  }
}
