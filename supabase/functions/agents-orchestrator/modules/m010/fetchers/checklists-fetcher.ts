// supabase/functions/agents-orchestrator/modules/m010/fetchers/checklists-fetcher.ts
// Checklists Fetcher for M-010 (v1.0)
// Frozen under Token: M010-CHECKLIST-FETCH-RULES-001
// Invariant: CHECKLIST DEFINITION != CHECKLIST EXECUTION; checklist_template_as_execution = 0 (§5-13 PRD-M-010.2-R1)

import { assertReadOnlyOperation } from '../guards/m010-readonly-guard.ts';
import type { AssetSourceReference } from '../types/m010.types.ts';

export interface RawChecklistDefinition {
  id: string;
  nombre: string;
  tipo_mantenimiento: string;
  depto: string;
  preguntas_count: number;
}

export interface RawChecklistExecution {
  id: string;
  orden_id?: string | null;
  maquina_id: string;
  checklist_id: string;
  fecha_ejecucion: string;
  respuestas_aprobadas: number;
  respuestas_fallidas: number;
}

export interface ChecklistSummary {
  execution_id: string;
  checklist_definition_id: string;
  nombre_checklist: string;
  tipo_mantenimiento: string;
  fecha_ejecucion: string;
  associated_ot_id?: string | null;
  is_execution: true;
  source_reference: AssetSourceReference;
}

export class ChecklistsFetcher {
  private definitions: RawChecklistDefinition[];
  private executions: RawChecklistExecution[];

  constructor(definitions: RawChecklistDefinition[], executions: RawChecklistExecution[]) {
    this.definitions = definitions;
    this.executions = executions;
  }

  public async fetchByMachineId(
    machineId: string,
    options?: { limit?: number; dateFrom?: string; dateTo?: string }
  ): Promise<ChecklistSummary[]> {
    assertReadOnlyOperation('SELECT FROM respuestas_checklist_orden');

    const mId = machineId.trim().toUpperCase();
    const machineExecutions = this.executions.filter(e => (e.maquina_id || '').trim().toUpperCase() === mId);

    const summaries: ChecklistSummary[] = machineExecutions.map(exec => {
      const def = this.definitions.find(d => d.id === exec.checklist_id);
      return {
        execution_id: exec.id,
        checklist_definition_id: exec.checklist_id,
        nombre_checklist: def?.nombre || `Checklist ${exec.checklist_id}`,
        tipo_mantenimiento: def?.tipo_mantenimiento || 'CORRECTIVO',
        fecha_ejecucion: exec.fecha_ejecucion,
        associated_ot_id: exec.orden_id || null,
        is_execution: true,
        source_reference: {
          source_name: 'respuestas_checklist_orden',
          source_table: 'public.respuestas_checklist_orden',
          source_id: exec.id,
          retrieved_at: new Date().toISOString(),
          relationship_type: 'DIRECT_FK'
        }
      };
    });

    let filtered = summaries;
    if (options?.dateFrom) {
      filtered = filtered.filter(s => s.fecha_ejecucion >= options.dateFrom!);
    }
    if (options?.dateTo) {
      filtered = filtered.filter(s => s.fecha_ejecucion <= options.dateTo!);
    }
    if (options?.limit && options.limit > 0) {
      filtered = filtered.slice(0, options.limit);
    }

    return filtered;
  }
}
