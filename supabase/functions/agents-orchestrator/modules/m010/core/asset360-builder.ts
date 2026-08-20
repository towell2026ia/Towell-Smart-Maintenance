// supabase/functions/agents-orchestrator/modules/m010/core/asset360-builder.ts
// Asset360 Builder & Aggregator for M-010 (v1.0)
// Frozen under Token: M010-SECTION-AGGREGATION-RULES-001
// Invariant: Pure deterministic assembly; zero source mutations (§74-78 PRD)

import { buildAssetTimeline } from '../timeline/asset-timeline-builder.ts';
import { evaluateAssetRecordCompleteness } from '../quality/asset-record-completeness-engine.ts';
import { computeAssetRecordFingerprint } from '../freshness/asset-freshness-resolver.ts';
import type {
  Asset360,
  AssetIdentity,
  AssetWorkOrderSummary,
  AssetFailureSummary,
  AssetMaintenancePlanSummary,
  AssetPartConsumptionSummary,
  AssetAlertSummary
} from '../types/m010.types.ts';
import type { SubtaskSummary } from '../fetchers/work-orders-fetcher.ts';
import type { SurveySummary } from '../fetchers/surveys-fetcher.ts';
import type { PhysicalFindingSummary } from '../fetchers/findings-fetcher.ts';
import type { DowntimeSummary } from '../fetchers/downtime-fetcher.ts';

export function buildAsset360Record(params: {
  identity: AssetIdentity;
  workOrders: AssetWorkOrderSummary[];
  subtasks?: SubtaskSummary[];
  failures: AssetFailureSummary[];
  maintenancePlans: AssetMaintenancePlanSummary[];
  surveys?: SurveySummary[];
  findings?: PhysicalFindingSummary[];
  parts: AssetPartConsumptionSummary[];
  downtime?: DowntimeSummary[];
  alerts: AssetAlertSummary[];
}): Asset360 {
  const assetId = params.identity.asset_id;

  // Build Chronological Timeline
  const timeline = buildAssetTimeline({
    assetId,
    workOrders: params.workOrders,
    subtasks: params.subtasks,
    failures: params.failures,
    maintenancePlans: params.maintenancePlans,
    surveys: params.surveys,
    findings: params.findings,
    parts: params.parts,
    downtime: params.downtime,
    alerts: params.alerts
  });

  // Evaluate Completeness
  const completeness = evaluateAssetRecordCompleteness({
    identity: params.identity,
    work_orders: params.workOrders,
    maintenance_plans: params.maintenancePlans,
    failure_history: params.failures,
    parts_history: params.parts,
    alerts: params.alerts
  });

  // Determine latest dates
  const latestWO = params.workOrders[0];
  const latestMant = params.maintenancePlans[0];
  const latestFail = params.failures[0];
  const activeAlertsCount = params.alerts.filter(a => a.status === 'ACTIVE').length;

  const recordCounts = {
    work_orders: params.workOrders.length,
    subtasks: params.subtasks?.length || 0,
    maintenance: params.maintenancePlans.length,
    failures: params.failures.length,
    parts: params.parts.length,
    alerts: params.alerts.length,
    timeline: timeline.length
  };

  const fingerprint = computeAssetRecordFingerprint({
    assetId,
    recordCounts,
    maxTimestamp: timeline[0]?.occurred_at || null
  });

  return {
    asset_id: assetId,
    identity: params.identity,
    current_status: {
      estatus_operativo: params.identity.estatus,
      activo: params.identity.activo,
      ultima_ot_folio: latestWO?.folio || null,
      ultima_ot_fecha: latestWO?.fecha_creacion || null,
      ultimo_mantenimiento_fecha: latestMant?.fecha_ejecutada || latestMant?.fecha_programada || null,
      ultima_falla_fecha: latestFail?.fecha || null,
      alertas_activas_count: activeAlertsCount
    },
    work_orders: params.workOrders,
    failure_history: params.failures,
    maintenance_plans: params.maintenancePlans,
    parts_history: params.parts,
    alerts: params.alerts,
    timeline,
    data_completeness: completeness,
    retrieved_at: new Date().toISOString(),
    record_version: fingerprint
  };
}
