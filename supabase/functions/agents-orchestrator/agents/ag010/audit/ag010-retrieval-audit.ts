// supabase/functions/agents-orchestrator/agents/ag010/audit/ag010-retrieval-audit.ts
// Technical Execution Audit Recorder for AG-010 Retrieval Engine (v1.0)
// Frozen under Tokens: AG010-RETRIEVAL-AUDIT-001, AG010-AUDIT-001
// Invariant: Non-blocking in-memory audit log (§114-118 PRD-AG-010.2)

export interface AG010RetrievalAuditRecord {
  request_id: string;
  event_id?: string | null;
  correlation_id?: string | null;
  agent_id: 'AG-010';
  case_id: string;
  asset_id: string;
  evaluation_at: string;
  evidence_count: number;
  fact_count: number;
  statement_count: number;
  derived_signal_count: number;
  previous_case_candidates: number;
  previous_case_returned: number;
  data_quality: string;
  retrieval_model_sha256: string;
  provider: 'NONE';
  model: 'NONE';
  tokens: 0;
  cost: 0;
  duration_ms: number;
  status: 'SUCCESS' | 'INSUFFICIENT_DATA' | 'FAILED';
  created_at: string;
}

export class AG010RetrievalAuditor {
  private static auditLogs: AG010RetrievalAuditRecord[] = [];

  public static recordAudit(record: AG010RetrievalAuditRecord): void {
    this.auditLogs.push(record);
  }

  public static getAuditLogs(): AG010RetrievalAuditRecord[] {
    return [...this.auditLogs];
  }

  public static clearLogs(): void {
    this.auditLogs = [];
  }
}
