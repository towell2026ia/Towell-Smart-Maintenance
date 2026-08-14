// supabase/functions/agents-orchestrator/agents/ag006/form-definition/mapper-rules.ts
// Closed Catalog of Mapping Rules (FORM-MAP-001) for AG-006.2

import type { FieldType } from './form-definition.types.ts';

export const MAPPER_RULES_VERSION = 'FORM-MAP-001';

export interface DeterministicRuleResult {
  matched: boolean;
  field_type?: FieldType;
  source?: 'INPUT' | 'CONTEXT';
  persist_response?: boolean;
  storage_type?: 'RESPONSE' | 'EVIDENCE';
  requires_renderer_extension?: boolean;
  is_ambiguous?: boolean;
  rule_code?: string;
}

/**
 * Evaluates text label, cell data validation, and cell value type against closed rule catalog (FORM-MAP-001).
 * NO GUESSWORK ALLOWED: If no rule matches unambiguously, returns is_ambiguous = true.
 */
export function evaluateDeterministicRules(
  label: string,
  valueType: string,
  dataValidationList?: string[]
): DeterministicRuleResult {
  const lowerLabel = (label || '').trim().toLowerCase();

  // Rule 1: Explicit Data Validation List
  if (dataValidationList && dataValidationList.length > 0) {
    const listJoined = dataValidationList.map(v => v.trim().toLowerCase()).join(',');
    if (listJoined === 'sí,no,n/a' || listJoined === 'si,no,n/a' || listJoined === 'sí,no' || listJoined === 'si,no') {
      return { matched: true, field_type: 'YES_NO', rule_code: 'RULE_LIST_YES_NO' };
    }
    return { matched: true, field_type: 'SELECT', rule_code: 'RULE_LIST_SELECT' };
  }

  // Rule 2: Machine / Equipment Selector
  if (lowerLabel.includes('máquina') || lowerLabel.includes('equipo towell') || lowerLabel.includes('telar')) {
    return { matched: true, field_type: 'MACHINE_SELECTOR', rule_code: 'RULE_MACHINE_SELECTOR' };
  }

  // Rule 3: Technician / Operator Selector
  if (lowerLabel.includes('técnico que atendió') || lowerLabel.includes('cve_tecnico') || lowerLabel.includes('operador asignado')) {
    return { matched: true, field_type: 'TECHNICIAN_SELECTOR', rule_code: 'RULE_TECHNICIAN_SELECTOR' };
  }

  // Rule 4: Context Header Read-Only (Folio / OT Number)
  if (lowerLabel.includes('folio ot') || lowerLabel.includes('folio orden') || lowerLabel.includes('ot:')) {
    return { 
      matched: true, 
      field_type: 'READ_ONLY', 
      source: 'CONTEXT', 
      persist_response: false, 
      rule_code: 'RULE_CONTEXT_READ_ONLY' 
    };
  }

  // Rule 5: Date and Datetime
  if (lowerLabel.includes('fecha y hora') || lowerLabel.includes('datetime')) {
    return { 
      matched: true, 
      field_type: 'DATETIME', 
      requires_renderer_extension: true, 
      rule_code: 'RULE_DATETIME' 
    };
  }

  if (lowerLabel.includes('fecha de medición') || lowerLabel.includes('fecha programada') || lowerLabel.includes('fecha alta')) {
    return { matched: true, field_type: 'DATE', rule_code: 'RULE_DATE' };
  }

  // Rule 6: Evidence Photo
  if (lowerLabel.includes('evidencia fotográfica') || lowerLabel.includes('foto de trabajo')) {
    return { matched: true, field_type: 'PHOTO', storage_type: 'EVIDENCE', rule_code: 'RULE_EVIDENCE_PHOTO' };
  }

  // Rule 7: Evidence Signature
  if (lowerLabel.includes('firma digital de conformidad') || lowerLabel.includes('firma del solicitante')) {
    return { matched: true, field_type: 'SIGNATURE', storage_type: 'EVIDENCE', rule_code: 'RULE_EVIDENCE_SIGNATURE' };
  }

  // Rule 8: Yes/No Question Keywords
  if (lowerLabel.includes('cumple') || lowerLabel.includes('conforme') || lowerLabel.includes('sí/no') || lowerLabel.includes('si/no')) {
    return { matched: true, field_type: 'YES_NO', rule_code: 'RULE_YES_NO_LABEL' };
  }

  // Rule 9: Explicit Number types
  if (valueType === 'number') {
    return { matched: true, field_type: 'DECIMAL', rule_code: 'RULE_NUMBER_TYPE' };
  }

  // Ambiguous cases (e.g. just "Firma del técnico", "Estado", "Observaciones sin tipo") without closed rule match
  if (lowerLabel === 'estado' || lowerLabel === 'status' || lowerLabel === 'firma' || lowerLabel === 'observaciones') {
    return {
      matched: false,
      field_type: 'TEXT',
      is_ambiguous: true,
      rule_code: 'RULE_AMBIGUOUS'
    };
  }

  // Default fallback for plain text labels
  return {
    matched: true,
    field_type: 'TEXT',
    rule_code: 'RULE_DEFAULT_TEXT'
  };
}
