// supabase/functions/agents-orchestrator/agents/ag012/validators/ag012-output-validator.ts
// Canonical Output Validator for AG-012 (v1.0)
// Frozen under Token: AG012-OUTPUT-001

import type { AG012ExecutionResponse } from '../types/ag012.types.ts';

export class AG012OutputValidator {
  public static validate(response: AG012ExecutionResponse): void {
    if (!response || !response.success) {
      throw new Error('[AG012_OUTPUT_ERROR] Respuesta nula o no exitosa.');
    }

    if (response.agent_id !== 'AG-012') {
      throw new Error('[AG012_OUTPUT_ERROR] agent_id debe ser exactamente AG-012.');
    }

    if (!response.package || !response.package.asset_id || !response.package.recommendation) {
      throw new Error('[AG012_OUTPUT_ERROR] Paquete de recomendación incompleto.');
    }

    const validOptions = ['REPAIR', 'RENEW', 'REPLACE', 'INSUFFICIENT_DATA', 'HUMAN_REVIEW_REQUIRED'];
    if (!validOptions.includes(response.package.recommendation)) {
      throw new Error(`[AG012_OUTPUT_ERROR] Opción de recomendación inválida: ${response.package.recommendation}`);
    }

    if (response.package.requires_human_approval !== true) {
      throw new Error('[AG012_OUTPUT_ERROR] requires_human_approval debe ser estrictamente true.');
    }
  }
}
