// supabase/functions/agents-orchestrator/agents/ag006/types/ag006.types.ts
// Refined Domain Types for AG-006 Constructor de Formularios v1.1

export type FormFamily = 
  | 'OT_CHECKLIST'
  | 'LEVANTAMIENTO_PREDICTIVO'
  | 'LEVANTAMIENTO_AUTONOMO'
  | 'BITACORA_LEVANTAMIENTO'
  | 'REQUISICION_OT'
  | 'FORMULARIO_GENERICO';

export type TargetResponseTable =
  | 'respuestas_checklist_orden'
  | 'respuestas_checklist_predictivo'
  | 'respuestas_checklist_autonomo'
  | 'solicitudes_mantenimiento';

export type FieldType = 
  | 'TEXT'
  | 'TEXTAREA'
  | 'INTEGER'
  | 'DECIMAL'
  | 'DATE'
  | 'DATETIME'
  | 'BOOLEAN'
  | 'YES_NO'
  | 'SELECT'
  | 'MULTISELECT'
  | 'CHECKBOX'
  | 'RADIO'
  | 'PHOTO'
  | 'FILE'
  | 'SIGNATURE'
  | 'MACHINE_SELECTOR'
  | 'TECHNICIAN_SELECTOR'
  | 'READ_ONLY';

export type DraftStatus = 
  | 'DRAFT'
  | 'IN_REVIEW'
  | 'APPROVED'
  | 'PUBLISHED'
  | 'SUPERSEDED'
  | 'ARCHIVED';

export interface SelectOption {
  value: string;
  label: string;
}

export interface FieldValidationRule {
  required?: boolean;
  min?: number;
  max?: number;
  min_length?: number;
  max_length?: number;
  pattern?: string;
  allowed_values?: string[];
  date_min?: string;
  date_max?: string;
  requires_renderer_extension?: boolean;
}

export interface ConditionalRule {
  when: {
    field: string;
    operator: 'EQUALS' | 'NOT_EQUALS' | 'CONTAINS' | 'GREATER_THAN' | 'LESS_THAN';
    value: any;
  };
  action: {
    type: 'SHOW' | 'HIDE' | 'REQUIRE' | 'DISABLE';
    target: string;
  };
}

export interface FormFieldDefinition {
  code: string;
  label: string;
  field_type: FieldType;
  required: boolean;
  order: number;
  source?: 'INPUT' | 'CONTEXT';
  persist_response?: boolean;
  default_value?: any;
  help_text?: string;
  placeholder?: string;
  options?: SelectOption[];
  validation?: FieldValidationRule;
  visibility_rule?: ConditionalRule;
  source_reference?: {
    sheet: string;
    cell_range: string;
  };
}

export interface FormSectionDefinition {
  code: string;
  title: string;
  description?: string;
  order: number;
  fields: FormFieldDefinition[];
}

export interface FormDefinition {
  schema_version: 'FORM-DEFINITION-001';
  form_code: string;
  title: string;
  form_family: FormFamily;
  target_response_table: TargetResponseTable;
  version: string;
  sections: FormSectionDefinition[];
  metadata?: {
    source_file_name?: string;
    source_file_hash?: string;
    author?: string;
    department?: string;
    has_macros_detected?: boolean;
    macros_logged?: string[];
  };
}

export interface IntermediateCell {
  address: string;
  value: any;
  formula?: string;
  data_type?: string;
}

export interface IntermediateRegion {
  range: string;
  label?: string;
  cells: IntermediateCell[];
}

export interface IntermediateSheet {
  name: string;
  regions: IntermediateRegion[];
}

export interface IntermediateRepresentation {
  workbook_name: string;
  file_hash: string;
  has_macros: boolean;
  macro_names?: string[];
  sheets: IntermediateSheet[];
}

export interface AG006AuditResult {
  status: 'PARSER_SUCCESS' | 'DRAFT_READY_FOR_REVIEW' | 'HUMAN_REVIEW_REQUIRED' | 'INVALID_FORM_DEFINITION' | 'UNSUPPORTED_MACRO_LOGIC' | 'FORM_SOURCE_ALREADY_PROCESSED' | 'LLM_REQUIRED';
  agent_id: 'AG-006';
  correlation_id: string;
  source_file_name: string;
  source_file_hash: string;
  form_family: FormFamily;
  target_response_table: TargetResponseTable;
  sections_count: number;
  fields_count: number;
  unsupported_components_count: number;
  ambiguous_fields_count: number;
  can_publish: boolean;
  requires_human_review: boolean;
  draft_definition?: FormDefinition;
  warnings: string[];
  agent_version: string;
  parser_version: string;
  schema_version: string;
}
