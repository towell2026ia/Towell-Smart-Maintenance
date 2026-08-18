// supabase/functions/agents-orchestrator/agents/ag002/validators/semantic-validator.ts
// Semantic Output Validator for AG002-SEMANTIC-001 (§49, §81, §82 PRD)

import { SemanticOutputPayload } from '../types/ag002-semantic.types.ts';
import { isValidPatternCode } from '../catalog/pattern-catalog.ts';

export interface SemanticValidationResult {
  isValid: boolean;
  errors: string[];
  repairedPayload?: SemanticOutputPayload;
}

export function validateSemanticOutput(
  rawOutput: any,
  expectedMachineId: string
): SemanticValidationResult {
  const errors: string[] = [];

  if (!rawOutput || typeof rawOutput !== 'object') {
    return { isValid: false, errors: ['SEMANTIC_OUTPUT_INVALID: Respuesta nula o no es un objeto JSON.'] };
  }

  // 1. Machine ID check
  if (typeof rawOutput.machine_id !== 'string' || rawOutput.machine_id.trim().toUpperCase() !== expectedMachineId.trim().toUpperCase()) {
    errors.push(`SEMANTIC_MACHINE_MISMATCH: machine_id esperado '${expectedMachineId}', recibido '${rawOutput.machine_id}'.`);
  }

  // 2. Required string fields
  if (typeof rawOutput.executive_summary !== 'string' || rawOutput.executive_summary.trim().length === 0) {
    errors.push('SEMANTIC_MISSING_EXECUTIVE_SUMMARY: executive_summary es obligatorio.');
  }

  if (typeof rawOutput.priority_explanation !== 'string' || rawOutput.priority_explanation.trim().length === 0) {
    errors.push('SEMANTIC_MISSING_PRIORITY_EXPLANATION: priority_explanation es obligatorio.');
  }

  if (typeof rawOutput.recommendation !== 'string' || rawOutput.recommendation.trim().length === 0) {
    errors.push('SEMANTIC_MISSING_RECOMMENDATION: recommendation es obligatorio.');
  }

  // 3. Pattern Codes check (Closed Catalog)
  const patternCodes: any[] = Array.isArray(rawOutput.pattern_codes) ? rawOutput.pattern_codes : [];
  for (const code of patternCodes) {
    if (!isValidPatternCode(String(code))) {
      errors.push(`UNKNOWN_PATTERN_CODE: Código de patrón '${code}' fuera del catálogo cerrado.`);
    }
  }

  // 4. Arrays structure check
  if (!Array.isArray(rawOutput.preventive_focus)) {
    errors.push('SEMANTIC_INVALID_PREVENTIVE_FOCUS: preventive_focus debe ser un array.');
  }

  if (!Array.isArray(rawOutput.historical_observations)) {
    errors.push('SEMANTIC_INVALID_HISTORICAL_OBSERVATIONS: historical_observations debe ser un array.');
  }

  if (!Array.isArray(rawOutput.parts_observations)) {
    errors.push('SEMANTIC_INVALID_PARTS_OBSERVATIONS: parts_observations debe ser un array.');
  }

  if (!Array.isArray(rawOutput.data_quality_warnings)) {
    errors.push('SEMANTIC_INVALID_DATA_QUALITY_WARNINGS: data_quality_warnings debe ser un array.');
  }

  if (!Array.isArray(rawOutput.source_references)) {
    errors.push('SEMANTIC_INVALID_SOURCE_REFERENCES: source_references debe ser un array.');
  }

  if (typeof rawOutput.requires_human_review !== 'boolean') {
    errors.push('SEMANTIC_INVALID_REQUIRES_HUMAN_REVIEW: requires_human_review debe ser booleano.');
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    errors: [],
    repairedPayload: rawOutput as SemanticOutputPayload
  };
}
