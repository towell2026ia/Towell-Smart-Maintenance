// supabase/functions/agents-orchestrator/modules/m010/fetchers/surveys-fetcher.ts
// Field Surveys & Levantamientos Fetcher for M-010 (v1.0)
// Frozen under Token: M010-SURVEY-FETCH-RULES-001
// Invariant: SURVEY != CHECKLIST DEFINITION != PHYSICAL FINDING (§14-20 PRD-M-010.2-R1)

import { assertReadOnlyOperation } from '../guards/m010-readonly-guard.ts';
import type { AssetSourceReference } from '../types/m010.types.ts';

export interface RawSurveyRecord {
  id: string;
  maquina_id: string;
  tipo_levantamiento: 'LEVANTAMIENTO_PREDICTIVO' | 'LEVANTAMIENTO_AUTONOMO' | 'BITACORA_LEVANTAMIENTO';
  fecha: string;
  tecnico_id?: string | null;
  estado?: string | null;
  observaciones?: string | null;
}

export interface SurveySummary {
  survey_id: string;
  asset_id: string;
  survey_type: RawSurveyRecord['tipo_levantamiento'];
  fecha: string;
  tecnico_id?: string | null;
  estado: string;
  observaciones?: string | null;
  source_reference: AssetSourceReference;
}

export class SurveysFetcher {
  private records: RawSurveyRecord[];

  constructor(records: RawSurveyRecord[]) {
    this.records = records;
  }

  public async fetchByMachineId(
    machineId: string,
    options?: { limit?: number; dateFrom?: string; dateTo?: string }
  ): Promise<SurveySummary[]> {
    assertReadOnlyOperation('SELECT FROM levantamientos_mantenimiento');

    const mId = machineId.trim().toUpperCase();
    let surveys: SurveySummary[] = this.records
      .filter(r => (r.maquina_id || '').trim().toUpperCase() === mId)
      .map(r => ({
        survey_id: r.id,
        asset_id: r.maquina_id,
        survey_type: r.tipo_levantamiento,
        fecha: r.fecha,
        tecnico_id: r.tecnico_id || null,
        estado: r.estado || 'COMPLETADO',
        observaciones: r.observaciones || null,
        source_reference: {
          source_name: 'levantamientos_mantenimiento',
          source_table: 'public.levantamientos_mantenimiento',
          source_id: r.id,
          retrieved_at: new Date().toISOString(),
          relationship_type: 'DIRECT_FK'
        }
      }));

    if (options?.dateFrom) {
      surveys = surveys.filter(s => s.fecha >= options.dateFrom!);
    }
    if (options?.dateTo) {
      surveys = surveys.filter(s => s.fecha <= options.dateTo!);
    }
    if (options?.limit && options.limit > 0) {
      surveys = surveys.slice(0, options.limit);
    }

    return surveys;
  }
}
