// supabase/functions/agents-orchestrator/modules/m010/fetchers/work-orders-fetcher.ts
// Work Orders & Subtasks Fetcher for M-010 (v1.0)
// Frozen under Token: M010-OT-SUBTASK-RULES-001
// Invariant: Parent OT != Subtask; subtask_as_parent_OT_double_count = 0 (§84-94 PRD-M-010.2-R1)

import { assertReadOnlyOperation } from '../guards/m010-readonly-guard.ts';
import type { AssetWorkOrderSummary, AssetSourceReference } from '../types/m010.types.ts';

export interface RawWorkOrderRecord {
  id: string;
  folio: string;
  tipo_mantenimiento?: string | null;
  maquina_id: string;
  parent_ot_id?: string | null;
  estatus?: string | null;
  fecha_creacion: string;
  fecha_cierre?: string | null;
  descripcion?: string | null;
  trabajo_realizado?: string | null;
}

export interface SubtaskSummary {
  id: string;
  subtask_folio: string;
  parent_ot_id: string;
  parent_ot_folio?: string | null;
  descripcion: string;
  estatus: string;
  fecha_creacion: string;
  source_reference: AssetSourceReference;
}

export interface WorkOrdersFetchResult {
  work_orders: AssetWorkOrderSummary[];
  subtasks: SubtaskSummary[];
}

export class WorkOrdersFetcher {
  private records: RawWorkOrderRecord[];

  constructor(records: RawWorkOrderRecord[]) {
    this.records = records;
  }

  public async fetchByMachineId(
    machineId: string,
    options?: { limit?: number; dateFrom?: string; dateTo?: string }
  ): Promise<WorkOrdersFetchResult> {
    assertReadOnlyOperation('SELECT FROM ordenes_trabajo');

    const mId = machineId.trim().toUpperCase();
    const matchingRecords = this.records.filter(r => (r.maquina_id || '').trim().toUpperCase() === mId);

    const parentOTs: AssetWorkOrderSummary[] = [];
    const subtasks: SubtaskSummary[] = [];

    // Separate Parent OTs from Subtasks
    for (const r of matchingRecords) {
      if (r.parent_ot_id) {
        subtasks.push({
          id: r.id,
          subtask_folio: r.folio,
          parent_ot_id: r.parent_ot_id,
          descripcion: r.descripcion || '',
          estatus: r.estatus || 'ABIERTA',
          fecha_creacion: r.fecha_creacion,
          source_reference: {
            source_name: 'ordenes_trabajo_subtareas',
            source_table: 'public.ordenes_trabajo',
            source_id: r.id,
            retrieved_at: new Date().toISOString(),
            relationship_type: 'DIRECT_FK'
          }
        });
      } else {
        const associatedSubtasks = matchingRecords.filter(sub => sub.parent_ot_id === r.id);

        let tipoMant: AssetWorkOrderSummary['tipo_mantenimiento'] = 'CORRECTIVO';
        const rawTipo = (r.tipo_mantenimiento || '').trim().toUpperCase();
        if (rawTipo === 'PREVENTIVO' || rawTipo === 'PREDICTIVO' || rawTipo === 'AUTONOMO' || rawTipo === 'MEJORA') {
          tipoMant = rawTipo;
        }

        parentOTs.push({
          id: r.id,
          folio: r.folio,
          tipo_mantenimiento: tipoMant,
          estatus: r.estatus || 'CERRADA',
          fecha_creacion: r.fecha_creacion,
          fecha_cierre: r.fecha_cierre || null,
          descripcion: r.descripcion || '',
          trabajo_realizado: r.trabajo_realizado || null,
          subtask_count: associatedSubtasks.length,
          parts_count: 0,
          source_reference: {
            source_name: 'ordenes_trabajo',
            source_table: 'public.ordenes_trabajo',
            source_id: r.id,
            retrieved_at: new Date().toISOString(),
            relationship_type: 'DIRECT_FK'
          }
        });
      }
    }

    let filteredOTs = parentOTs;
    if (options?.dateFrom) {
      filteredOTs = filteredOTs.filter(o => o.fecha_creacion >= options.dateFrom!);
    }
    if (options?.dateTo) {
      filteredOTs = filteredOTs.filter(o => o.fecha_creacion <= options.dateTo!);
    }
    if (options?.limit && options.limit > 0) {
      filteredOTs = filteredOTs.slice(0, options.limit);
    }

    return {
      work_orders: filteredOTs,
      subtasks
    };
  }
}
