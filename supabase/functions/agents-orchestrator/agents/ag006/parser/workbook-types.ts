// supabase/functions/agents-orchestrator/agents/ag006/parser/workbook-types.ts
// Workbook Parser Domain Types for AG-006.2 v1.2

export type AllowedExtension = 'xlsx' | 'xlsm';

export type SecurityCode =
  | 'FILE_EXTENSION_NOT_ALLOWED'
  | 'WORKBOOK_CORRUPTED'
  | 'MACRO_DETECTED'
  | 'VBA_DETECTED'
  | 'EMBEDDED_OBJECT_DETECTED'
  | 'ACTIVEX_DETECTED'
  | 'UNSUPPORTED_COMPONENT'
  | 'SECURITY_PARSE_BLOCKED';

export type SecurityAction = 
  | 'CONTINUE_WITH_WARNING'
  | 'HUMAN_REVIEW_REQUIRED'
  | 'BLOCK';

export interface SecurityFinding {
  code: SecurityCode;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  action: SecurityAction;
  message: string;
  details?: Record<string, any>;
}

export interface SecurityCheckResult {
  safe_to_parse: boolean;
  extension: string;
  has_macros: boolean;
  has_unsupported_components: boolean;
  requires_human_review: boolean;
  findings: SecurityFinding[];
}

export interface WorkbookSourceMeta {
  fileName: string;
  mimeType?: string;
  sourceId?: string;
}

export interface ParsedCell {
  address: string;
  row: number;
  column: number;
  raw_value: any;
  normalized_value: string;
  value_type: 'string' | 'number' | 'boolean' | 'date' | 'empty';
  formula?: string | null;
  cached_value?: any;
  merged: boolean;
  merge_range?: string | null;
}

export interface DataValidationRule {
  range: string;
  type: 'list' | 'whole' | 'decimal' | 'date' | 'custom';
  formula1?: string;
  formula2?: string;
  values?: string[];
}

export interface ParsedSheet {
  name: string;
  order: number;
  visibility: 'visible' | 'hidden' | 'very_hidden';
  used_range: string;
  cells: ParsedCell[];
  merged_ranges: string[];
  data_validations: DataValidationRule[];
}

export interface ParsedWorkbook {
  file_name: string;
  file_hash: string;
  extension: AllowedExtension;
  sheet_count: number;
  sheets: ParsedSheet[];
  security: SecurityCheckResult;
}
