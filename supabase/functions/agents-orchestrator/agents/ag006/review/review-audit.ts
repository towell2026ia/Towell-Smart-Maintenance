// supabase/functions/agents-orchestrator/agents/ag006/review/review-audit.ts
// Audit Logger for Draft Review Workflow (AG-006.3)

import type { AuditLogEntry, AuditActionType } from './review.types.ts';

export class ReviewAuditLogger {
  private logs: AuditLogEntry[] = [];

  public logAction(
    draftId: string,
    revision: number,
    userId: string,
    action: AuditActionType,
    details?: { field_code?: string; previous_value?: any; new_value?: any }
  ): AuditLogEntry {
    const entry: AuditLogEntry = {
      audit_id: `AUD-${Date.now()}-${Math.floor(Math.random()*1000)}`,
      draft_id: draftId,
      revision,
      user_id: userId,
      action,
      field_code: details?.field_code,
      previous_value: details?.previous_value,
      new_value: details?.new_value,
      timestamp: new Date().toISOString()
    };
    this.logs.push(entry);
    return entry;
  }

  public getLogsForDraft(draftId: string): AuditLogEntry[] {
    return this.logs.filter(l => l.draft_id === draftId);
  }

  public getAllLogs(): AuditLogEntry[] {
    return [...this.logs];
  }
}
