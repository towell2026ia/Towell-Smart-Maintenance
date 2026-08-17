// supabase/functions/agents-orchestrator/agents/ag009/types/ag009.types.ts
// Base Types and Enums for AG-009 Integration Architecture v1.0

export type AG009WorkflowState =
  | 'SCHEDULED'
  | 'VALIDATED'
  | 'SURVEY_PREPARED'
  | 'IN_PROGRESS'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'OT_CREATED'
  | 'AUTONOMOUS_SURVEY_COMPLETED'
  | 'AUTONOMOUS_FINDING_DETECTED'
  | 'BLOCKED';

export type AG009SubagentId = 'AG-009' | 'AG-009.1' | 'AG-009.2' | 'AG-009.3';

export type DepartmentCode = 'PF' | 'CF' | 'TF' | 'AF';

export type AutonomousBlock =
  | 'Vibración'
  | 'Limpieza'
  | 'Lubricación'
  | 'Temperatura'
  | 'Cableado';

export interface PlannedPartReference {
  part_code: string;
  part_name?: string;
  quantity: number;
  estimated_unit_cost?: number;
  source?: string;
}

export interface AutonomousResponseItem {
  item_code: string;
  block: AutonomousBlock;
  question_text: string;
  response_type: 'YES_NO' | 'NUMERIC' | 'SELECT' | 'TEXT';
  value: string | number | boolean | null;
  unit?: string;
  required?: boolean;
  reference_min?: number;
  reference_max?: number;
  evidence_reference?: string;
  notes?: string;
}

export interface AutonomousFinding {
  contract_id: 'AUTONOMOUS-FINDING-001';
  contract_version: '1.0';
  finding_id: string;
  machine_id: string;
  survey_reference: string;
  calendar_reference: string;
  week_reference: string | number;
  year?: number;
  finding_code: string;
  finding_description: string;
  block: AutonomousBlock;
  severity: 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAJA';
  evidence_reference?: string;
  source_reference: 'AUTONOMO';
  correlation_id: string;
  detected_at: string;
}

export interface AG009ExecutionResult {
  success: boolean;
  agent_id: AG009SubagentId;
  workflow_state: AG009WorkflowState;
  correlation_id: string;
  event_id?: string;
  ot_draft?: Record<string, any> | null;
  ot_created?: Record<string, any> | null;
  survey_execution?: Record<string, any> | null;
  findings?: AutonomousFinding[];
  approval_required?: boolean;
  approval_id?: string | null;
  error_code?: string | null;
  error_message?: string | null;
  details?: Record<string, any>;
  duration_ms: number;
}
