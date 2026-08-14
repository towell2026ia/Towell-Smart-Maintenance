// supabase/functions/agents-orchestrator/agents/ag006/review/review.types.ts
// Review & Revision Domain Types for AG-006.3 (FORM-REVIEW-001)

import type { FieldType, FormDefinitionContract } from '../form-definition/form-definition.types.ts';

export const REVIEW_VERSION = 'FORM-REVIEW-001';

export type ReviewState = 'DRAFT' | 'IN_REVIEW';

export type AuditActionType =
  | 'DRAFT_CREATED'
  | 'PREVIEW_OPENED'
  | 'FIELD_EDITED'
  | 'FIELD_REMOVED'
  | 'FIELD_TYPE_CHANGED'
  | 'FIELD_REQUIRED_CHANGED'
  | 'OPTION_CHANGED'
  | 'SECTION_CHANGED'
  | 'DRAFT_VALIDATED'
  | 'DRAFT_SENT_TO_REVIEW';

export interface AuditLogEntry {
  audit_id: string;
  draft_id: string;
  revision: number;
  user_id: string;
  action: AuditActionType;
  field_code?: string;
  previous_value?: any;
  new_value?: any;
  timestamp: string;
}

export interface DraftRevisionMetadata {
  revision_number: number;
  parent_revision: number | null;
  created_at: string;
  created_by: string;
  change_summary: string;
}

export interface DraftEditPayload {
  field_code: string;
  new_label?: string;
  new_field_type?: FieldType;
  new_required?: boolean;
  new_options?: string[];
  new_min?: number;
  new_max?: number;
  new_order?: number;
}
