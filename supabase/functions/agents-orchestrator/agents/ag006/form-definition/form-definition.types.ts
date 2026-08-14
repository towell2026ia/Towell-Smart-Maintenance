// supabase/functions/agents-orchestrator/agents/ag006/form-definition/form-definition.types.ts
// Domain Types for FORM-DEFINITION-001 Contract (AG-006.2)

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

export type ConditionalOperator =
  | 'EQUALS'
  | 'NOT_EQUALS'
  | 'GREATER_THAN'
  | 'LESS_THAN'
  | 'IN'
  | 'NOT_IN'
  | 'IS_EMPTY'
  | 'IS_NOT_EMPTY';

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
    operator: ConditionalOperator;
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
  unit?: string;
  source?: 'INPUT' | 'CONTEXT';
  persist_response?: boolean;
  storage_type?: 'RESPONSE' | 'EVIDENCE';
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

export interface FormDefinitionContract {
  schema_version: 'FORM-DEFINITION-001';
  status: 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'PUBLISHED' | 'SUPERSEDED' | 'ARCHIVED';
  form: {
    code: string;
    name: string;
    form_type: FormFamily;
    target_response_table: TargetResponseTable;
    version: string;
    sections: FormSectionDefinition[];
  };
  warnings: string[];
  unsupported_components: string[];
  requires_human_review: boolean;
  metadata?: Record<string, any>;
}
