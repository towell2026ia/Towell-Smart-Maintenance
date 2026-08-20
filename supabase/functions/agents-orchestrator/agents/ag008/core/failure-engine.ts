// supabase/functions/agents-orchestrator/agents/ag008/core/failure-engine.ts
// Master Deterministic Failure Intelligence Engine for AG-008 (v1.0)
// Frozen under Token: AG008-DETERMINISTIC-ENGINE-001

import crypto from 'node:crypto';
import type {
  FailureEvent,
  FailureSource,
  MaintenanceType,
  DepartmentCode,
  FailureScope,
  TimeGranularity,
  FailureSeriesPoint,
  FailureRecurrenceGroup,
  FailureSignal
} from '../types/ag008.types.ts';

import { normalizeFailureText } from '../normalizers/failure-normalizer.ts';
import { validateMachineIdentity } from '../guards/failure-machine-guard.ts';
import { resolveDepartment } from '../resolvers/failure-department-resolver.ts';
import { resolveFailureTime } from '../resolvers/failure-time-resolver.ts';
import { deduplicateFailureEvents, type DedupeResult } from '../dedupers/failure-event-dedupe.ts';
import { buildFailureSeries } from '../series/failure-series-builder.ts';
import { computeFailureFrequency, type FrequencySummary } from '../analytics/failure-frequency-engine.ts';
import { computeFailureRecurrence } from '../analytics/failure-recurrence-engine.ts';
import { computeFailureReincidence, type ReincidenceEventPair } from '../analytics/failure-reincidence-engine.ts';
import { computeFailureTrend, type TrendAnalysisResult } from '../analytics/failure-trend-engine.ts';
import { computeFailureConcentration, type ConcentrationSummary } from '../analytics/failure-concentration-engine.ts';
import { detectCrossMachinePatterns, type CrossMachinePattern } from '../analytics/cross-machine-pattern-engine.ts';
import { evaluateFailureSeasonality, type SeasonalityAnalysisResult } from '../analytics/failure-seasonality-engine.ts';
import { evaluateDataQuality, type DataQualityReport } from '../quality/failure-data-quality-engine.ts';
import { evaluateFailureAlertConditions } from '../alerts/failure-alert-condition-engine.ts';

export interface RawFailureInput {
  id?: string | number;
  folio?: string;
  source_type: FailureSource;
  source_table: string;
  maquina_id?: string | null;
  depto?: string | null;
  descripcion?: string | null;
  fecha?: string | Date | null;
  hora?: string | null;
  fecha_solicitud?: string | Date | null;
  fecha_ejecucion?: string | Date | null;
  fecha_cierre?: string | Date | null;
  trabajo_realizado?: string | null;
  tipo_mantenimiento?: MaintenanceType | string | null;
  turno?: number | null;
  es_hallazgo_fisico?: boolean;
  estatus?: string | null;
}

export interface FailureAnalysisOptions {
  scope: FailureScope;
  targetId?: string | null;
  periodGranularity?: TimeGranularity;
  validMachineCatalog?: string[];
  departmentCatalogMap?: Map<string, DepartmentCode>;
}

export interface ConsolidatedFailureAnalysis {
  snapshot_id: string;
  scope: FailureScope;
  target_id: string;
  period_granularity: TimeGranularity;
  raw_records_count: number;
  deduped_events_count: number;
  dedupe_metrics: DedupeResult;
  frequency: FrequencySummary;
  recurrence_groups: FailureRecurrenceGroup[];
  reincidences: ReincidenceEventPair[];
  trend: TrendAnalysisResult;
  concentration: ConcentrationSummary;
  cross_machine_patterns: CrossMachinePattern[];
  seasonality: SeasonalityAnalysisResult;
  data_quality: DataQualityReport;
  deterministic_alerts: FailureSignal[];
  series: FailureSeriesPoint[];
  events: FailureEvent[];
  rule_versions: Record<string, string>;
  calculated_at: string;
}

export function executeFailureAnalysis(
  rawRecords: RawFailureInput[],
  options: FailureAnalysisOptions
): ConsolidatedFailureAnalysis {
  const granularity: TimeGranularity = options.periodGranularity || 'WEEKLY';
  const targetId = options.targetId || 'GLOBAL';
  const catalog = options.validMachineCatalog || [];

  // 1. Transform raw records into canonical FailureEvents
  const parsedEvents: FailureEvent[] = [];

  for (const raw of rawRecords) {
    const rawDesc = raw.descripcion || 'Sin descripción';
    const normalizedMode = normalizeFailureText(rawDesc);
    const machVal = validateMachineIdentity(raw.maquina_id, catalog);
    const dept = resolveDepartment(raw.depto, options.departmentCatalogMap, machVal.resolvedMachineId);
    const timeRes = resolveFailureTime(raw.fecha, raw.hora, raw.fecha_solicitud, raw.turno);

    const isResolved = Boolean(raw.fecha_cierre) || (raw.estatus ? raw.estatus.toUpperCase().includes('CERRAD') || raw.estatus.toUpperCase().includes('RESUELT') : false);
    const resolutionDate = raw.fecha_cierre ? new Date(raw.fecha_cierre).toISOString().substring(0, 10) : null;

    let maintType: MaintenanceType = 'CORRECTIVO';
    if (raw.tipo_mantenimiento) {
      const upperM = String(raw.tipo_mantenimiento).toUpperCase();
      if (upperM.includes('PREV')) maintType = 'PREVENTIVO';
      else if (upperM.includes('PRED')) maintType = 'PREDICTIVO';
      else if (upperM.includes('AUTO')) maintType = 'AUTONOMO';
    }

    const eventId = `FE-${crypto.createHash('sha256').update(`${raw.source_type}:${raw.id || raw.folio || ''}:${machVal.resolvedMachineId || ''}:${timeRes.date || ''}:${normalizedMode}`).digest('hex').substring(0, 16)}`;

    parsedEvents.push({
      failure_event_id: eventId,
      machine_id: machVal.resolvedMachineId,
      department: dept,
      occurred_at: timeRes.occurred_at || new Date().toISOString(),
      date: timeRes.date || 'NODATE',
      time: timeRes.time,
      shift: timeRes.shift,
      failure_raw: rawDesc,
      failure_normalized: normalizedMode,
      failure_category: null,
      maintenance_type: maintType,
      source_type: raw.source_type,
      source_reference: `${raw.source_table}:${raw.id || raw.folio || 'NOLINK'}`,
      work_order_folio: raw.folio || null,
      physical_finding: Boolean(raw.es_hallazgo_fisico),
      is_resolved: isResolved,
      resolution_date: resolutionDate,
      resolution_notes: raw.trabajo_realizado || null,
      data_quality: timeRes.is_approximated ? 'PARTIAL' : machVal.isValid ? 'RELIABLE' : 'PARTIAL'
    });
  }

  // 2. Deduplicate Events (Exact and Cross-source Telegram <-> OT)
  const dedupeResult = deduplicateFailureEvents(parsedEvents);
  const cleanEvents = dedupeResult.dedupedEvents;

  // 3. Build Series
  const series = buildFailureSeries(cleanEvents, granularity, {
    scope: options.scope,
    targetId: options.targetId
  });

  // Also build monthly series specifically for seasonality
  const monthlySeries = buildFailureSeries(cleanEvents, 'MONTHLY', {
    scope: options.scope,
    targetId: options.targetId
  });

  // 4. Compute Analytics Engines
  const freqSummary = computeFailureFrequency(series);
  const recurrenceGroups = computeFailureRecurrence(cleanEvents);
  const reincidences = computeFailureReincidence(cleanEvents);
  const trend = computeFailureTrend(series);
  const concentration = computeFailureConcentration(cleanEvents);
  const crossPatterns = detectCrossMachinePatterns(cleanEvents);
  const seasonality = evaluateFailureSeasonality(monthlySeries);
  const dataQuality = evaluateDataQuality(cleanEvents);

  // 5. Evaluate Deterministic Alert Conditions
  const alerts = evaluateFailureAlertConditions({
    scope: options.scope,
    targetId,
    recurrenceGroups,
    reincidences,
    trend,
    concentration,
    crossMachinePatterns: crossPatterns,
    seasonality,
    dataQuality
  });

  const snapshotId = `SNAP-AG008-${crypto.createHash('sha256').update(`${options.scope}:${targetId}:${cleanEvents.length}:${Date.now()}`).digest('hex').substring(0, 16)}`;

  return {
    snapshot_id: snapshotId,
    scope: options.scope,
    target_id: targetId,
    period_granularity: granularity,
    raw_records_count: rawRecords.length,
    deduped_events_count: cleanEvents.length,
    dedupe_metrics: dedupeResult,
    frequency: freqSummary,
    recurrence_groups: recurrenceGroups,
    reincidences,
    trend,
    concentration,
    cross_machine_patterns: crossPatterns,
    seasonality,
    data_quality: dataQuality,
    deterministic_alerts: alerts,
    series,
    events: cleanEvents,
    rule_versions: {
      engine: 'AG008-DETERMINISTIC-ENGINE-001',
      normalization: 'AG008-FAILURE-NORMALIZATION-RULES-001',
      dedupe: 'AG008-DEDUPE-RULES-001',
      trend: 'AG008-TREND-RULES-001',
      recurrence: 'AG008-RECURRENCE-RULES-001',
      reincidence: 'AG008-REINCIDENCE-RULES-001',
      concentration: 'AG008-CONCENTRATION-RULES-001',
      cross_machine: 'AG008-CROSS-MACHINE-RULES-001',
      seasonality: 'AG008-SEASONALITY-RULES-001',
      alerts: 'AG008-ALERT-THRESHOLD-RULES-001'
    },
    calculated_at: new Date().toISOString()
  };
}
