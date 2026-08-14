// supabase/functions/agents-orchestrator/agents/ag006/renderer/renderer.types.ts
// Renderer Domain Types for AG-006.3 (FORM-RENDER-001)

import type { FormDefinitionContract, FormFamily, FieldType, ConditionalRule } from '../form-definition/form-definition.types.ts';

export const RENDERER_VERSION = 'FORM-RENDER-001';

export interface RenderedFieldOptions {
  label: string;
  value: string;
}

export interface RenderedField {
  code: string;
  label: string;
  field_type: FieldType;
  html_element: string;
  required: boolean;
  order: number;
  source: 'INPUT' | 'CONTEXT';
  persist_response: boolean;
  storage_type: 'RESPONSE' | 'EVIDENCE';
  placeholder?: string;
  help_text?: string;
  min_value?: number;
  max_value?: number;
  min_length?: number;
  max_length?: number;
  options?: RenderedFieldOptions[];
  visibility_rule?: ConditionalRule;
  is_visible: boolean;
  requires_renderer_extension?: boolean;
  unsupported_type_error?: boolean;
  source_reference?: {
    sheet?: string;
    cell_range?: string;
  };
}

export interface RenderedSection {
  code: string;
  title: string;
  description?: string;
  order: number;
  instructions?: string;
  fields: RenderedField[];
}

export interface RenderedForm {
  schema_version: 'FORM-DEFINITION-001';
  renderer_version: typeof RENDERER_VERSION;
  form_code: string;
  form_name: string;
  form_type: FormFamily;
  target_response_table: string;
  sections: RenderedSection[];
  total_fields: number;
  unsupported_fields_count: number;
  requires_human_review: boolean;
  warnings: string[];
}

export interface RuleEvaluationResult {
  is_visible: boolean;
  is_valid_rule: boolean;
  error_code?: 'INVALID_CONDITIONAL_RULE';
  message?: string;
}
