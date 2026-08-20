// supabase/functions/agents-orchestrator/modules/m010/fetchers/downtime-fetcher.ts
// Operational Downtime Fetcher for M-010 (v1.0)
// Frozen under Token: M010-SOURCE-FETCH-RULES-001

import { assertReadOnlyOperation } from '../guards/m010-readonly-guard.ts';
import type { AssetSourceReference } from '../types/m010.types.ts';

export interface RawDowntimeRecord {
  id: string;
  maquina_id: string;
  fecha_inicio: string;
  fecha_fin: string;
  duracion_minutos: number;
  causa_aparente?: string | null;
  associated_ot_folio?: string | null;
}

export interface DowntimeSummary {
  id: string;
  asset_id: string;
  fecha_inicio: string;
  fecha_fin: string;
  duracion_minutos: number;
  causa_aparente?: string | null;
  associated_ot_folio?: string | null;
  source_reference: AssetSourceReference;
}

export class DowntimeFetcher {
  private records: RawDowntimeRecord[];

  constructor(records: RawDowntimeRecord[]) {
    this.records = records;
  }

  public async fetchByMachineId(
    machineId: string,
    options?: { limit?: number; dateFrom?: string; dateTo?: string }
  ): Promise<DowntimeSummary[]> {
    assertReadOnlyOperation('SELECT FROM paros_operacionales');

    const mId = machineId.trim().toUpperCase();
    let dt: DowntimeSummary[] = this.records
      .filter(r => (r.maquina_id || '').trim().toUpperCase() === mId)
      .map(r => ({
        id: r.id,
        asset_id: r.maquina_id,
        fecha_inicio: r.fecha_inicio,
        fecha_fin: r.fecha_fin,
        duracion_minutos: r.duracion_minutos,
        causa_aparente: r.causa_aparente || null,
        associated_ot_folio: r.associated_ot_folio || null,
        source_reference: {
          source_name: 'paros_operacionales',
          source_table: 'public.ordenes_trabajo',
          source_id: r.id,
          retrieved_at: new Date().toISOString(),
          relationship_type: 'DIRECT_FK'
        }
      }));

    if (options?.dateFrom) {
      dt = dt.filter(d => d.fecha_inicio >= options.dateFrom!);
    }
    if (options?.dateTo) {
      dt = dt.filter(d => d.fecha_inicio <= options.dateTo!);
    }
    if (options?.limit && options.limit > 0) {
      dt = dt.slice(0, options.limit);
    }

    return dt;
  }
}
