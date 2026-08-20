// supabase/functions/agents-orchestrator/modules/m010/fetchers/failures-fetcher.ts
// Failure History Fetcher for M-010 (v1.0)
// Frozen under Token: M010-SOURCE-FETCH-RULES-001

import { assertReadOnlyOperation } from '../guards/m010-readonly-guard.ts';
import type { AssetFailureSummary, AssetDepartment } from '../types/m010.types.ts';

export interface RawFailureRecord {
  id: string;
  maquina_id: string;
  falla_normalizada: string;
  falla_raw: string;
  fecha: string;
  depto: string;
  source_type: string;
  associated_ot_folio?: string | null;
}

export class FailuresFetcher {
  private records: RawFailureRecord[];

  constructor(records: RawFailureRecord[]) {
    this.records = records;
  }

  public async fetchByMachineId(
    machineId: string,
    options?: { limit?: number; dateFrom?: string; dateTo?: string }
  ): Promise<AssetFailureSummary[]> {
    assertReadOnlyOperation('SELECT FROM fallas_historicas');

    const mId = machineId.trim().toUpperCase();
    let fails: AssetFailureSummary[] = this.records
      .filter(r => (r.maquina_id || '').trim().toUpperCase() === mId)
      .map(r => {
        let dept: AssetDepartment = 'PF';
        const dUpper = (r.depto || '').trim().toUpperCase();
        if (dUpper === 'CF' || dUpper === 'TF' || dUpper === 'AF') {
          dept = dUpper;
        }

        return {
          id: r.id,
          failure_normalized: r.falla_normalizada,
          failure_raw: r.falla_raw,
          fecha: r.fecha,
          depto: dept,
          source_type: r.source_type,
          associated_ot_folio: r.associated_ot_folio || null,
          source_reference: {
            source_name: 'fallas_historicas',
            source_table: r.source_type === 'TELEGRAM' ? 'public.stg_telegram_ordenes_telares' : 'public.ordenes_trabajo',
            source_id: r.id,
            retrieved_at: new Date().toISOString(),
            relationship_type: 'DIRECT_FK'
          }
        };
      });

    if (options?.dateFrom) {
      fails = fails.filter(f => f.fecha >= options.dateFrom!);
    }
    if (options?.dateTo) {
      fails = fails.filter(f => f.fecha <= options.dateTo!);
    }
    if (options?.limit && options.limit > 0) {
      fails = fails.slice(0, options.limit);
    }

    return fails;
  }
}
