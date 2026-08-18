// supabase/functions/agents-orchestrator/agents/ag003/validators/semantic-validator.ts
// Semantic Output Validator for AG-003.3 (§80-82 PRD)

import { SemanticOutputPayload } from '../contracts/semantic-output.contract.ts';
import { isAuthorizedPattern, PredictivePatternCode } from '../catalog/pattern-catalog.ts';
import { PredictiveBlock } from '../types/ag003.types.ts';

export interface SemanticValidationResult {
  isValid: boolean;
  sanitizedOutput?: SemanticOutputPayload;
  errors: string[];
  warnings: string[];
}

const VALID_BLOCKS: PredictiveBlock[] = ['Electrónico', 'Mecánico', 'Limpieza', 'Lubricación'];

export function validateSemanticOutput(
  rawJson: any,
  expectedMachineId: string
): SemanticValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!rawJson || typeof rawJson !== 'object') {
    return {
      isValid: false,
      errors: ['El payload semántico recibido no es un objeto JSON válido.'],
      warnings: []
    };
  }

  // 1. Machine ID Check
  const machineId = String(rawJson.machine_id || '').trim().toUpperCase();
  if (!machineId) {
    errors.push('El campo "machine_id" es obligatorio en el output semántico.');
  } else if (machineId !== expectedMachineId.toUpperCase()) {
    errors.push(`Discrepancia en machine_id: se esperaba "${expectedMachineId}", pero MiMo devolvió "${machineId}".`);
  }

  // 2. Prohibited Operational Mutation Fields
  if (rawJson.finding_confirmed !== undefined || rawJson.physical_finding !== undefined || rawJson.create_ot !== undefined) {
    errors.push('Violación de frontera de seguridad: el modelo intentó emitir campos operativos de hallazgo/OT.');
  }

  // 3. Pattern Codes Validation
  const rawPatterns = Array.isArray(rawJson.pattern_codes) ? rawJson.pattern_codes : [];
  const validatedPatterns: PredictivePatternCode[] = [];
  for (const p of rawPatterns) {
    const pStr = String(p).trim();
    if (isAuthorizedPattern(pStr)) {
      validatedPatterns.push(pStr);
    } else {
      warnings.push(`Código de patrón no autorizado ignorado: "${pStr}".`);
    }
  }

  // 4. Inspection Focus Validation (Strict 4 Blocks)
  const rawFocus = Array.isArray(rawJson.inspection_focus) ? rawJson.inspection_focus : [];
  const validatedFocus: PredictiveBlock[] = [];
  for (const f of rawFocus) {
    const fStr = String(f).trim();
    const match = VALID_BLOCKS.find(b => b.toLowerCase() === fStr.toLowerCase());
    if (match) {
      if (!validatedFocus.includes(match)) validatedFocus.push(match);
    } else {
      errors.push(`Bloque de inspección no autorizado: "${fStr}". Bloques válidos: ${VALID_BLOCKS.join(', ')}.`);
    }
  }

  // Default to General Focus if none specified
  if (validatedFocus.length === 0 && errors.length === 0) {
    validatedFocus.push('Mecánico', 'Electrónico');
  }

  // 5. Required Textual Fields
  const summary = String(rawJson.executive_summary || '').trim();
  if (!summary) errors.push('El campo "executive_summary" es obligatorio.');

  const explanation = String(rawJson.selection_explanation || '').trim();
  if (!explanation) errors.push('El campo "selection_explanation" es obligatorio.');

  const recommendation = String(rawJson.recommendation || '').trim();
  if (!recommendation) errors.push('El campo "recommendation" es obligatorio.');

  if (errors.length > 0) {
    return {
      isValid: false,
      errors,
      warnings
    };
  }

  const sanitized: SemanticOutputPayload = {
    machine_id: expectedMachineId,
    executive_summary: summary,
    selection_explanation: explanation,
    pattern_codes: validatedPatterns,
    quality_interpretation: String(rawJson.quality_interpretation || '').trim(),
    historical_context_summary: String(rawJson.historical_context_summary || '').trim(),
    inspection_focus: validatedFocus,
    data_quality_warnings: Array.isArray(rawJson.data_quality_warnings) ? rawJson.data_quality_warnings.map((w: any) => String(w).trim()) : [],
    technical_observations: Array.isArray(rawJson.technical_observations) ? rawJson.technical_observations : [],
    recommendation,
    source_references: Array.isArray(rawJson.source_references) ? rawJson.source_references.map((r: any) => String(r).trim()) : [],
    requires_human_review: Boolean(rawJson.requires_human_review)
  };

  return {
    isValid: true,
    sanitizedOutput: sanitized,
    errors: [],
    warnings
  };
}
