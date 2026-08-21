// supabase/functions/agents-orchestrator/agents/ag010/audit/ag010-semantic-audit.ts
// Semantic Execution Audit Logger for AG-010 (v1.0)
// Frozen under Token: AG010-AUDIT-001
// Invariant: Non-blocking in-memory audit log for semantic layer (§151-153 PRD-AG-010.3)

export interface AG010SemanticAuditRecord {
  request_id: string;
  event_id?: string | null;
  correlation_id?: string | null;
  agent_id: 'AG-010';
  case_id: string;
  asset_id: string;
  evaluation_at: string;
  retrieval_model_sha256: string;
  provider: 'Xiaomi MiMo' | 'FAST_PATH';
  model: 'mimo-v2.5' | 'NONE';
  prompt_version: string;
  semantic_contract_version: string;
  input_evidence_count: number;
  previous_case_count: number;
  five_whys_depth: number;
  root_cause_candidate_count: number;
  requires_human_validation: boolean;
  protected_field_diff: 0;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  cost_usd: number;
  latency_ms: number;
  status: 'SUCCESS' | 'FAST_PATH' | 'VALIDATION_FAILED' | 'FAILED';
  created_at: string;
}

export class AG010SemanticAuditor {
  private static auditLogs: AG010SemanticAuditRecord[] = [];

  public static recordAudit(record: AG010SemanticAuditRecord): void {
    this.auditLogs.push(record);
  }

  public static getAuditLogs(): AG010SemanticAuditRecord[] {
    return [...this.auditLogs];
  }

  public static clearLogs(): void {
    this.auditLogs = [];
  }
}
