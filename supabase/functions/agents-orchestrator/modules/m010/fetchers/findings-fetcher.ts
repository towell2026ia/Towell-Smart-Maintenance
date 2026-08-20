// supabase/functions/agents-orchestrator/modules/m010/fetchers/findings-fetcher.ts
// Physical Findings Fetcher for M-010 (v1.0)
// Frozen under Token: M010-FINDING-FETCH-RULES-001
// Invariant: PHYSICAL FINDING != AG-008 FAILURE SIGNAL; invented_physical_findings = 0 (§21-29 PRD-M-010.2-R1)

import { assertReadOnlyOperation } from '../guards/m010-readonly-guard.ts';
import type { AssetSourceReference } from '../types/m010.types.ts';

export interface RawFindingRecord {
  id: string;
  levantamiento_id?: string | null;
  orden_id?: string | null;
  maquina_id: string;
  fecha: string;
  bloque_o_item?: string | null;
  hallazgo: string;
  gravedad?: 'LEVE' | 'MODERADA' | 'CRITICA' | null;
  evidencia?: string | null;
}

export interface PhysicalFindingSummary {
  finding_id: string;
  asset_id: string;
  fecha: string;
  bloque_o_item?: string | null;
  descripcion_hallazgo: string;
  gravedad: 'LEVE' | 'MODERADA' | 'CRITICA';
  associated_survey_id?: string | null;
  associated_ot_id?: string | null;
  is_physical_finding: true;
  source_reference: AssetSourceReference;
}

export class FindingsFetcher {
  private records: RawFindingRecord[];

  constructor(records: RawFindingRecord[]) {
    this.records = records;
  }

  public async fetchByMachineId(
    machineId: string,
    options?: { limit?: number; dateFrom?: string; dateTo?: string }
  ): Promise<PhysicalFindingSummary[]> {
    assertReadOnlyOperation('SELECT FROM hallazgos_levantamientos');

    const mId = machineId.trim().toUpperCase();
    let findings: PhysicalFindingSummary[] = this.records
      .filter(r => (r.maquina_id || '').trim().toUpperCase() === mId)
      .map(r => {
        let grav: PhysicalFindingSummary['gravedad'] = 'MODERADA';
        if (r.gravedad === 'LEVE' || r.gravedad === 'CRITICA') {
          grav = r.gravedad;
        }

        return {
          finding_id: r.id,
          asset_id: r.maquina_id,
          fecha: r.fecha,
          bloque_o_item: r.bloque_o_item || null,
          descripcion_hallazgo: r.hallazgo,
          gravedad: grav,
          associated_survey_id: r.levantamiento_id || null,
          associated_ot_id: r.orden_id || null,
          is_physical_finding: true,
          source_reference: {
            source_name: 'hallazgos_levantamientos',
            source_table: 'public.respuestas_checklist_autonomo',
            source_id: r.id,
            retrieved_at: new Date().toISOString(),
            relationship_type: 'DIRECT_FK'
          }
        };
      });

    if (options?.dateFrom) {
      findings = findings.filter(f => f.fecha >= options.dateFrom!);
    }
    if (options?.dateTo) {
      findings = findings.filter(f => f.fecha <= options.dateTo!);
    }
    if (options?.limit && options.limit > 0) {
      findings = findings.slice(0, options.limit);
    }

    return findings;
  }
}
