// supabase/functions/agents-orchestrator/agents/ag006/semantic/semantic-validator.ts
// Deterministic Semantic Output Validator FORM-SEM-VAL-001 v1.0

import type { SemanticOutputPackage, ProposedMapping } from './semantic-output.types.ts';
import type { SemanticContextPackage } from './semantic-context.ts';
import type { FormDefinitionContract } from '../form-definition/form-definition.types.ts';
import { ALLOWED_FIELD_TYPES } from '../renderer/field-renderer-registry.ts';

export interface SemanticValidationError {
  code: 'INVALID_SCHEMA' | 'UNTRACEABLE_MODEL_OUTPUT' | 'MODEL_OVERRIDE_FORBIDDEN' | 'INVALID_FIELD_TYPE' | 'INVALID_REASON_CODE';
  message: string;
  source_reference?: { sheet: string; cell: string };
}

export interface SemanticValidationResult {
  isValid: boolean;
  errors: SemanticValidationError[];
  sanitizedPackage: SemanticOutputPackage | null;
}

export function validateSemanticOutputPackage(
  outputPkg: any,
  contextPkg: SemanticContextPackage,
  formDraft: FormDefinitionContract
): SemanticValidationResult {
  const errors: SemanticValidationError[] = [];

  if (!outputPkg || outputPkg.schema_version !== 'AG006-SEMANTIC-001' || !Array.isArray(outputPkg.mappings)) {
    return {
      isValid: false,
      errors: [{ code: 'INVALID_SCHEMA', message: 'Respuesta semántica no cumple con el contrato AG006-SEMANTIC-001.' }],
      sanitizedPackage: null
    };
  }

  // Build lookup sets for valid input cells and deterministic fields
  const validContextCells = new Set(
    contextPkg.ambiguous_elements.map(e => `${e.source_reference.sheet}!${e.source_reference.cell}`)
  );

  const deterministicResolvedCells = new Set<string>();
  for (const section of formDraft.form.sections) {
    for (const field of section.fields) {
      if (
        field.deterministic_status &&
        field.deterministic_status !== 'AMBIGUOUS_FIELD' &&
        field.deterministic_status !== 'UNRESOLVED_MAPPING'
      ) {
        deterministicResolvedCells.add(`${field.source_reference.sheet}!${field.source_reference.cell}`);
      }
    }
  }

  const sanitizedMappings: ProposedMapping[] = [];

  for (const item of outputPkg.mappings) {
    const refKey = `${item.source_reference?.sheet}!${item.source_reference?.cell}`;

    // Anti-Hallucination Rule 1: Cell MUST exist in SEMANTIC_CONTEXT
    if (!validContextCells.has(refKey)) {
      errors.push({
        code: 'UNTRACEABLE_MODEL_OUTPUT',
        message: `La propuesta para '${refKey}' hace referencia a una celda inexistente en el contexto de entrada.`,
        source_reference: item.source_reference
      });
      continue;
    }

    // Deterministic Precedence Rule 2: Model CANNOT override deterministic mappings
    if (deterministicResolvedCells.has(refKey)) {
      errors.push({
        code: 'MODEL_OVERRIDE_FORBIDDEN',
        message: `Se prohibe la sobrescritura determinística para la celda '${refKey}'.`,
        source_reference: item.source_reference
      });
      continue;
    }

    // Closed Field Types Catalog Rule 3
    if (!ALLOWED_FIELD_TYPES.includes(item.proposed_field_type)) {
      errors.push({
        code: 'INVALID_FIELD_TYPE',
        message: `Tipo de campo propuesto '${item.proposed_field_type}' no pertenece al catálogo de 18 tipos.`,
        source_reference: item.source_reference
      });
      continue;
    }

    sanitizedMappings.push({
      source_reference: item.source_reference,
      proposed_field_type: item.proposed_field_type,
      proposed_label: item.proposed_label || 'Campo Sin Etiqueta',
      proposed_options: Array.isArray(item.proposed_options) ? item.proposed_options : [],
      confidence: typeof item.confidence === 'number' ? Math.min(Math.max(item.confidence, 0), 1) : 0.5,
      ambiguity_remaining: Boolean(item.ambiguity_remaining),
      requires_human_review: true, // Always true for AI mappings in AG-006 v1.0
      reason_code: item.reason_code || 'AMBIGUOUS_SEMANTICS'
    });
  }

  const isValid = errors.length === 0;

  return {
    isValid,
    errors,
    sanitizedPackage: isValid ? { schema_version: 'AG006-SEMANTIC-001', mappings: sanitizedMappings, warnings: outputPkg.warnings || [] } : null
  };
}
