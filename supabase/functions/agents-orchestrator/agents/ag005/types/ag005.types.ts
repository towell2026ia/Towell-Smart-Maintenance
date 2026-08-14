// supabase/functions/agents-orchestrator/agents/ag005/types/ag005.types.ts
// Domain Types for AG-005 Auditor de Bases v1.0

export type ValidationSeverity = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

export type ResultClassification = 'CORRECTO' | 'ADVERTENCIA' | 'RECHAZADO' | 'DUPLICADO' | 'PENDIENTE';

export interface NormalizationRecord {
  field: string;
  original_value: any;
  normalized_value: any;
  rule_applied: string;
}

export interface AG005Finding {
  row: number;
  field: string;
  severity: ValidationSeverity;
  code: string;
  original_value: any;
  normalized_value?: any;
  message: string;
}

export interface AG005Summary {
  rows_received: number;
  correct: number;
  warnings: number;
  rejected: number;
  duplicates: number;
  pending: number;
}

export interface AG005AuditResult {
  status: 'VALIDATION_SUCCESS' | 'VALIDATION_WITH_WARNINGS' | 'VALIDATION_REJECTED' | 'VALIDATION_PENDING_REVIEW' | 'UNKNOWN_SCHEMA' | 'INVALID_PAYLOAD';
  agent_id: 'AG-005';
  event_id?: string;
  correlation_id: string;
  source_type: string;
  schema_id: string;
  schema_version: string;
  file?: {
    name: string;
    hash?: string;
  };
  summary: AG005Summary;
  can_promote: boolean;
  requires_human_review: boolean;
  findings: AG005Finding[];
  transformations?: NormalizationRecord[];
  agent_version: string;
  validator_version: string;
  normalizer_version: string;
}

export interface SchemaFieldDefinition {
  type: 'STRING' | 'INTEGER' | 'DECIMAL' | 'BOOLEAN' | 'DATE' | 'DATETIME' | 'UUID' | 'ENUM';
  required?: boolean;
  enums?: string[];
  description?: string;
}

export interface SchemaDefinition {
  schema_id: string;
  version: string;
  source: string;
  allowed_extensions: string[];
  expected_columns: string[];
  required_columns: string[];
  optional_columns?: string[];
  data_types: Record<string, 'STRING' | 'INTEGER' | 'DECIMAL' | 'BOOLEAN' | 'DATE' | 'DATETIME' | 'UUID' | 'ENUM'>;
  enums?: Record<string, string[]>;
  destination: string;
  staging_table?: string;
  relations?: Record<string, string>;
  calculated_fields?: Record<string, { formula: string; tolerance?: number }>;
  idempotency?: {
    strategy: 'UPSERT' | 'DEDUP_KEY' | 'FILE_HASH';
    conflict_key?: string;
  };
}
