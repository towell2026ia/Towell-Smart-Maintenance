// supabase/functions/agents-orchestrator/modules/m010/fetchers/maintenance-fetcher.ts
// Maintenance Plans & Calendars Fetcher for M-010 (v1.0)
// Frozen under Token: M010-SOURCE-FETCH-RULES-001

import { assertReadOnlyOperation } from '../guards/m010-readonly-guard.ts';
import type { AssetMaintenancePlanSummary } from '../types/m010.types.ts';

export interface RawMaintenancePlanRecord {
  id: string;
  maquina_id: string;
  tipo: 'PREVENTIVO_ANUAL' | 'PREDICTIVO_SEMANAL' | 'AUTONOMO_SEMANAL';
  anio: number;
  periodo_referencia: string;
  fecha_programada: string;
  fecha_ejecutada?: string | null;
  estado?: string | null;
}

export class MaintenanceFetcher {
  private records: RawMaintenancePlanRecord[];

  constructor(records: RawMaintenancePlanRecord[]) {
    this.records = records;
  }

  public async fetchByMachineId(
    machineId: string,
    options?: { limit?: number; dateFrom?: string; dateTo?: string }
  ): Promise<AssetMaintenancePlanSummary[]> {
    assertReadOnlyOperation('SELECT FROM calendarios_mantenimiento');

    const mId = machineId.trim().toUpperCase();
    let plans: AssetMaintenancePlanSummary[] = this.records
      .filter(r => (r.maquina_id || '').trim().toUpperCase() === mId)
      .map(r => {
        let estado: AssetMaintenancePlanSummary['estado'] = 'PROGRAMADO';
        const rawEst = (r.estado || '').trim().toUpperCase();
        if (rawEst === 'EJECUTADO' || rawEst === 'CANCELADO' || rawEst === 'REPROGRAMADO') {
          estado = rawEst;
        }

        return {
          id: r.id,
          tipo: r.tipo,
          anio: r.anio,
          periodo_referencia: r.periodo_referencia,
          fecha_programada: r.fecha_programada,
          fecha_ejecutada: r.fecha_ejecutada || null,
          estado,
          source_reference: {
            source_name: 'calendarios_mantenimiento',
            source_table: r.tipo === 'PREVENTIVO_ANUAL' ? 'public.calendario_preventivo_anual' : 'public.calendario_autonomo_semanal',
            source_id: r.id,
            retrieved_at: new Date().toISOString(),
            relationship_type: 'DIRECT_FK'
          }
        };
      });

    if (options?.dateFrom) {
      plans = plans.filter(p => p.fecha_programada >= options.dateFrom!);
    }
    if (options?.dateTo) {
      plans = plans.filter(p => p.fecha_programada <= options.dateTo!);
    }
    if (options?.limit && options.limit > 0) {
      plans = plans.slice(0, options.limit);
    }

    return plans;
  }
}
