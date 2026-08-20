// supabase/functions/agents-orchestrator/modules/m010/contracts/m010-asset360.contract.ts
// Asset 360 Consolidation Contract for M-010 (v1.0)
// Frozen under Token: M010-ASSET360-CONTRACT-001
// Invariant: Read-only consolidation of existing sources; zero source mutations (§10-13 PRD)

import type { Asset360, AssetIdentity, AssetDataCompleteness } from '../types/m010.types.ts';

export function createEmptyAsset360(identity: AssetIdentity): Asset360 {
  const initialCompleteness: AssetDataCompleteness = {
    overall_completeness: 'COMPLETE',
    score_percentage: 100,
    sections_completeness: {
      IDENTITY: 'COMPLETE',
      WORK_ORDERS: 'UNKNOWN',
      SUBTASKS: 'NOT_APPLICABLE',
      MAINTENANCE: 'UNKNOWN',
      CHECKLISTS: 'UNKNOWN',
      SURVEYS: 'UNKNOWN',
      FINDINGS: 'UNKNOWN',
      FAILURES: 'UNKNOWN',
      PARTS: 'UNKNOWN',
      DOWNTIME: 'UNKNOWN',
      ALERTS: 'UNKNOWN',
      TIMELINE: 'UNKNOWN'
    },
    missing_fields: [],
    warnings: []
  };

  return {
    asset_id: identity.asset_id,
    identity,
    current_status: {
      estatus_operativo: identity.estatus,
      activo: identity.activo,
      ultima_ot_folio: null,
      ultima_ot_fecha: null,
      ultimo_mantenimiento_fecha: null,
      ultima_falla_fecha: null,
      alertas_activas_count: 0
    },
    work_orders: [],
    failure_history: [],
    maintenance_plans: [],
    parts_history: [],
    alerts: [],
    timeline: [],
    data_completeness: initialCompleteness,
    retrieved_at: new Date().toISOString(),
    record_version: 'M010-1.0'
  };
}
