// supabase/functions/agents-orchestrator/agents/ag002/types/ag002.types.ts
// Official Type Definitions for AG-002 — Preventivo Anual (PRD-AG-002.2)

export type DepartmentCode = 'PF' | 'CF' | 'TF' | 'AF';

export type CriticalityLevel = 'Muy Alta' | 'Alta' | 'Media' | 'Baja' | 'A' | 'B' | 'C';

export type PriorityBand = 'VERY_HIGH' | 'HIGH' | 'MEDIUM' | 'NORMAL';

export type DedupeStatus = 'EXACT_DUPLICATE' | 'POSSIBLE_DUPLICATE' | 'UNIQUE_EVENT' | 'NOT_DUPLICATE';

export type PriceStatus = 'KNOWN_PRICE' | 'UNKNOWN_PRICE' | 'ZERO_PRICE';

export type QuantityStatus = 'KNOWN_QUANTITY' | 'DERIVED_QUANTITY' | 'UNKNOWN_QUANTITY';

export type BudgetStatus = 'COMPLETE' | 'PARTIAL' | 'NO_KNOWN_PRICES';

export type PreventiveAvailability = 
  | 'PREVENTIVE_AVAILABLE'
  | 'PREVENTIVE_ALREADY_SCHEDULED'
  | 'PREVENTIVE_ALREADY_EXECUTED'
  | 'PREVENTIVE_CANCELLED_REPLACEMENT_ALLOWED'
  | 'PREVENTIVE_STATUS_REVIEW_REQUIRED';

export interface MachineCatalogItem {
  id_maquina?: string;
  equipo_towell: string;
  departamento_codigo?: DepartmentCode;
  area?: DepartmentCode;
  clave?: string;
  ax?: string;
  activo: boolean;
  tipo?: string; // 'TELAR' | 'ESTANDAR'
}

export interface MachineCriticalityItem {
  maquina_id: string;
  nivel_criticidad: CriticalityLevel;
  descripcion_criticidad?: string;
  impacto_produccion?: string;
  impacto_calidad?: string;
  impacto_seguridad?: string;
}

export interface HistoricalFaultItem {
  id_falla: string;
  maquina_id: string;
  descripcion_falla: string;
  fecha_creada: string; // YYYY-MM-DD
  fecha_hora_creada?: string;
  origen?: string;
  categoria_falla?: string;
  es_recurrente?: boolean;
}

export interface TelegramStagingItem {
  id: number;
  folio?: string;
  maquina_id: string;
  falla?: string;
  descripcion?: string;
  fecha: string;
  hora?: string;
  cve_atendio?: string;
  orden_trabajo?: string;
  depto?: string;
}

export interface WorkOrderItem {
  id_orden: string;
  folio?: string;
  tipo_orden: string; // 'Preventivo' | 'Correctivo'
  estatus: string;
  maquina_id: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  tiempo_atencion_min?: number;
  cve_atendio?: string;
  observacion_cierre?: string;
}

export interface BitacoraItem {
  id_bitacora: string;
  id_orden?: string;
  cve_tecnico?: string;
  nombre_tecnico?: string;
  area?: string;
  maquina_id: string;
  fecha_hora_inicio: string;
  fecha_hora_fin: string;
  descripcion_actividad?: string;
  refacciones_usadas?: string;
}

export interface ServiceCatalogItem {
  codigo_servicio: string;
  nombre_servicio: string;
  tipo_servicio: string; // 'Preventivo'
  duracion_estimada_min?: number;
  activo: boolean;
  departamento_aplicable?: DepartmentCode;
}

export interface PartReferenceItem {
  codigo_articulo: string;
  nombre_articulo?: string;
  unidad_medida?: string;
  familia?: string;
  costo_unitario?: number;
  stock_actual?: number;
  cantidad_estandar?: number;
  maquina_id?: string;
}

export interface HistoricalCollectorInput {
  target_year: number;
  generation_date: string; // YYYY-MM-DD
  machines: MachineCatalogItem[];
  criticalities: MachineCriticalityItem[];
  faults: HistoricalFaultItem[];
  telegram_events: TelegramStagingItem[];
  work_orders: WorkOrderItem[];
  bitacoras: BitacoraItem[];
  services: ServiceCatalogItem[];
  parts: PartReferenceItem[];
  parts_by_machine: PartReferenceItem[];
  existing_calendar_details?: Array<{
    id_detalle?: string;
    maquina_id: string;
    anio_plan: number;
    fecha_programada: string;
    tipo_mantenimiento: string;
    estatus_detalle: string;
  }>;
}

export interface DeduplicatedHistoricalEvent {
  event_id: string;
  source: 'EXCEL_FAULT' | 'TELEGRAM' | 'WORK_ORDER' | 'BITACORA';
  maquina_id: string;
  date: string;
  description: string;
  category?: string;
  downtime_minutes?: number;
  dedupe_status: DedupeStatus;
  original_ref?: string;
}

export interface RecurrenceMetrics {
  failure_count_12m: number;
  work_order_count_12m: number;
  repeated_failure_count: number;
  categories_count: Record<string, number>;
  mean_days_between_failures: number | null;
  minimum_days_between_failures: number | null;
  recent_failures_count_90d: number;
}

export interface DowntimeMetrics {
  downtime_minutes_12m: number;
  downtime_hours_12m: number;
  average_downtime_per_event_min: number;
  maximum_downtime_event_min: number;
  status: 'KNOWN_DOWNTIME' | 'KNOWN_ZERO_DOWNTIME' | 'UNKNOWN_DOWNTIME';
}

export interface MaintenanceHistoryMetrics {
  last_work_order_date: string | null;
  last_preventive_date: string | null;
  preventive_count_lifetime: number;
  days_since_last_preventive: number | null;
  corrective_work_orders_12m: number;
}

export interface PriorityScoreComponents {
  criticality_score: number;
  recurrence_score: number;
  downtime_score: number;
  corrective_frequency_score: number;
  preventive_age_score: number;
  parts_consumption_score: number;
  total_score: number;
  priority_band: PriorityBand;
  data_completeness_flag: 'COMPLETE' | 'PARTIAL' | 'MINIMAL';
}

export interface MachinePreventiveProfile {
  machine_id: string;
  department_code: DepartmentCode;
  is_active: boolean;
  is_loom: boolean;
  max_preventives_allowed_per_year: number;
  criticality_level: CriticalityLevel;
  recurrence_metrics: RecurrenceMetrics;
  downtime_metrics: DowntimeMetrics;
  maintenance_history: MaintenanceHistoryMetrics;
  priority_components: PriorityScoreComponents;
  selected_service: ServiceCatalogItem | null;
  service_status: 'SERVICE_ASSIGNED' | 'PREVENTIVE_SERVICE_NOT_FOUND' | 'MULTIPLE_PREVENTIVE_SERVICES';
  estimated_parts: Array<{
    cve_refaccion: string;
    nombre?: string;
    cantidad: number;
    costo_unitario?: number;
    price_status: PriceStatus;
    quantity_status: QuantityStatus;
  }>;
  budget_status: BudgetStatus;
  estimated_parts_cost_total: number | null;
  year_guard_status: PreventiveAvailability;
  active_preventives_in_target_year: number;
  can_schedule: boolean;
}

export interface PlannedPreventiveSlot {
  slot_id: string;
  machine_id: string;
  department: DepartmentCode;
  is_loom: boolean;
  period: 'ANUAL' | 'S1' | 'S2';
  scheduled_date: string; // YYYY-MM-DD
  year: number;
  week_number: number;
  month_number: number;
  priority_score: number;
  priority_band: PriorityBand;
  service_code: string;
  service_name: string;
  estimated_duration_min: number;
  planned_parts: Array<{
    cve_refaccion: string;
    cantidad: number;
    costo_unitario?: number;
  }>;
  parts_cost_known: number;
  budget_status: BudgetStatus;
  calendar_reference: string;
}

export interface BudgetSummary {
  weekly_budget: Record<number, { week: number; events_count: number; known_cost: number; has_unknown_prices: boolean }>;
  monthly_budget: Record<number, { month: number; events_count: number; known_cost: number; has_unknown_prices: boolean }>;
  annual_total_known_cost: number;
  annual_total_events: number;
  total_parts_estimated: number;
  budget_status: BudgetStatus;
  unknown_cost_items_count: number;
}

export interface AnnualCalendarProposal {
  engine_version: string;
  dataset_ref: string;
  target_year: number;
  generation_date: string;
  calendar_reference: string;
  audit_summary: {
    machines_scanned: number;
    machines_eligible: number;
    machines_scheduled: number;
    machines_blocked: number;
    looms_count: number;
    standard_machines_count: number;
    total_slots_planned: number;
    duration_ms: number;
    llm_used: boolean;
    input_tokens: number;
    output_tokens: number;
    estimated_cost_usd: number;
  };
  rules_versions: {
    dedupe: string;
    recurrence: string;
    priority: string;
    capacity: string;
    scheduling: string;
    parts: string;
    budget: string;
  };
  schedule_items: PlannedPreventiveSlot[];
  budget_summary: BudgetSummary;
  machine_profiles: Record<string, MachinePreventiveProfile>;
  contract_payloads: any[]; // PREVENTIVE-SCHEDULE-001 formatted objects
}
