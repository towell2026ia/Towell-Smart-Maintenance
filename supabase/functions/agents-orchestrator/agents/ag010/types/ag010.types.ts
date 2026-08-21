// supabase/functions/agents-orchestrator/agents/ag010/types/ag010.types.ts
// Core Type Definitions and Contract Interfaces for AG-010 (Five Whys & Previous Cases v1.0)
// Frozen under Token: AG010-DATA-MAP-001

export type EvidenceType =
  | 'WORK_ORDER'
  | 'BITACORA'
  | 'FAILURE_EVENT'
  | 'PHYSICAL_FINDING'
  | 'CHECKLIST_RESPONSE'
  | 'SURVEY_RESPONSE'
  | 'PART_CONSUMPTION'
  | 'DOWNTIME'
  | 'AG008_SIGNAL'
  | 'M011_HEALTH_COMPONENT'
  | 'TECHNICAL_NOTE'
  | 'PREVIOUS_CASE';

export type EvidenceClass =
  | 'CERTIFIED_FACT'
  | 'OPERATOR_STATEMENT'
  | 'TECHNICIAN_STATEMENT'
  | 'DERIVED_SIGNAL'
  | 'MODEL_HYPOTHESIS'
  | 'HUMAN_CONFIRMED_CAUSE';

export type EvidenceQuality = 'CERTIFIED' | 'HIGH' | 'MEDIUM' | 'UNVERIFIED' | 'STALE';

export type RootCauseStatus =
  | 'NOT_ANALYZED'
  | 'HYPOTHESIS'
  | 'SUPPORTED_HYPOTHESIS'
  | 'CONFIRMED'
  | 'INSUFFICIENT_EVIDENCE'
  | 'DISPROVEN';

export type WhyAnswerType = 'FACT' | 'HYPOTHESIS' | 'UNKNOWN';
export type WhyConfidenceStatus = 'SUPPORTED' | 'PARTIAL' | 'UNSUPPORTED' | 'CONTRADICTED';
export type CaseOutcome = 'RESOLVED' | 'REOPENED' | 'RECURRED' | 'UNKNOWN';
export type DataQualityState = 'SUFFICIENT' | 'PARTIAL' | 'INSUFFICIENT' | 'CONFLICTING';

export interface ScoreSourceReference {
  source_name: string;
  source_table: string;
  source_id?: string | null;
  retrieved_at: string;
  relationship_type: string;
}

export interface AG010EvidenceItem {
  evidence_id: string;
  evidence_type: EvidenceType;
  evidence_class: EvidenceClass;
  asset_id: string;
  occurred_at: string;
  fact: string;
  raw_payload?: any;
  source_reference: ScoreSourceReference;
  quality: EvidenceQuality;
}

export interface PreviousCase {
  previous_case_id: string;
  asset_id: string;
  asset_name?: string | null;
  depto?: string | null;
  failure_title: string;
  occurred_at: string;
  closed_at?: string | null;
  outcome: CaseOutcome;
  interventions_summary: string;
  reported_root_cause?: string | null;
  root_cause_status: RootCauseStatus;
  parts_used?: string[];
  evidence_items: AG010EvidenceItem[];
  source_references: ScoreSourceReference[];
}

export interface PreviousCaseMatch {
  previous_case: PreviousCase;
  similarity_score: number; // 0 to 100 ranking score
  match_reasons: string[];
  is_same_asset: boolean;
  is_same_failure_type: boolean;
}

export interface AG010EvidencePackage {
  case_id: string;
  asset_id: string;
  evaluation_at: string;
  problem_statement: string;
  certified_facts: AG010EvidenceItem[];
  operator_statements: AG010EvidenceItem[];
  previous_cases: PreviousCaseMatch[];
  data_quality: DataQualityState;
  source_references: ScoreSourceReference[];
}

export interface FiveWhyNode {
  level: number; // 1 to 5
  question: string;
  answer: string;
  answer_type: WhyAnswerType;
  supporting_evidence_ids: string[];
  confidence_status: WhyConfidenceStatus;
  is_stop_early_node?: boolean;
}

export interface RootCauseCandidate {
  candidate_id: string;
  statement: string;
  status: RootCauseStatus;
  supporting_evidence_ids: string[];
  contradicting_evidence_ids: string[];
  inferred_from_previous_case_id?: string | null;
  requires_human_validation: boolean;
  confirmation_notes?: string | null;
}

export interface RecommendedVerification {
  action_type: 'INSPECT' | 'MEASURE' | 'COMPARE' | 'VERIFY' | 'REVIEW' | 'CONFIRM';
  target_component: string;
  instruction: string;
  rationale: string;
}

export interface AG010Output {
  case_id: string;
  asset_id: string;
  evaluation_at: string;
  problem_statement: string;
  facts: AG010EvidenceItem[];
  previous_cases: PreviousCaseMatch[];
  five_whys: FiveWhyNode[];
  root_cause_candidates: RootCauseCandidate[];
  contradicting_evidence: AG010EvidenceItem[];
  data_gaps: string[];
  recommended_verifications: RecommendedVerification[];
  requires_human_validation: boolean;
  overall_data_quality: DataQualityState;
  source_references: ScoreSourceReference[];
}
