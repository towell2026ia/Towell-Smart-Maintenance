// supabase/functions/agents-orchestrator/agents/ag006/semantic/semantic-output.types.ts
// Contract Definitions for AG006-SEMANTIC-001 v1.0

import type { FieldType, FormFamily } from '../form-definition/form-definition.types.ts';

export type ReasonCode =
  | 'BINARY_INSPECTION_STATE'
  | 'CLOSED_OPTION_LIST'
  | 'NUMERIC_MEASUREMENT'
  | 'FREE_TEXT_OBSERVATION'
  | 'CONTEXTUAL_INFORMATION'
  | 'EVIDENCE_FIELD'
  | 'DATE_FIELD'
  | 'DATETIME_FIELD'
  | 'AMBIGUOUS_SEMANTICS'
  | 'INSUFFICIENT_CONTEXT'
  | 'UNSUPPORTED_COMPONENT'
  | 'POSSIBLE_INSTRUCTION';

export interface SourceReference {
  sheet: string;
  cell: string;
}

export interface ProposedMapping {
  source_reference: SourceReference;
  proposed_field_type: FieldType;
  proposed_label: string;
  proposed_options?: string[];
  confidence: number;
  ambiguity_remaining: boolean;
  requires_human_review: boolean;
  reason_code: ReasonCode;
}

export interface SemanticOutputPackage {
  schema_version: 'AG006-SEMANTIC-001';
  mappings: ProposedMapping[];
  warnings?: string[];
}

export interface SemanticExecutionResult {
  status: 'SEMANTIC_MAPPING_COMPLETE' | 'HUMAN_REVIEW_REQUIRED' | 'PROVIDER_DISABLED' | 'FAILED_RETRYABLE';
  agent_id: 'AG-006';
  ambiguous_elements_received: number;
  resolved_by_ai: number;
  remaining_ambiguous: number;
  semantic_repairs: number;
  technical_retries: number;
  requires_human_review: boolean;
  llm_used: boolean;
  provider: string | null;
  model: string | null;
  output_package?: SemanticOutputPackage;
  tokens?: {
    input_tokens: number;
    output_tokens: number;
    cached_input_tokens: number;
    estimated_cost_usd: number;
  };
  latency_ms?: number;
}
