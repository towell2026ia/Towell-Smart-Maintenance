// supabase/functions/agents-orchestrator/modules/m012/types/m012.types.ts
// Canonical Type Definitions for M-012 OT Preparation & Resource Readiness (v1.0)
// Frozen under Token: M012-DATA-MAP-001

export type M012MaintenanceType = 'PREVENTIVE' | 'PREDICTIVE' | 'AUTONOMOUS' | 'CORRECTIVE' | 'OVERHAUL';

export type M012PartClassification = 'REQUIRED' | 'RECOMMENDED' | 'OPTIONAL' | 'UNKNOWN';
export type M012PartStockStatus = 'AVAILABLE_IN_STOCK' | 'OUT_OF_STOCK' | 'UNKNOWN' | 'NOT_APPLICABLE';

export type M012ToolClassification = 'REQUIRED' | 'RECOMMENDED' | 'OPTIONAL' | 'STANDARD_TOOLKIT' | 'NOT_DOCUMENTED';

export type M012DataGapCategory = 'MISSING' | 'UNKNOWN' | 'NOT_APPLICABLE' | 'NOT_AVAILABLE' | 'CONFLICTING';

export type M012ReadinessStatus =
  | 'READY'
  | 'PARTIALLY_READY'
  | 'BLOCKED_MISSING_INFORMATION'
  | 'BLOCKED_MISSING_RESOURCE'
  | 'REVIEW_REQUIRED';

export type M012SafetyDependencyType =
  | 'LOTO_REQUIRED'
  | 'PERMIT_REQUIRED'
  | 'PPE_SPECIAL_REQUIRED'
  | 'CHEMICAL_SAFETY_REQUIRED'
  | 'ENERGY_ISOLATION_VERIFICATION';

export interface WorkScopeSnapshot {
  work_order_id: string;
  asset_id: string;
  title: string;
  maintenance_type: M012MaintenanceType;
  component_id?: string | null;
  department?: string | null;
  requested_activities: string[];
  created_at: string;
}

export interface PreparationPart {
  part_id: string;
  description: string;
  quantity_planned: number;
  classification: M012PartClassification;
  source: 'PREVENTIVE_PLAN' | 'APPROVED_TECHNICAL_MEMORY' | 'MACHINE_HISTORY' | 'WORK_ORDER_SCOPE' | 'MANUAL_HUMAN';
  stock_status: M012PartStockStatus;
}

export interface PreparationTool {
  tool_id: string;
  description: string;
  classification: M012ToolClassification;
  source: 'APPROVED_TECHNICAL_MEMORY' | 'AUTHORIZED_PROCEDURE' | 'CHECKLIST' | 'MANUAL_HUMAN';
}

export interface PreparationResource {
  resource_type: 'TECHNICIAN_COUNT' | 'SPECIALTY' | 'EXTERNAL_SUPPORT' | 'HEAVY_EQUIPMENT';
  description: string;
  value: string | number;
  source: string;
}

export interface ChecklistRequirement {
  checklist_id: string;
  checklist_name: string;
  maintenance_type: M012MaintenanceType;
  is_required: boolean;
  status: 'RESOLVED' | 'MISSING_REQUIRED_CHECKLIST' | 'NOT_APPLICABLE';
  resolution_source: string;
}

export interface TechnicalMemoryReference {
  memory_id: string;
  version: string;
  title: string;
  status: 'APPROVED';
  applicability: 'DIRECTLY_APPLICABLE' | 'GENERAL_RECOMMENDATION' | 'HISTORICAL_REFERENCE';
  key_procedure_steps: string[];
  critical_precautions: string[];
  limitations: string[];
  relevance_score: number;
}

export interface PreparationDependency {
  dependency_id: string;
  dependency_type: 'PREVIOUS_OT' | 'PARTS_DELIVERY' | 'OPERATIONAL_STOP' | 'SUPERVISION_REVIEW';
  description: string;
  is_resolved: boolean;
}

export interface SafetyDependency {
  dependency_id: string;
  dependency_type: M012SafetyDependencyType;
  description: string;
  status: 'IDENTIFIED_PENDING_M013';
  source: string;
}

export interface DataGap {
  gap_id: string;
  field_or_resource: string;
  category: M012DataGapCategory;
  impact_level: 'BLOCKING' | 'WARNING' | 'INFORMATIONAL';
  description: string;
}

export interface ReadinessResult {
  status: M012ReadinessStatus;
  readiness_score: number; // 0-100
  is_ready_for_execution: boolean; // True only if status === 'READY'
  blocking_reasons: string[];
  warnings: string[];
  ready_items_count: number;
  missing_items_count: number;
  safety_handoff_required: boolean;
}

export interface PreparationTraceability {
  evaluation_at: string;
  preparation_engine_version: string;
  data_map_token: 'M012-DATA-MAP-001';
  all_items_traceable: boolean;
  source_counts: {
    parts_count: number;
    tools_count: number;
    memories_count: number;
    dependencies_count: number;
    gaps_count: number;
  };
}

export interface OTPreparationPackage {
  work_order_id: string;
  asset_id: string;
  evaluation_at: string;
  scope_snapshot: WorkScopeSnapshot;
  asset_context: {
    machine_model?: string | null;
    machine_family?: string | null;
    department?: string | null;
    m010_summary?: string;
    m011_health_score?: number | null;
    m011_risk_score?: number | null;
  };
  technical_memories: TechnicalMemoryReference[];
  checklist: ChecklistRequirement | null;
  parts: PreparationPart[];
  tools: PreparationTool[];
  resources: PreparationResource[];
  dependencies: PreparationDependency[];
  safety_dependencies: SafetyDependency[];
  missing_information: DataGap[];
  readiness: ReadinessResult;
  traceability: PreparationTraceability;
}

export interface M012ExecutionRequest {
  request_id?: string;
  work_order_id: string;
  asset_id?: string;
  evaluation_at?: string;
  consumer?: string;
  work_order_raw?: any;
  asset_raw?: any;
  m010_context?: any;
  m011_context?: any;
  ag011_memories?: any[];
  checklists_raw?: any[];
  parts_raw?: any[];
}

export interface M012ExecutionResponse {
  success: boolean;
  module_id: 'M-012';
  version: '1.0';
  work_order_id: string;
  asset_id: string;
  evaluation_at: string;
  package: OTPreparationPackage;
  telemetry: {
    duration_ms: number;
    llm_calls: 0;
    tokens: 0;
    cost_usd: 0;
  };
}
