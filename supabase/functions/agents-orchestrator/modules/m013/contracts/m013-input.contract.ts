// supabase/functions/agents-orchestrator/modules/m013/contracts/m013-input.contract.ts
// Canonical Input Contract for M-013 Safety Control Engine (v1.0)
// Frozen under Token: M013-DATA-MAP-001

import type { M013ExecutionRequest } from '../types/m013.types.ts';

export const M013_INPUT_SCHEMA = {
  type: 'object',
  properties: {
    request_id: { type: 'string' },
    work_order_id: { type: 'string' },
    asset_id: { type: 'string' },
    evaluation_at: { type: 'string', format: 'date-time' },
    consumer: { type: 'string' },
    m012_package: { type: 'object' }
  },
  required: ['work_order_id'],
  additionalProperties: true
};

export class M013InputValidator {
  public static validate(input: M013ExecutionRequest): void {
    if (!input) {
      throw new Error('[M013_INPUT_ERROR] Request payload no puede ser nulo o indefinido.');
    }
    if (!input.work_order_id || typeof input.work_order_id !== 'string' || input.work_order_id.trim() === '') {
      throw new Error('[M013_INPUT_ERROR] work_order_id es obligatorio para evaluar controles de seguridad.');
    }
    if (input.evaluation_at && isNaN(Date.parse(input.evaluation_at))) {
      throw new Error('[M013_INPUT_ERROR] evaluation_at debe ser un timestamp ISO 8601 válido.');
    }
  }
}
