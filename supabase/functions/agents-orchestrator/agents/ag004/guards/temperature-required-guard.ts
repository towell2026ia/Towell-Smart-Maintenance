// supabase/functions/agents-orchestrator/agents/ag004/guards/temperature-required-guard.ts
// Strict Temperature Required Guard for AG-004 (§68-73 PRD)

export interface TemperatureValidationResult {
  isValid: boolean;
  value?: number;
  errorCode?: string;
  errorMessage?: string;
}

export function validateMandatoryTemperature(rawTemp: any): TemperatureValidationResult {
  if (rawTemp === null || rawTemp === undefined || rawTemp === '') {
    return {
      isValid: false,
      errorCode: 'MANDATORY_TEMPERATURE_VALUE_MISSING',
      errorMessage: 'La medición cuantitativa de Temperatura (°C) es obligatoria y no puede ser nula ni omitida.'
    };
  }

  // If string, check if it's a valid numeric representation
  if (typeof rawTemp === 'string') {
    const trimmed = rawTemp.trim();
    const parsed = Number(trimmed);
    if (isNaN(parsed) || trimmed.length === 0) {
      return {
        isValid: false,
        errorCode: 'INVALID_NUMERIC_RESPONSE',
        errorMessage: `El valor de temperatura '${rawTemp}' no es un número válido en escala Celsius (°C).`
      };
    }
    return {
      isValid: true,
      value: parsed
    };
  }

  if (typeof rawTemp === 'number') {
    if (isNaN(rawTemp) || !isFinite(rawTemp)) {
      return {
        isValid: false,
        errorCode: 'INVALID_NUMERIC_RESPONSE',
        errorMessage: 'El valor de temperatura no es un número finito válido.'
      };
    }
    return {
      isValid: true,
      value: rawTemp
    };
  }

  return {
    isValid: false,
    errorCode: 'INVALID_NUMERIC_RESPONSE',
    errorMessage: `Tipo de dato inválido para temperatura: ${typeof rawTemp}.`
  };
}
