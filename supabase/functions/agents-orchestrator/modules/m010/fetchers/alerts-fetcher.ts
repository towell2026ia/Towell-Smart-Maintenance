// supabase/functions/agents-orchestrator/modules/m010/fetchers/alerts-fetcher.ts
// Asset Technical Alerts Fetcher for M-010 (v1.0)
// Frozen under Token: M010-SOURCE-FETCH-RULES-001

import { assertReadOnlyOperation } from '../guards/m010-readonly-guard.ts';
import type { AssetAlertSummary } from '../types/m010.types.ts';

export interface RawAlertRecord {
  signal_id: string;
  signal_type: string;
  target_id: string;
  severity: 'Informativa' | 'Advertencia' | 'Crítica';
  message: string;
  created_at: string;
  status: 'ACTIVE' | 'RESOLVED' | 'ACKNOWLEDGED';
  source_agent: string;
}

export class AlertsFetcher {
  private records: RawAlertRecord[];

  constructor(records: RawAlertRecord[]) {
    this.records = records;
  }

  public async fetchByMachineId(
    machineId: string,
    options?: { limit?: number; status?: string }
  ): Promise<AssetAlertSummary[]> {
    assertReadOnlyOperation('SELECT FROM alertas_mantenimiento');

    const mId = machineId.trim().toUpperCase();
    let alerts: AssetAlertSummary[] = this.records
      .filter(r => (r.target_id || '').trim().toUpperCase() === mId)
      .map(r => ({
        signal_id: r.signal_id,
        signal_type: r.signal_type,
        severity: r.severity,
        message: r.message,
        created_at: r.created_at,
        status: r.status,
        source_agent: r.source_agent,
        source_reference: {
          source_name: r.source_agent,
          source_table: 'public.alertas_mantenimiento',
          source_id: r.signal_id,
          retrieved_at: new Date().toISOString(),
          relationship_type: 'MACHINE_ID_LINK'
        }
      }));

    if (options?.status) {
      alerts = alerts.filter(a => a.status === options.status);
    }
    if (options?.limit && options.limit > 0) {
      alerts = alerts.slice(0, options.limit);
    }

    return alerts;
  }
}
