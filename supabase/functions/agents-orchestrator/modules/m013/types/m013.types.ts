// supabase/functions/agents-orchestrator/modules/m013/types/m013.types.ts
// Canonical Type Definitions for M-013 Safety Control & Evidence Governance (v1.0)
// Frozen under Token: M013-DATA-MAP-001

import type { OTPreparationPackage } from '../../m012/types/m012.types.ts';

export type M013SafetyRequirementType =
  | 'LOTO_REQUIRED'
  | 'PERMIT_REQUIRED'
  | 'PPE_SPECIAL_REQUIRED'
  | 'CHEMICAL_SAFETY_REQUIRED'
  | 'ENERGY_ISOLATION_VERIFICATION'
  | 'GUARDING_REQUIRED';

export type M013LotoStatus =
  | 'NOT_REQUIRED'
  | 'REQUIRED'
  | 'PENDING'
  | 'VERIFIED_BY_HUMAN'
  | 'FAILED_OR_INCOMPLETE';

export type M013PermitStatus =
  | 'NOT_REQUIRED'
  | 'REQUIRED'
  | 'PENDING'
  | 'APPROVED_BY_HUMAN'
  | 'EXPIRED'
  | 'REJECTED';

export type M013SafetyStatus =
  | 'CONTROLS_COMPLETE'
  | 'CONTROLS_INCOMPLETE'
  | 'BLOCKED'
  | 'REVIEW_REQUIRED'
  | 'NOT_EVALUATED';

export type M013EvidenceType =
  | 'DOCUMENTED_REQUIREMENT'
  | 'HUMAN_CONFIRMATION'
  | 'PERMIT_RECORD'
  | 'ISOLATION_RECORD'
  | 'CHECKLIST_RESPONSE'
  | 'TECHNICAL_REFERENCE'
  | 'MISSING_EVIDENCE';

export interface SafetyRequirement {
  requirement_id: string;
  requirement_type: M013SafetyRequirementType;
  description: string;
  source: string;
  is_blocking: boolean;
  requires_human_confirmation: boolean;
  required_role?: 'TECHNICIAN' | 'SUPERVISOR' | 'SAFETY_OFFICER';
  applicable_component?: string | null;
}

export interface SafetyEvidence {
  evidence_id: string;
  requirement_id: string;
  evidence_type: M013EvidenceType;
  description: string;
  actor_id?: string | null;
  actor_role?: string | null;
  timestamp: string;
  is_valid: boolean;
  is_expired: boolean;
  source_reference: string;
}

export interface HumanConfirmation {
  confirmation_id: string;
  requirement_id: string;
  actor_id: string;
  actor_role: string;
  decision: 'CONFIRMED' | 'REJECTED';
  timestamp: string;
  work_order_id: string;
  evidence_notes?: string;
}

export interface LotoControl {
  status: M013LotoStatus;
  is_required: boolean;
  isolation_point?: string;
  lock_box_id?: string;
  verified_by?: string | null;
  verified_at?: string | null;
  zero_energy_voltage_verified?: boolean;
}

export interface PermitControl {
  permit_id?: string;
  permit_type?: 'HOT_WORK' | 'HEIGHT_WORK' | 'CONFINED_SPACE' | 'ELECTRICAL_LIVE' | 'HAZMAT_CHEMICAL';
  status: M013PermitStatus;
  is_required: boolean;
  approved_by?: string | null;
  approved_at?: string | null;
  valid_from?: string | null;
  valid_to?: string | null;
}

export interface SafetyConflict {
  conflict_id: string;
  requirement_id: string;
  description: string;
  source_a: string;
  source_b: string;
}

export interface SafetyBlockingReason {
  rule_code: string;
  requirement_id?: string;
  description: string;
  severity: 'CRITICAL_BLOCK' | 'WARNING';
}

export interface SafetyTraceability {
  evaluation_at: string;
  safety_engine_version: string;
  data_map_token: 'M013-DATA-MAP-001';
  all_controls_traceable: boolean;
  source_counts: {
    requirements_count: number;
    controls_count: number;
    evidence_count: number;
    human_confirmations_count: number;
    conflicts_count: number;
    blocking_reasons_count: number;
  };
}

export interface SafetyControlPackage {
  work_order_id: string;
  asset_id: string;
  evaluation_at: string;
  requirements: SafetyRequirement[];
  loto_control: LotoControl;
  permit_control: PermitControl;
  evidence: SafetyEvidence[];
  human_confirmations: HumanConfirmation[];
  missing_controls: string[];
  conflicts: SafetyConflict[];
  blocking_reasons: SafetyBlockingReason[];
  status: M013SafetyStatus;
  is_blocked: boolean;
  controls_complete: boolean; // True only if status === 'CONTROLS_COMPLETE'
  traceability: SafetyTraceability;
}

export interface M013ExecutionRequest {
  request_id?: string;
  work_order_id: string;
  asset_id?: string;
  evaluation_at?: string;
  consumer?: string;
  m012_package?: OTPreparationPackage;
  work_order_raw?: any;
  checklists_raw?: any[];
  human_confirmations_raw?: any[];
  permits_raw?: any[];
  loto_raw?: any[];
}

export interface M013ExecutionResponse {
  success: boolean;
  module_id: 'M-013';
  version: '1.0';
  work_order_id: string;
  asset_id: string;
  evaluation_at: string;
  package: SafetyControlPackage;
  telemetry: {
    duration_ms: number;
    llm_calls: 0;
    tokens: 0;
    cost_usd: 0;
  };
}
