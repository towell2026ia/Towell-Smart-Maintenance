// supabase/functions/agents-orchestrator/modules/m010/timeline/asset-timeline-builder.ts
// Asset 360 Timeline Builder for M-010 (v1.0)
// Frozen under Token: M010-TIMELINE-RULES-001
// Invariant: Pure aggregation from retrieved sections; stable chronological ordering (§79-93 PRD)

import { sortTimelineEventsChronologically, createTimelineEvent } from '../contracts/m010-asset-timeline.contract.ts';
import { dedupeItemsBySourceId } from '../relationships/relationship-dedupe.ts';
import type {
  AssetTimelineEvent,
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

export function buildAssetTimeline(params: {
  assetId: string;
  workOrders: AssetWorkOrderSummary[];
  subtasks?: SubtaskSummary[];
  failures: AssetFailureSummary[];
  maintenancePlans: AssetMaintenancePlanSummary[];
  surveys?: SurveySummary[];
  findings?: PhysicalFindingSummary[];
  parts: AssetPartConsumptionSummary[];
  downtime?: DowntimeSummary[];
  alerts: AssetAlertSummary[];
}): AssetTimelineEvent[] {
  const events: AssetTimelineEvent[] = [];

  // 1. Work Orders
  for (const wo of params.workOrders) {
    events.push(createTimelineEvent({
      event_id: `TL-WO-${wo.id}`,
      asset_id: params.assetId,
      event_type: 'WORK_ORDER',
      occurred_at: wo.fecha_creacion,
      title: `OT ${wo.folio} (${wo.tipo_mantenimiento})`,
      summary: wo.descripcion,
      status: wo.estatus,
      source_reference: wo.source_reference
    }));
  }

  // 2. Subtasks (Separated from Parent OTs)
  if (params.subtasks) {
    for (const sub of params.subtasks) {
      events.push(createTimelineEvent({
        event_id: `TL-SUB-${sub.id}`,
        asset_id: params.assetId,
        event_type: 'SUBTASK',
        occurred_at: sub.fecha_creacion,
        title: `Subtarea ${sub.subtask_folio}`,
        summary: sub.descripcion,
        status: sub.estatus,
        source_reference: sub.source_reference
      }));
    }
  }

  // 3. Failures
  for (const f of params.failures) {
    events.push(createTimelineEvent({
      event_id: `TL-FAIL-${f.id}`,
      asset_id: params.assetId,
      event_type: 'FAILURE',
      occurred_at: f.fecha,
      title: `Falla: ${f.failure_normalized}`,
      summary: f.failure_raw,
      source_reference: f.source_reference
    }));
  }

  // 4. Maintenance Plans
  for (const m of params.maintenancePlans) {
    events.push(createTimelineEvent({
      event_id: `TL-MANT-${m.id}`,
      asset_id: params.assetId,
      event_type: 'PREVENTIVE',
      occurred_at: m.fecha_ejecutada || m.fecha_programada,
      title: `Plan ${m.tipo} (${m.periodo_referencia})`,
      summary: `Estado: ${m.estado}`,
      status: m.estado,
      source_reference: m.source_reference
    }));
  }

  // 5. Surveys (Levantamientos)
  if (params.surveys) {
    for (const s of params.surveys) {
      events.push(createTimelineEvent({
        event_id: `TL-SRV-${s.survey_id}`,
        asset_id: params.assetId,
        event_type: s.survey_type === 'LEVANTAMIENTO_PREDICTIVO' ? 'PREDICTIVE_SURVEY' : 'AUTONOMOUS_SURVEY',
        occurred_at: s.fecha,
        title: `${s.survey_type}`,
        summary: s.observaciones || 'Inspección de campo',
        status: s.estado,
        source_reference: s.source_reference
      }));
    }
  }

  // 6. Physical Findings
  if (params.findings) {
    for (const pf of params.findings) {
      events.push(createTimelineEvent({
        event_id: `TL-FIND-${pf.finding_id}`,
        asset_id: params.assetId,
        event_type: 'PHYSICAL_FINDING',
        occurred_at: pf.fecha,
        title: `Hallazgo Físico (${pf.gravedad})`,
        summary: pf.descripcion_hallazgo,
        source_reference: pf.source_reference
      }));
    }
  }

  // 7. Parts
  for (const p of params.parts) {
    events.push(createTimelineEvent({
      event_id: `TL-PART-${p.id}`,
      asset_id: params.assetId,
      event_type: 'PART',
      occurred_at: p.fecha_uso,
      title: `Refacción: ${p.nombre_refaccion}`,
      summary: `Cantidad: ${p.cantidad} ${p.unidad} (OT: ${p.associated_ot_folio})`,
      source_reference: p.source_reference
    }));
  }

  // 8. Downtime
  if (params.downtime) {
    for (const dt of params.downtime) {
      events.push(createTimelineEvent({
        event_id: `TL-DT-${dt.id}`,
        asset_id: params.assetId,
        event_type: 'DOWNTIME',
        occurred_at: dt.fecha_inicio,
        title: `Paro Operacional (${dt.duracion_minutos} min)`,
        summary: dt.causa_aparente || 'Paro registrado',
        source_reference: dt.source_reference
      }));
    }
  }

  // 9. Alerts
  for (const a of params.alerts) {
    events.push(createTimelineEvent({
      event_id: `TL-ALT-${a.signal_id}`,
      asset_id: params.assetId,
      event_type: 'ALERT',
      occurred_at: a.created_at,
      title: `Alerta: ${a.signal_type}`,
      summary: a.message,
      status: a.status,
      source_reference: a.source_reference
    }));
  }

  // Deduplicate items that may have arrived from multiple join paths
  const dedupedEvents = dedupeItemsBySourceId(events);

  // Return sorted chronologically DESC
  return sortTimelineEventsChronologically(dedupedEvents, 'DESC');
}
