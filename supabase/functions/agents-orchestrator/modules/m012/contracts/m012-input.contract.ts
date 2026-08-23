// supabase/functions/agents-orchestrator/modules/m012/contracts/m012-input.contract.ts
// Canonical Input Contract for M-012 OT Preparation Engine (v1.0)
// Frozen under Token: M012-DATA-MAP-001

import type { M012ExecutionRequest } from '../types/m012.types.ts';

export const M012_INPUT_SCHEMA = {
  type: 'object',
  properties: {
    request_id: { type: 'string', description: 'Identificador único de la solicitud' },
    work_order_id: { type: 'string', description: 'Identificador oficial de la OT existente' },
    asset_id: { type: 'string', description: 'Código de máquina / activo' },
    evaluation_at: { type: 'string', format: 'date-time', description: 'Timestamp temporal de evaluación' },
    consumer: { type: 'string', description: 'Identificador del consumidor (UI, AG-009, M-013)' }
  },
  required: ['work_order_id'],
  additionalProperties: true
};

export class M012InputValidator {
  public static validate(input: M012ExecutionRequest): void {
    if (!input) {
      throw new Error('[M012_INPUT_ERROR] Request payload no puede ser nulo o indefinido.');
    }
    if (!input.work_order_id || typeof input.work_order_id !== 'string' || input.work_order_id.trim() === '') {
      throw new Error('[M012_INPUT_ERROR] work_order_id es obligatorio para preparar una orden de trabajo.');
    }
    if (input.evaluation_at && isNaN(Date.parse(input.evaluation_at))) {
      throw new Error('[M012_INPUT_ERROR] evaluation_at debe ser un timestamp ISO 8601 válido.');
    }
  }
}
