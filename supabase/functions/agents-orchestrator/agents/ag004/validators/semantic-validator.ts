// supabase/functions/agents-orchestrator/agents/ag004/validators/semantic-validator.ts
// Strict Semantic Validator for AG-004 Output Contract (AG004-SEMANTIC-001)

import { AutonomousSemanticOutputPayload } from '../contracts/semantic-output.contract.ts';
import { isValidAutonomousPatternCode } from '../catalog/pattern-catalog.ts';
import { OFFICIAL_5_BLOCKS } from '../rules/checklist-validation.rules.ts';

export interface SemanticValidationResult {
  isValid: boolean;
  errorCode?: string;
  errorMessage?: string;
  cleanedPayload?: AutonomousSemanticOutputPayload;
}

export function validateAutonomousSemanticOutput(
  rawPayload: any,
  expectedMachineId: string
): SemanticValidationResult {
  if (!rawPayload || typeof rawPayload !== 'object' || Array.isArray(rawPayload)) {
    return {
      isValid: false,
      errorCode: 'INVALID_SEMANTIC_OBJECT',
      errorMessage: 'El payload de respuesta semántica no es un objeto JSON válido.'
    };
  }

  // 1. Security Check: Forbidden privilege keys
  const forbiddenSecurityKeys = [
    'force_schedule', 'skip_temperature', 'create_ot', 'finding_confirmed',
    'skip_approval', 'execute_sql', 'change_week', 'override_date'
  ];
  for (const k of forbiddenSecurityKeys) {
    if (k in rawPayload && rawPayload[k] !== undefined && rawPayload[k] !== false && rawPayload[k] !== null) {
      return {
        isValid: false,
        errorCode: 'UNAUTHORIZED_PRIVILEGE_ATTEMPT',
        errorMessage: `Parámetro de autoridad prohibido detectado en la salida semántica: '${k}'.`
      };
    }
  }

  // 2. Machine ID validation
  const normExpected = String(expectedMachineId).trim().toUpperCase();
  const rawMachine = String(rawPayload.machine_id || '').trim().toUpperCase();
  if (rawMachine !== normExpected) {
    return {
      isValid: false,
      errorCode: 'MACHINE_ID_MISMATCH',
      errorMessage: `El machine_id devuelto por MiMo ('${rawMachine}') no coincide con el esperado ('${normExpected}').`
    };
  }

  // 3. String fields validation
  if (!rawPayload.executive_summary || typeof rawPayload.executive_summary !== 'string') {
    return {
      isValid: false,
      errorCode: 'MISSING_EXECUTIVE_SUMMARY',
      errorMessage: 'El campo executive_summary es obligatorio y debe ser un texto.'
    };
  }
  if (!rawPayload.historical_context_summary || typeof rawPayload.historical_context_summary !== 'string') {
    return {
      isValid: false,
      errorCode: 'MISSING_HISTORICAL_SUMMARY',
      errorMessage: 'El campo historical_context_summary es obligatorio y debe ser un texto.'
    };
  }

  // 4. Pattern codes validation
  if (!Array.isArray(rawPayload.pattern_codes)) {
    return {
      isValid: false,
      errorCode: 'INVALID_PATTERN_CODES',
      errorMessage: 'El campo pattern_codes debe ser un arreglo de códigos de patrón.'
    };
  }
  for (const code of rawPayload.pattern_codes) {
    if (!isValidAutonomousPatternCode(code)) {
      return {
        isValid: false,
        errorCode: 'UNKNOWN_PATTERN_CODE',
        errorMessage: `Código de patrón no autorizado o desconocido: '${code}'. Debe pertenecer a AG004-PATTERN-CATALOG-001.`
      };
    }
  }

  // 5. Inspection focus validation
  if (!Array.isArray(rawPayload.inspection_focus)) {
    return {
      isValid: false,
      errorCode: 'INVALID_INSPECTION_FOCUS',
      errorMessage: 'El campo inspection_focus debe ser un arreglo de bloques autorizados.'
    };
  }
  const allowedBlocksSet = new Set(OFFICIAL_5_BLOCKS);
  for (const block of rawPayload.inspection_focus) {
    if (!allowedBlocksSet.has(block)) {
      return {
        isValid: false,
        errorCode: 'INVALID_FOCUS_BLOCK',
        errorMessage: `Bloque de inspección no válido: '${block}'. Solo se permiten: ${OFFICIAL_5_BLOCKS.join(', ')}.`
      };
    }
  }

  // 6. Source references validation
  if (!Array.isArray(rawPayload.source_references)) {
    return {
      isValid: false,
      errorCode: 'INVALID_SOURCE_REFERENCES',
      errorMessage: 'El campo source_references debe ser un arreglo de fuentes citadas.'
    };
  }

  return {
    isValid: true,
    cleanedPayload: {
      machine_id: normExpected,
      executive_summary: String(rawPayload.executive_summary),
      historical_context_summary: String(rawPayload.historical_context_summary),
      pattern_codes: rawPayload.pattern_codes,
      inspection_focus: rawPayload.inspection_focus,
      attention_notes: Array.isArray(rawPayload.attention_notes) ? rawPayload.attention_notes : [],
      data_quality_warnings: Array.isArray(rawPayload.data_quality_warnings) ? rawPayload.data_quality_warnings : [],
      technical_context: Array.isArray(rawPayload.technical_context) ? rawPayload.technical_context : [],
      source_references: rawPayload.source_references,
      requires_human_review: Boolean(rawPayload.requires_human_review)
    }
  };
}
