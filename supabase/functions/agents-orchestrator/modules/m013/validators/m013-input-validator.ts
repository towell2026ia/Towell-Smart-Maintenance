// supabase/functions/agents-orchestrator/modules/m013/validators/m013-input-validator.ts
// Input Validator and Client Injection Defense for M-013 (v1.0)
// Frozen under Token: M013-INPUT-VALIDATION-001

import type { M013ExecutionRequest } from '../types/m013.types.ts';

export class M013InputValidator {
  public static validate(input: M013ExecutionRequest): void {
    if (!input) {
      throw new Error('[M013_INPUT_ERROR] El payload de solicitud no puede ser nulo.');
    }
    if (!input.work_order_id || typeof input.work_order_id !== 'string' || input.work_order_id.trim() === '') {
      throw new Error('[M013_INPUT_ERROR] work_order_id es obligatorio para ejecutar el control de seguridad.');
    }

    const payloadStr = JSON.stringify(input);
    const sqlKeywords = ['DROP TABLE', 'DELETE FROM', 'INSERT INTO', 'UPDATE public.', ';--', 'UNION SELECT'];
    for (const kw of sqlKeywords) {
      if (payloadStr.toUpperCase().includes(kw)) {
        throw new Error(`[M013_SECURITY_REJECTION] Inyección maliciosa detectada (${kw}).`);
      }
    }

    if (input.evaluation_at && isNaN(Date.parse(input.evaluation_at))) {
      throw new Error('[M013_INPUT_ERROR] evaluation_at debe ser un timestamp ISO 8601 válido.');
    }
  }
}
