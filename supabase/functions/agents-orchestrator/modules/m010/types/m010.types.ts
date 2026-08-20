// supabase/functions/agents-orchestrator/modules/m010/types/m010.types.ts
// Type definitions for M-010 Expediente Único del Activo (v1.0)
// Frozen under Token: M010-DATA-MAP-001

export type AssetDepartment = 'PF' | 'CF' | 'TF' | 'AF';
export type AssetCriticality = 'ALTA' | 'MEDIA' | 'BAJA';
export type AssetStatus = 'OPERANDO' | 'PARADA' | 'MANTENIMIENTO' | 'INACTIVA' | 'DESMANTELADA';
export type DataCompletenessState = 'COMPLETE' | 'PARTIAL' | 'UNKNOWN' | 'NOT_APPLICABLE';

export type AssetSectionType =
  | 'IDENTITY'
  | 'WORK_ORDERS'
  | 'SUBTASKS'
  | 'MAINTENANCE'
  | 'CHECKLISTS'
  | 'SURVEYS'
  | 'FINDINGS'
  | 'FAILURES'
  | 'PARTS'
  | 'DOWNTIME'
  | 'ALERTS'
  | 'TIMELINE';

export type TimelineEventType =
  | 'WORK_ORDER'
  | 'SUBTASK'
  | 'FAILURE'
  | 'PREVENTIVE'
  | 'PREDICTIVE_SURVEY'
  | 'AUTONOMOUS_SURVEY'
  | 'PHYSICAL_FINDING'
  | 'CHECKLIST'
  | 'PART'
  | 'DOWNTIME'
  | 'ALERT'
  | 'TECHNICAL_NOTE';

export type TimeQuality = 'EXACT' | 'APPROXIMATED' | 'DATE_ONLY' | 'UNKNOWN';

export interface AssetIdentity {
  asset_id: string; // Canonical primary key / code (e.g. 'TELAR-202' / uuid)
  codigo_maquina: string;
  nombre: string;
  departamento: AssetDepartment;
  tipo?: string | null;
  modelo?: string | null;
  marca?: string | null;
  serie?: string | null;
  criticidad: AssetCriticality;
  ubicacion?: string | null;
  estatus: AssetStatus;
  activo: boolean;
  fecha_alta?: string | null;
}

export interface AssetSourceReference {
  source_name: string;
  source_table: string;
  source_id: string;
  retrieved_at: string;
  relationship_type: 'DIRECT_FK' | 'FOLIO_LINK' | 'MACHINE_ID_LINK' | 'SOURCE_ID_LINK' | 'DERIVED';
}

export interface AssetTimelineEvent {
  event_id: string;
  asset_id: string;
  event_type: TimelineEventType;
  occurred_at: string; // ISO DateTime or Date
  time_quality: TimeQuality;
  title: string;
  summary: string;
  status?: string | null;
  source_reference: AssetSourceReference;
}

export interface AssetDataCompleteness {
  overall_completeness: DataCompletenessState;
  score_percentage: number;
  sections_completeness: Record<AssetSectionType, DataCompletenessState>;
  missing_fields: string[];
  warnings: string[];
}

export interface AssetWorkOrderSummary {
  id: string;
  folio: string;
  tipo_mantenimiento: 'CORRECTIVO' | 'PREVENTIVO' | 'PREDICTIVO' | 'AUTONOMO' | 'MEJORA';
  estatus: string;
  fecha_creacion: string;
  fecha_cierre?: string | null;
  descripcion: string;
  trabajo_realizado?: string | null;
  subtask_count: number;
  parts_count: number;
  source_reference: AssetSourceReference;
}

export interface AssetFailureSummary {
  id: string;
  failure_normalized: string;
  failure_raw: string;
  fecha: string;
  depto: AssetDepartment;
  source_type: string;
  associated_ot_folio?: string | null;
  source_reference: AssetSourceReference;
}

export interface AssetMaintenancePlanSummary {
  id: string;
  tipo: 'PREVENTIVO_ANUAL' | 'PREDICTIVO_SEMANAL' | 'AUTONOMO_SEMANAL';
  anio: number;
  periodo_referencia: string; // mes o semana
  fecha_programada: string;
  fecha_ejecutada?: string | null;
  estado: 'PROGRAMADO' | 'EJECUTADO' | 'CANCELADO' | 'REPROGRAMADO';
  source_reference: AssetSourceReference;
}

export interface AssetPartConsumptionSummary {
  id: string;
  refaccion_id: string;
  codigo_refaccion: string;
  nombre_refaccion: string;
  cantidad: number;
  unidad: string;
  fecha_uso: string;
  associated_ot_folio: string;
  costo_unitario?: number | null; // read-only from AG-007
  source_reference: AssetSourceReference;
}

export interface AssetAlertSummary {
  signal_id: string;
  signal_type: string;
  severity: 'Informativa' | 'Advertencia' | 'Crítica';
  message: string;
  created_at: string;
  status: 'ACTIVE' | 'RESOLVED' | 'ACKNOWLEDGED';
  source_agent: string; // e.g. 'AG-008', 'AG-007'
  source_reference: AssetSourceReference;
}

export interface Asset360 {
  asset_id: string;
  identity: AssetIdentity;
  current_status: {
    estatus_operativo: AssetStatus;
    activo: boolean;
    ultima_ot_folio?: string | null;
    ultima_ot_fecha?: string | null;
    ultimo_mantenimiento_fecha?: string | null;
    ultima_falla_fecha?: string | null;
    alertas_activas_count: number;
  };
  work_orders: AssetWorkOrderSummary[];
  failure_history: AssetFailureSummary[];
  maintenance_plans: AssetMaintenancePlanSummary[];
  parts_history: AssetPartConsumptionSummary[];
  alerts: AssetAlertSummary[];
  timeline: AssetTimelineEvent[];
  data_completeness: AssetDataCompleteness;
  retrieved_at: string;
  record_version: string;
}

export interface AssetSummary {
  asset_id: string;
  identity: AssetIdentity;
  current_status: Asset360['current_status'];
  total_work_orders: number;
  total_failures: number;
  total_maintenances: number;
  data_completeness: AssetDataCompleteness;
  retrieved_at: string;
}

export interface AssetContextRequest {
  asset_id: string;
  consumer_id: 'M-011' | 'AG-010' | 'AG-011' | 'M-012' | 'AG-012' | 'AG-013' | 'AG-001' | 'UI';
  requested_sections: AssetSectionType[];
  date_range?: {
    from_date?: string;
    to_date?: string;
  };
  limit_per_section?: number;
}

export interface AssetContextResponse {
  asset_id: string;
  consumer_id: string;
  sections_provided: AssetSectionType[];
  data: Partial<Asset360>;
  retrieved_at: string;
  duration_ms: number;
}
