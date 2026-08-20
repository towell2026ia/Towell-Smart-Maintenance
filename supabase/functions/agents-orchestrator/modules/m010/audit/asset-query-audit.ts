// supabase/functions/agents-orchestrator/modules/m010/audit/asset-query-audit.ts
// Formal Query & Execution Audit Layer for M-010 (v1.0)
// Frozen under Token: M010-ASSET-QUERY-AUDIT-001
// Invariant: Technical audit only; zero sensitive payload dumps (photos, signatures, full text) (§46-60 PRD-M-010.2-R1)

import type { AssetSectionType } from '../types/m010.types.ts';

export interface AssetQueryAuditRecord {
  request_id: string;
  event_id?: string | null;
  correlation_id?: string | null;
  module_id: 'M-010';
  asset_id: string;
  mode: 'SUMMARY' | 'DETAIL' | 'CONTEXT';
  sections_requested: AssetSectionType[];
  sections_returned: AssetSectionType[];
  date_from?: string | null;
  date_to?: string | null;
  record_counts: {
    work_orders: number;
    subtasks: number;
    maintenance_plans: number;
    checklists: number;
    surveys: number;
    findings: number;
    failures: number;
    parts: number;
    downtime: number;
    alerts: number;
    timeline_events: number;
  };
  database_query_count: number;
  asset_record_version: string;
  duration_ms: number;
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED' | 'ASSET_NOT_FOUND';
  created_at: string;
}

export class AssetQueryAuditor {
  private static auditLogs: AssetQueryAuditRecord[] = [];

  public static recordAudit(audit: AssetQueryAuditRecord): void {
    // Ensure no sensitive text or payload is logged
    this.auditLogs.push(audit);
  }

  public static getAuditLogs(): AssetQueryAuditRecord[] {
    return [...this.auditLogs];
  }

  public static clearLogs(): void {
    this.auditLogs = [];
  }
}
