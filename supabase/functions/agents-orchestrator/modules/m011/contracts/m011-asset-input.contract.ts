// supabase/functions/agents-orchestrator/modules/m011/contracts/m011-asset-input.contract.ts
// Asset Input Contract for M-011 consuming M-010 Context (v1.0)
// Frozen under Token: M011-ASSET-INPUT-001
// Invariant: M-011 requests only required sections from M-010 without unrestricted data dump (§29-32 PRD-M-011.1)

import type { AssetContextRequest, AssetSectionType } from '../../m010/types/m010.types.ts';
import type { AssetCriticality, ScoreSourceReference } from '../types/m011.types.ts';

export const M011_REQUIRED_M010_SECTIONS: AssetSectionType[] = [
  'IDENTITY',
  'MAINTENANCE',
  'FAILURES',
  'DOWNTIME',
  'FINDINGS',
  'ALERTS'
];

export function buildM011ContextRequest(assetId: string): AssetContextRequest {
  return {
    consumer_id: 'M-011',
    asset_id: assetId,
    requested_sections: M011_REQUIRED_M010_SECTIONS
  };
}

export interface M011AssetInputContext {
  asset_id: string;
  identity: {
    nombre: string;
    depto: string;
    tipo: string;
    modelo?: string | null;
    marca?: string | null;
    serie?: string | null;
    criticidad: AssetCriticality;
    estatus: string;
    activo: boolean;
  };
  failure_metrics: {
    total_failures_90d: number;
    failure_recurrence_score?: number | null; // Consumed from AG-008
    failure_trend?: 'UP' | 'DOWN' | 'STABLE' | 'INSUFFICIENT_DATA' | null; // Consumed from AG-008
  };
  maintenance_history: {
    preventive_compliance_rate: number | null; // 0 to 1.0
    autonomous_compliance_rate: number | null; // 0 to 1.0
    overdue_maintenances_count: number;
  };
  findings: {
    active_critical_findings_count: number;
    active_moderate_findings_count: number;
    active_mild_findings_count: number;
  };
  downtime_history: {
    total_downtime_minutes_90d: number;
    downtime_events_count_90d: number;
  };
  alerts: {
    active_critical_alerts: number;
    active_warning_alerts: number;
  };
  source_references: ScoreSourceReference[];
}
