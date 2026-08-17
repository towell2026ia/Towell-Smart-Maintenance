// supabase/functions/agents-orchestrator/agents/ag009/types/ag009.types.ts
// Base Types and Enums for AG-009 Integration Architecture v1.0

export type AG009WorkflowState =
  | 'SCHEDULED'
  | 'VALIDATED'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'OT_CREATED'
  | 'BLOCKED';

export type AG009SubagentId = 'AG-009' | 'AG-009.1' | 'AG-009.2' | 'AG-009.3';

export type DepartmentCode = 'PF' | 'CF' | 'TF' | 'AF';

export interface PlannedPartReference {
  part_code: string;
  part_name?: string;
  quantity: number;
  estimated_unit_cost?: number;
  source?: string;
}

export interface AG009ExecutionResult {
  success: boolean;
  agent_id: AG009SubagentId;
  workflow_state: AG009WorkflowState;
  correlation_id: string;
  event_id?: string;
  ot_draft?: Record<string, any> | null;
  ot_created?: Record<string, any> | null;
  approval_required?: boolean;
  approval_id?: string | null;
  error_code?: string | null;
  error_message?: string | null;
  details?: Record<string, any>;
  duration_ms: number;
}
