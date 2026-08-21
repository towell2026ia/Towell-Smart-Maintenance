// supabase/functions/agents-orchestrator/agents/ag011/audit/ag011-memory-audit.ts
// Execution Audit Logger for AG-011 (v1.0)
// Frozen under Token: AG011-AUDIT-001
// Invariant: Non-blocking audit record generation (§156-161 PRD-AG-011.2)

export interface AG011AuditRecord {
  request_id: string;
  event_id: string | null;
  correlation_id: string | null;
  agent_id: 'AG-011';
  operation: string;
  memory_id?: string;
  memory_version?: string;
  status_before?: string;
  status_after?: string;
  asset_id?: string;
  evaluation_at?: string;
  evidence_count: number;
  retrieval_count: number;
  duration_ms: number;
  provider: 'NONE';
  model: 'NONE';
  tokens: 0;
  cost_usd: 0;
  status: 'SUCCESS' | 'FAILED';
  error_message?: string | null;
}

export class AG011MemoryAudit {
  public static createRecord(params: {
    request_id: string;
    event_id?: string | null;
    correlation_id?: string | null;
    operation: string;
    memory_id?: string;
    memory_version?: string;
    status_before?: string;
    status_after?: string;
    asset_id?: string;
    evaluation_at?: string;
    evidence_count?: number;
    retrieval_count?: number;
    duration_ms: number;
    status: 'SUCCESS' | 'FAILED';
    error_message?: string | null;
  }): AG011AuditRecord {
    return {
      request_id: params.request_id,
      event_id: params.event_id || null,
      correlation_id: params.correlation_id || null,
      agent_id: 'AG-011',
      operation: params.operation,
      memory_id: params.memory_id,
      memory_version: params.memory_version,
      status_before: params.status_before,
      status_after: params.status_after,
      asset_id: params.asset_id,
      evaluation_at: params.evaluation_at,
      evidence_count: params.evidence_count || 0,
      retrieval_count: params.retrieval_count || 0,
      duration_ms: params.duration_ms,
      provider: 'NONE',
      model: 'NONE',
      tokens: 0,
      cost_usd: 0,
      status: params.status,
      error_message: params.error_message || null
    };
  }
}
