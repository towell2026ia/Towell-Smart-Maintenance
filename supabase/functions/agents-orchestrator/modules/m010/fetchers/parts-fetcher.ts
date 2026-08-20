// supabase/functions/agents-orchestrator/modules/m010/fetchers/parts-fetcher.ts
// Spare Parts Consumption Fetcher for M-010 (v1.0)
// Frozen under Token: M010-SOURCE-FETCH-RULES-001

import { assertReadOnlyOperation } from '../guards/m010-readonly-guard.ts';
import type { AssetPartConsumptionSummary } from '../types/m010.types.ts';

export interface RawPartRecord {
  id: string;
  maquina_id: string;
  refaccion_id: string;
  codigo_refaccion: string;
  nombre_refaccion: string;
  cantidad: number;
  unidad?: string | null;
  fecha_uso: string;
  associated_ot_folio: string;
  costo_unitario?: number | null;
}

export class PartsFetcher {
  private records: RawPartRecord[];

  constructor(records: RawPartRecord[]) {
    this.records = records;
  }

  public async fetchByMachineId(
    machineId: string,
    options?: { limit?: number; dateFrom?: string; dateTo?: string }
  ): Promise<AssetPartConsumptionSummary[]> {
    assertReadOnlyOperation('SELECT FROM refacciones_utilizadas');

    const mId = machineId.trim().toUpperCase();
    let parts: AssetPartConsumptionSummary[] = this.records
      .filter(r => (r.maquina_id || '').trim().toUpperCase() === mId)
      .map(r => ({
        id: r.id,
        refaccion_id: r.refaccion_id,
        codigo_refaccion: r.codigo_refaccion,
        nombre_refaccion: r.nombre_refaccion,
        cantidad: r.cantidad,
        unidad: r.unidad || 'PZA',
        fecha_uso: r.fecha_uso,
        associated_ot_folio: r.associated_ot_folio,
        costo_unitario: r.costo_unitario !== undefined ? r.costo_unitario : null,
        source_reference: {
          source_name: 'refacciones_utilizadas',
          source_table: 'public.refacciones_utilizadas',
          source_id: r.id,
          retrieved_at: new Date().toISOString(),
          relationship_type: 'DIRECT_FK'
        }
      }));

    if (options?.dateFrom) {
      parts = parts.filter(p => p.fecha_uso >= options.dateFrom!);
    }
    if (options?.dateTo) {
      parts = parts.filter(p => p.fecha_uso <= options.dateTo!);
    }
    if (options?.limit && options.limit > 0) {
      parts = parts.slice(0, options.limit);
    }

    return parts;
  }
}
