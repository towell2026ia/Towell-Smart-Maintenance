// supabase/functions/agents-orchestrator/modules/m011/audit/health-risk-calculation-audit.ts
// Technical Execution Audit Layer for M-011 (v1.0)
// Frozen under Token: M011-HEALTH-RISK-AUDIT-001
// Invariant: Technical metrics only; zero sensitive payload dumps (§154-158 PRD-M-011.2)

import type { HealthState, RiskState } from '../types/m011.types.ts';

export interface HealthRiskAuditRecord {
  request_id: string;
  event_id?: string | null;
  correlation_id?: string | null;
  module_id: 'M-011';
  asset_id: string;
  evaluation_at: string;
  health_model_version: string;
  risk_model_version: string;
  m011_model_sha256: string;
  health_score: number | null;
  health_state: HealthState;
  risk_score: number | null;
  risk_state: RiskState;
  health_sufficient: boolean;
  risk_sufficient: boolean;
  duration_ms: number;
  status: 'SUCCESS' | 'INSUFFICIENT_DATA' | 'FAILED';
  created_at: string;
}

export class HealthRiskAuditor {
  private static auditLogs: HealthRiskAuditRecord[] = [];

  public static recordAudit(record: HealthRiskAuditRecord): void {
    this.auditLogs.push(record);
  }

  public static getAuditLogs(): HealthRiskAuditRecord[] {
    return [...this.auditLogs];
  }

  public static clearLogs(): void {
    this.auditLogs = [];
  }
}
