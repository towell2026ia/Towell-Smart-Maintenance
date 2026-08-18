// supabase/functions/agents-orchestrator/agents/ag004/types/ag004.types.ts
// Strict Type Definitions for AG-004 — Autónomo Semanal (v1.0 Frozen)

export type DepartmentCode = 'PF' | 'CF' | 'TF' | 'AF';

export type EligibilityStatus = 
  | 'ELIGIBLE' 
  | 'MACHINE_NOT_FOUND' 
  | 'MACHINE_INACTIVE' 
  | 'INVALID_DEPARTMENT' 
  | 'INVALID_MACHINE_RECORD';

export type AutonomousBlock = 'Vibración' | 'Limpieza' | 'Lubricación' | 'Temperatura' | 'Cableado';

export type FindingSeverity = 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAJA';

export type SurveyStatus = 'PENDIENTE_ASIGNACION' | 'ASIGNADA' | 'EN_PROCESO' | 'FINALIZADO' | 'CANCELADO' | 'OVERDUE';

export interface MachineRecord {
  id_maquina?: string;
  equipo_towell: string;
  nombre?: string;
  area?: string;
  departamento_codigo?: string;
  tipo_maquina?: string;
  activo?: boolean | number | string;
  nivel_criticidad?: 'MUY_ALTA' | 'ALTA' | 'MEDIA' | 'BAJA';
}

export interface IsoWeekInfo {
  iso_year: number;
  iso_week: number;
  week_key: string; // 'YYYY-Www'
  start_date: string; // 'YYYY-MM-DD' (Monday)
  end_date: string; // 'YYYY-MM-DD' (Saturday)
  operating_days: string[]; // 6 days ['YYYY-MM-DD', ...]
}

export interface ExistingScheduleRecord {
  id_detalle?: string;
  maquina_id: string;
  fecha_programada: string;
  tipo_mantenimiento: 'AUTONOMO';
  anio_plan?: number;
  semana_plan?: number;
  estatus?: string;
  folio_levantamiento?: string;
}

export interface ScheduledAutonomousItem {
  machine_id: string;
  department: DepartmentCode;
  scheduled_date: string;
  iso_year: number;
  iso_week: number;
  week_key: string;
  day_of_week: 'LUNES' | 'MARTES' | 'MIERCOLES' | 'JUEVES' | 'VIERNES' | 'SABADO';
  status: 'SCHEDULED' | 'ALREADY_SCHEDULED' | 'ALREADY_COMPLETED';
  calendar_reference: string;
  survey_reference: string;
  criticality: 'MUY_ALTA' | 'ALTA' | 'MEDIA' | 'BAJA';
}

export interface AutonomousScheduleContractPayload {
  contract_id: 'AUTONOMOUS-SCHEDULE-001';
  contract_version: '1.0';
  machine_id: string;
  scheduled_date: string;
  week_reference: string | number;
  year: number;
  calendar_reference: string;
  form_reference: string;
  source_reference: 'AUTONOMO';
  department: DepartmentCode;
  correlation_id: string;
}

export interface AutonomousFindingContractPayload {
  contract_id: 'AUTONOMOUS-FINDING-001';
  contract_version: '1.0';
  finding_id: string;
  machine_id: string;
  survey_reference: string;
  calendar_reference: string;
  week_reference: string | number;
  year: number;
  finding_code: string;
  finding_description: string;
  block: AutonomousBlock;
  severity: FindingSeverity;
  evidence_reference?: string;
  source_reference: 'AUTONOMO';
  correlation_id: string;
  detected_at: string;
}

export interface AutonomousSurveyResponses {
  id_levantamiento: string;
  machine_id: string;
  vibracion_estado?: 'NORMAL' | 'ANORMAL';
  vibracion_mms?: number | null;
  vibracion_hz?: number | null;
  vibracion_obs?: string | null;
  limpieza_estado?: 'CONFORME' | 'NO_CONFORME';
  limpieza_evidencia?: string | null;
  limpieza_obs?: string | null;
  lubricacion_estado?: 'CORRECTO' | 'INCORRECTO';
  lubricacion_nivel?: 'NORMAL' | 'BAJO' | 'ALTO';
  lubricacion_fugas?: 'SIN_FUGAS' | 'CON_FUGAS';
  lubricacion_contaminacion?: 'NO' | 'SI';
  lubricacion_obs?: string | null;
  temperatura_c: number | null; // CRITICAL: MANDATORY NOT NULL
  temperatura_obs?: string | null;
  cableado_estado?: 'CORRECTO' | 'FLOJO' | 'DAÑADO' | 'EXPUESTO' | 'SOBRECALENTADO';
  cableado_obs?: string | null;
  evidence_url?: string | null;
}

export interface EngineAuditRecord {
  event_id: string;
  correlation_id: string;
  agent_id: 'AG-004';
  target_week: string;
  iso_year: number;
  iso_week: number;
  scanned_machines: number;
  eligible_count: number;
  already_scheduled_count: number;
  already_completed_count: number;
  new_schedules_count: number;
  department_breakdown: Record<DepartmentCode, number>;
  daily_distribution: Record<string, number>;
  rules_applied: string[];
  execution_duration_ms: number;
  llm_used: false;
  tokens: 0;
  ai_cost: 0;
}
