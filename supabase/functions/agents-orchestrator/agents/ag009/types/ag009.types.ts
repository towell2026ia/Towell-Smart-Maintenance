// supabase/functions/agents-orchestrator/agents/ag009/types/ag009.types.ts
// Base Types and Enums for AG-009 Integration Architecture v1.0 (Core, Preventivo, Autónomo, Correctivo)

export type AG009WorkflowState =
  | 'SCHEDULED'
  | 'REQUESTED'
  | 'VALIDATED'
  | 'SURVEY_PREPARED'
  | 'IN_PROGRESS'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'OT_CREATED'
  | 'CORRECTIVE_REQUEST_PREPARED'
  | 'CORRECTIVE_OT_PREPARED'
  | 'SUBTASK_PREPARED'
  | 'ASSIGNED'
  | 'IN_VALIDATION'
  | 'CLOSED'
  | 'AUTONOMOUS_SURVEY_COMPLETED'
  | 'AUTONOMOUS_FINDING_DETECTED'
  | 'BLOCKED';

export type AG009SubagentId = 'AG-009' | 'AG-009.1' | 'AG-009.2' | 'AG-009.3';

export type DepartmentCode = 'PF' | 'CF' | 'TF' | 'AF';

export type CorrectiveSource =
  | 'PORTAL'
  | 'TELEGRAM'
  | 'AUTONOMO'
  | 'PREDICTIVO'
  | 'ALERTA'
  | 'TECNICO'
  | 'ADMIN'
  | 'FORMULARIO';

export type AutonomousBlock =
  | 'Vibración'
  | 'Limpieza'
  | 'Lubricación'
  | 'Temperatura'
  | 'Cableado';

export type PredictiveBlock =
  | 'Electrónico'
  | 'Mecánico'
  | 'Limpieza'
  | 'Lubricación';

export type SubtaskArea =
  | 'Mecánico'
  | 'Eléctrico'
  | 'Electrónico'
  | 'Lubricación'
  | 'Limpieza'
  | 'Ajuste'
  | 'Servicio Externo'
  | 'Refacciones'
  | 'Otro';

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

export interface PredictiveFinding {
  contract_id: 'PREDICTIVE-FINDING-001';
  contract_version: '1.0';
  finding_id: string;
  machine_id: string;
  survey_reference: string;
  block: PredictiveBlock;
  finding: string;
  severity: 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAJA';
  source_metric?: string;
  metric_value?: number | string;
  threshold_exceeded?: string;
  evidence?: string;
  correlation_id: string;
  detected_at: string;
}

export interface CorrectiveRequest {
  contract_id: 'CORRECTIVE-REQUEST-001';
  contract_version: '1.0';
  request_id: string;
  source: CorrectiveSource;
  source_reference?: string;
  machine_id: string;
  department_code: DepartmentCode;
  description: string;
  priority: 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAJA';
  requested_at: string;
  requester_reference: string;
  contact_info?: string;
  telegram_metadata?: {
    id_original?: string;
    folio_original?: string;
    chat_id?: string | number;
    staging_reference?: string;
  };
  autonomous_metadata?: {
    finding_id: string;
    survey_reference: string;
    block: AutonomousBlock;
  };
  predictive_metadata?: {
    finding_id: string;
    survey_reference: string;
    block: PredictiveBlock;
    source_metric?: string;
  };
  alert_metadata?: {
    alert_id: string;
    severity?: string;
  };
  evidence_reference?: string;
  planned_parts?: PlannedPartReference[];
  correlation_id: string;
}

export interface SubtaskRequest {
  contract_id: 'SUBTASK-REQUEST-001';
  contract_version: '1.0';
  subtask_id: string;
  parent_ot_reference: string;
  requested_area: SubtaskArea;
  requested_date: string;
  requested_by: string;
  description: string;
  priority?: 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAJA';
  reason?: string;
  requires_paro?: boolean;
  requires_parts?: boolean;
  evidence_reference?: string;
  correlation_id: string;
  created_at: string;
}

export interface CorrectiveOTDraft {
  folio_propuesto: string;
  maquina_id: string;
  area: DepartmentCode;
  tipo_orden: 'Correctivo';
  descripcion_problema: string;
  prioridad: 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAJA';
  origen_solicitud: CorrectiveSource;
  id_solicitud_origen?: string;
  referencia_origen?: string;
  solicitado_por: string;
  fecha_solicitud: string;
  fecha_compromiso?: string;
  requiere_aprobacion: boolean;
  refacciones_requeridas?: PlannedPartReference[];
  estado_inicial: 'Asignada' | 'En espera' | 'Pendiente';
  action_hash?: string;
  correlation_id: string;
}

export interface AG009ExecutionResult {
  success: boolean;
  agent_id: AG009SubagentId;
  workflow_state: AG009WorkflowState;
  correlation_id: string;
  event_id?: string;
  corrective_request?: CorrectiveRequest | null;
  ot_draft?: Record<string, any> | null;
  ot_created?: Record<string, any> | null;
  subtask_draft?: SubtaskRequest | null;
  survey_execution?: Record<string, any> | null;
  findings?: (AutonomousFinding | PredictiveFinding)[];
  duplicate_status?: 'EXACT_DUPLICATE' | 'POSSIBLE_DUPLICATE' | 'NOT_DUPLICATE' | 'IDEMPOTENT_REPLAY';
  approval_required?: boolean;
  approval_id?: string | null;
  error_code?: string | null;
  error_message?: string | null;
  details?: Record<string, any>;
  duration_ms: number;
}
