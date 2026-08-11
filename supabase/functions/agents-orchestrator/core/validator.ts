// supabase/functions/agents-orchestrator/core/validator.ts

/**
 * Validador determinístico de payloads del cliente para eventos conocidos
 */
export function validateEventPayload(
  eventCode: string,
  payload: Record<string, any>,
  requiredFields: string[]
): { isValid: boolean; error: string | null } {
  if (!payload || typeof payload !== 'object') {
    return { isValid: false, error: 'El payload no es un objeto válido.' };
  }

  for (const field of requiredFields) {
    if (!(field in payload) || payload[field] === undefined || payload[field] === null || payload[field] === '') {
      return {
        isValid: false,
        error: `Falta el campo obligatorio '${field}' requerido para el evento '${eventCode}'.`
      };
    }
  }

  return { isValid: true, error: null };
}

/**
 * Validador determinístico de salidas generadas por agentes de IA (P-16)
 * Valida la firma del contrato y niveles mínimos de confianza.
 */
export function validateAgentOutput(
  agentId: string,
  output: any
): { isValid: boolean; error: string | null; confidence: number } {
  if (!output || typeof output !== 'object') {
    return { isValid: false, error: 'La respuesta del agente no es un JSON válido.', confidence: 0 };
  }

  // Validar campos del contrato obligatorio de cada agente
  const requiredKeys = ['status', 'findings', 'recommendations', 'requires_action', 'requires_approval'];
  for (const k of requiredKeys) {
    if (!(k in output)) {
      return {
        isValid: false,
        error: `La respuesta del agente no contiene la clave requerida '${k}'.`,
        confidence: 0
      };
    }
  }

  // Validar nivel de confianza semántica
  const confidence = typeof output.confidence === 'number' ? output.confidence : 1.0;
  if (confidence < 0.80) {
    return {
      isValid: false,
      error: `Confianza insuficiente del clasificador (${confidence} < 0.80).`,
      confidence
    };
  }

  // Si todo es correcto
  return { isValid: true, error: null, confidence };
}
