// supabase/functions/agents-orchestrator/agents/ag011/types/ag011.types.ts
// Master TypeScript Definitions for AG-011 Technical Memory (v1.0)
// Frozen under Token: AG011-DATA-MAP-001
// Invariant: Canonical Types for Reusable Technical Memory (§26-34 PRD-AG-011.1)

export type AG011MemoryType =
  | 'CONFIRMED_ROOT_CAUSE'
  | 'VALIDATED_REPAIR'
  | 'VALIDATED_DIAGNOSTIC_CHECK'
  | 'RECURRING_FAILURE_GUIDANCE'
  | 'COMPONENT_LESSON'
  | 'MAINTENANCE_LESSON'
  | 'SAFETY_REFERENCE'
  | 'KNOWN_LIMITATION';

export type AG011MemoryStatus =
  | 'CANDIDATE'
  | 'REVIEW_REQUIRED'
  | 'APPROVED'
  | 'SUPERSEDED'
  | 'RETIRED'
  | 'REJECTED';

export type AG011MemoryEvidenceClass =
  | 'CERTIFIED_FACT'
  | 'HUMAN_CONFIRMED_CAUSE'
  | 'VALIDATED_INTERVENTION'
  | 'DOCUMENTED_OUTCOME'
  | 'DERIVED_SIGNAL'
  | 'TECHNICIAN_STATEMENT'
  | 'OPERATOR_STATEMENT'
  | 'MODEL_HYPOTHESIS';

export type AG011ScopeLevel =
  | 'ASSET_SPECIFIC'
  | 'MACHINE_MODEL'
  | 'MACHINE_FAMILY'
  | 'COMPONENT'
  | 'DEPARTMENT'
  | 'GENERAL';

export type AG011MemoryQuality =
  | 'STRONG'
  | 'ADEQUATE'
  | 'PARTIAL'
  | 'CONFLICTING'
  | 'INSUFFICIENT';

export interface AG011MemoryEvidence {
  evidence_id: string;
  evidence_class: AG011MemoryEvidenceClass;
  source_type: 'WORK_ORDER' | 'FINDING' | 'TELEGRAM_MSG' | 'AG010_RCA' | 'AG008_SIGNAL' | 'TECHNICAL_MANUAL';
  source_id: string;
  fact_statement: string;
  occurred_at: string;
  source_table?: string;
  reliability_score?: number; // 0-100
}

export interface AG011MemoryScope {
  scope_level: AG011ScopeLevel;
  asset_id?: string | null;
  machine_model?: string | null;
  machine_family?: string | null;
  component_id?: string | null;
  department?: string | null;
  required_conditions?: string[];
  excluded_conditions?: string[];
}

export interface AG011TechnicalContent {
  condition_description: string;
  validated_observations: string[];
  confirmed_root_cause?: string | null;
  validated_procedure: string;
  expected_outcome: string;
  required_parts?: string[];
  required_tools?: string[];
  safety_warnings?: string[];
}

export interface AG011MemoryApproval {
  reviewer_email: string;
  reviewer_role: string;
  decision: 'APPROVED' | 'REJECTED' | 'REVISE';
  reviewed_at: string;
  approval_notes: string;
  evidence_snapshot_sha256: string;
}

export interface AG011TechnicalMemoryItem {
  memory_id: string;
  title: string;
  memory_type: AG011MemoryType;
  status: AG011MemoryStatus;
  quality: AG011MemoryQuality;
  version: string;
  scope: AG011MemoryScope;
  technical_content: AG011TechnicalContent;
  evidence: AG011MemoryEvidence[];
  limitations: string[];
  origin_case_ids: string[];
  origin_analysis_ids: string[];
  created_at: string;
  effective_from: string;
  effective_to?: string | null;
  supersedes_memory_id?: string | null;
  superseded_by_memory_id?: string | null;
  approval?: AG011MemoryApproval | null;
}

export interface AG011MemoryCandidate {
  candidate_id: string;
  title: string;
  memory_type: AG011MemoryType;
  status: 'CANDIDATE';
  quality: AG011MemoryQuality;
  suggested_scope: AG011MemoryScope;
  draft_content: AG011TechnicalContent;
  evidence: AG011MemoryEvidence[];
  contradicting_evidence: AG011MemoryEvidence[];
  limitations: string[];
  origin_case_ids: string[];
  created_at: string;
  requires_human_review: true;
}

export interface AG011MemoryQuery {
  query_id?: string;
  asset_id: string;
  evaluation_at: string;
  problem_context: {
    statement: string;
    component?: string | null;
    failure_mode?: string | null;
  };
  consumer: 'M-012' | 'M-013' | 'AG-012' | 'AG-013' | 'AG-010' | 'AG-001' | 'UI';
  scope_level_filter?: AG011ScopeLevel[];
  top_n_limit?: number; // Default 5
}

export interface AG011MemoryQueryResultItem {
  memory: AG011TechnicalMemoryItem;
  relevance_score: number; // 0-100 deterministic retrieval relevance (NOT success probability)
  relevance_factors: string[];
  rank: number;
}

export interface AG011MemoryRetrievalOutput {
  query_id: string;
  asset_id: string;
  evaluation_at: string;
  consumer: string;
  top_n_limit: number;
  retrieved_count: number;
  memories: AG011MemoryQueryResultItem[];
  retrieval_model_sha256: string;
  data_quality: 'SUFFICIENT' | 'PARTIAL' | 'EMPTY';
}
