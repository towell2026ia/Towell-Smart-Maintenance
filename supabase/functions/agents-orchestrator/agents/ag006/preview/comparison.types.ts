// supabase/functions/agents-orchestrator/agents/ag006/preview/comparison.types.ts
// Comparator Domain Types for AG-006.3 (FORM-COMPARE-001)

export const COMPARATOR_VERSION = 'FORM-COMPARE-001';

export type DifferenceType =
  | 'SOURCE_ONLY'
  | 'DRAFT_ONLY'
  | 'TYPE_CHANGED'
  | 'LABEL_CHANGED'
  | 'ORDER_CHANGED'
  | 'SECTION_CHANGED'
  | 'OPTIONS_CHANGED'
  | 'VALIDATION_CHANGED'
  | 'REQUIRED_CHANGED'
  | 'UNSUPPORTED_COMPONENT'
  | 'AMBIGUOUS_MAPPING';

export interface ComparisonDifference {
  type: DifferenceType;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  field_code?: string;
  section_code?: string;
  source_reference?: {
    sheet?: string;
    cell_range?: string;
  };
  source_value?: any;
  draft_value?: any;
  message: string;
}

export interface SourceComparisonReport {
  comparator_version: typeof COMPARATOR_VERSION;
  comparison_status: 'IDENTICAL' | 'DIFFERENCES_FOUND' | 'CRITICAL_MISMATCH';
  total_differences: number;
  summary: {
    source_only: number;
    draft_only: number;
    type_changed: number;
    label_changed: number;
    order_changed: number;
    section_changed: number;
    options_changed: number;
    validation_changed: number;
    required_changed: number;
    unsupported_component: number;
    ambiguous_mapping: number;
  };
  differences: ComparisonDifference[];
  requires_human_review: boolean;
}
