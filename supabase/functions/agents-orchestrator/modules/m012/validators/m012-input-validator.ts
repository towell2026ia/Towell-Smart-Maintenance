// supabase/functions/agents-orchestrator/modules/m012/validators/m012-input-validator.ts
// Input Validator for M-012 OT Preparation Engine (v1.0)
// Frozen under Token: M012-DATA-MAP-001
// Invariant: Enforce request validity and sanitize inputs (§9 PRD-M-012.2)

import type { M012ExecutionRequest } from '../types/m012.types.ts';

export class M012InputValidator {
  public static validate(request: M012ExecutionRequest): { isValid: boolean; error?: string } {
    if (!request) {
      return { isValid: false, error: '[M012_INPUT_ERROR] Request payload no puede ser nulo o indefinido.' };
    }

    if (!request.work_order_id || typeof request.work_order_id !== 'string' || request.work_order_id.trim() === '') {
      return { isValid: false, error: '[M012_INPUT_ERROR] work_order_id es obligatorio para preparar una orden de trabajo.' };
    }

    // Prevent malicious client injection
    const rawReq = request as any;
    if (rawReq.sql || rawReq.where || rawReq.drop || rawReq.service_key) {
      return { isValid: false, error: '[M012_SECURITY_REJECTION] Parámetros no autorizados detectados en la solicitud.' };
    }

    if (request.evaluation_at && isNaN(Date.parse(request.evaluation_at))) {
      return { isValid: false, error: '[M012_INPUT_ERROR] evaluation_at debe ser un timestamp ISO 8601 válido.' };
    }

    return { isValid: true };
  }
}
