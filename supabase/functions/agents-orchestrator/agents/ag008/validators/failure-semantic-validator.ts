// supabase/functions/agents-orchestrator/agents/ag008/validators/failure-semantic-validator.ts
// Strict Semantic Output Validator for AG-008 (v1.0)
// Frozen under Token: AG008-SEMANTIC-001

import type { SemanticFailureOutputPayload } from '../contracts/ag008-semantic-output.contract.ts';
import { isValidFailurePatternCode } from '../catalog/pattern-codes.catalog.ts';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

const PROHIBITED_PHRASES = [
  'la causa raiz es',
  'la causa raíz es',
  'cinco porqués',
  '5 porqués',
  'es un mal actor confirmado',
  'bad actor confirmado',
  'se autoriza compra',
  'crear orden de trabajo',
  'crear ot',
  'costo de mantenimiento calculado en'
];

export function validateFailureSemanticOutput(payload: any): ValidationResult {
  const errors: string[] = [];

  if (!payload || typeof payload !== 'object') {
    return { isValid: false, errors: ['El payload semántico no es un objeto JSON válido.'] };
  }

  // Required string fields
  if (typeof payload.executive_summary !== 'string' || !payload.executive_summary.trim()) {
    errors.push("Campo requerido 'executive_summary' no es un string válido.");
  }
  if (typeof payload.failure_pattern_summary !== 'string' || !payload.failure_pattern_summary.trim()) {
    errors.push("Campo requerido 'failure_pattern_summary' no es un string válido.");
  }

  // Arrays
  if (!Array.isArray(payload.concentration_summary)) {
    errors.push("Campo 'concentration_summary' debe ser un arreglo.");
  }
  if (!Array.isArray(payload.alert_explanations)) {
    errors.push("Campo 'alert_explanations' debe ser un arreglo.");
  }
  if (!Array.isArray(payload.data_quality_warnings)) {
    errors.push("Campo 'data_quality_warnings' debe ser un arreglo.");
  }
  if (!Array.isArray(payload.recommended_review_topics)) {
    errors.push("Campo 'recommended_review_topics' debe ser un arreglo.");
  }
  if (!Array.isArray(payload.pattern_codes)) {
    errors.push("Campo 'pattern_codes' debe ser un arreglo.");
  } else {
    for (const code of payload.pattern_codes) {
      if (!isValidFailurePatternCode(code)) {
        errors.push(`Código de patrón no autorizado en catálogo: '${code}'.`);
      }
    }
  }

  // Check prohibited boundary violations
  const fullText = JSON.stringify(payload).toLowerCase();
  for (const phrase of PROHIBITED_PHRASES) {
    if (fullText.includes(phrase)) {
      errors.push(`Violación de frontera detectada: frase prohibida '${phrase}' encontrada en salida semántica.`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
