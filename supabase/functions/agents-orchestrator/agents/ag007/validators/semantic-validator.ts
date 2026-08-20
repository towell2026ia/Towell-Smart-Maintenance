// supabase/functions/agents-orchestrator/agents/ag007/validators/semantic-validator.ts
// Semantic Output Validator for AG-007 (v1.0)
// Frozen under Token: AG007-SEMANTIC-LAYER-001
// Invariant: Strict schema and closed pattern catalog (§84-88 PRD)

import type { SemanticOutputPayload } from '../contracts/ag007-semantic-output.contract.ts';
import { isAuthorizedPattern } from '../catalog/pattern-catalog.ts';

export interface ValidationReport {
  isValid: boolean;
  errors: string[];
  patternViolations: string[];
  unsupportedClaimsCount: number;
}

export function validateSemanticOutput(output: any): ValidationReport {
  const errors: string[] = [];
  const patternViolations: string[] = [];
  let unsupportedClaimsCount = 0;

  if (!output || typeof output !== 'object') {
    return {
      isValid: false,
      errors: ['La salida semántica debe ser un objeto JSON no nulo.'],
      patternViolations: [],
      unsupportedClaimsCount: 0
    };
  }

  // Required string fields
  const requiredStrings = ['period', 'scope', 'executive_summary', 'budget_status_explanation', 'variance_explanation', 'forecast_explanation'];
  for (const f of requiredStrings) {
    if (typeof output[f] !== 'string' || output[f].trim().length === 0) {
      errors.push(`Campo requerido ausente o no es string: '${f}'`);
    }
  }

  // Pattern codes validation
  if (!Array.isArray(output.pattern_codes)) {
    errors.push("El campo 'pattern_codes' debe ser un arreglo.");
  } else {
    for (const code of output.pattern_codes) {
      if (!isAuthorizedPattern(code)) {
        patternViolations.push(code);
        errors.push(`Código de patrón no autorizado: '${code}'`);
      }
    }
  }

  // Arrays validation
  const requiredArrays = ['cost_driver_summary', 'alert_explanations', 'data_quality_warnings', 'management_notes', 'source_references'];
  for (const f of requiredArrays) {
    if (!Array.isArray(output[f])) {
      errors.push(`Campo requerido ausente o no es arreglo: '${f}'`);
    }
  }

  // Prohibited actions check in executive summary and management notes
  const forbiddenKeywords = ['comprar', 'autorizo', 'aprobar gasto', 'crear orden de trabajo', 'orden de compra', 'cambiar proveedor'];
  const fullText = `${output.executive_summary || ''} ${(output.management_notes || []).join(' ')}`.toLowerCase();

  for (const kw of forbiddenKeywords) {
    if (fullText.includes(kw)) {
      // Check if it's a direct prohibited action
      if (fullText.includes(`se debe ${kw}`) || fullText.includes(`se autoriza`) || fullText.includes(`proceder a ${kw}`)) {
        errors.push(`Salida contiene intento de acción prohibida o recomendación de compra: '${kw}'`);
        unsupportedClaimsCount++;
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    patternViolations,
    unsupportedClaimsCount
  };
}
