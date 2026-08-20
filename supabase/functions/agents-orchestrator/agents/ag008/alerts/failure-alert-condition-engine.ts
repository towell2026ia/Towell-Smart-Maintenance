// supabase/functions/agents-orchestrator/agents/ag008/alerts/failure-alert-condition-engine.ts
// Deterministic Failure Alert Condition Engine for AG-008 (v1.0)
// Frozen under Token: AG008-ALERT-THRESHOLD-RULES-001
// Invariant: Emits structured technical alert conditions based on deterministic rules and thresholds. No LLM used.

import type { FailureSignal, FailureRecurrenceGroup, FailureSeriesPoint, FailureScope } from '../types/ag008.types.ts';
import type { ReincidenceEventPair } from '../analytics/failure-reincidence-engine.ts';
import type { TrendAnalysisResult } from '../analytics/failure-trend-engine.ts';
import type { ConcentrationSummary } from '../analytics/failure-concentration-engine.ts';
import type { CrossMachinePattern } from '../analytics/cross-machine-pattern-engine.ts';
import type { SeasonalityAnalysisResult } from '../analytics/failure-seasonality-engine.ts';
import type { DataQualityReport } from '../quality/failure-data-quality-engine.ts';

export interface AlertEvaluationInputs {
  scope: FailureScope;
  targetId: string;
  recurrenceGroups: FailureRecurrenceGroup[];
  reincidences: ReincidenceEventPair[];
  trend: TrendAnalysisResult;
  concentration: ConcentrationSummary;
  crossMachinePatterns: CrossMachinePattern[];
  seasonality: SeasonalityAnalysisResult;
  dataQuality: DataQualityReport;
}

export function evaluateFailureAlertConditions(inputs: AlertEvaluationInputs): FailureSignal[] {
  const alerts: FailureSignal[] = [];
  const now = new Date().toISOString();
  const ruleVersion = 'AG008-ALERT-THRESHOLD-RULES-001';

  // 1. Recurrence Alert (>= 3 occurrences of same mode on same machine in <= 30 days)
  for (const rec of inputs.recurrenceGroups) {
    if (rec.status === 'RECURRENT') {
      alerts.push({
        signal_id: `ALT-REC-${rec.machine_id}-${rec.normalized_failure}-${Date.now()}`,
        signal_type: 'FAILURE_RECURRENCE_ALERT',
        scope: 'MACHINE',
        target_id: rec.machine_id,
        severity: 'Advertencia',
        message: `Falla recurrente detectada en ${rec.machine_id}: modo '${rec.normalized_failure}' ha ocurrido ${rec.occurrence_count} veces en los últimos 30 días (intervalo promedio: ${rec.repeat_interval_days_avg || 'N/A'} días).`,
        metrics: {
          event_count: rec.occurrence_count,
          recurrence_count: rec.occurrence_count - 1
        },
        evidence_event_ids: rec.events.map(e => e.failure_event_id),
        source_references: rec.events.map(e => e.source_reference),
        rule_version: ruleVersion,
        created_at: now
      });
    }
  }

  // 2. Reincidence Alert (reappearance of failure <= 15 days post-closure)
  for (const rein of inputs.reincidences) {
    alerts.push({
      signal_id: `ALT-REIN-${rein.machine_id}-${rein.normalized_failure}-${Date.now()}`,
      signal_type: 'FAILURE_REINCIDENCE_ALERT',
      scope: 'MACHINE',
      target_id: rein.machine_id,
      severity: 'Crítica',
      message: `Reincidencia técnica en ${rein.machine_id}: falla '${rein.normalized_failure}' reapareció ${rein.days_after_closure} días después del cierre de reparación previa (${rein.repair_reference}).`,
      metrics: {
        event_count: 2
      },
      evidence_event_ids: [rein.initial_event_id, rein.reincidence_event_id],
      source_references: [rein.repair_reference],
      rule_version: ruleVersion,
      created_at: now
    });
  }

  // 3. Trend Up Alert (consistent upward failure trend)
  if (inputs.trend.direction === 'UP' && inputs.trend.is_statistically_valid) {
    alerts.push({
      signal_id: `ALT-TREND-UP-${inputs.targetId}-${Date.now()}`,
      signal_type: 'FAILURE_TREND_UP',
      scope: inputs.scope,
      target_id: inputs.targetId,
      severity: 'Advertencia',
      message: `Tendencia creciente de fallas en ${inputs.targetId}: incremento del ${inputs.trend.percentage_change || 0}% en los últimos ${inputs.trend.periods_evaluated} periodos (pendiente: ${inputs.trend.slope}).`,
      metrics: {
        trend_percentage: inputs.trend.percentage_change || undefined
      },
      evidence_event_ids: [],
      source_references: [],
      rule_version: ruleVersion,
      created_at: now
    });
  }

  // 4. Concentration Alert (single machine concentrates > 35% of total failures)
  if (inputs.concentration.top_machines.length > 0) {
    const topM = inputs.concentration.top_machines[0];
    if (topM.share_percentage >= 35.0 && inputs.concentration.total_known_failures >= 5) {
      alerts.push({
        signal_id: `ALT-CONC-${topM.machine_id}-${Date.now()}`,
        signal_type: 'FAILURE_CONCENTRATION_ALERT',
        scope: 'MACHINE',
        target_id: topM.machine_id,
        severity: 'Informativa',
        message: `Concentración crítica de fallas: la máquina ${topM.machine_id} concentra el ${topM.share_percentage}% (${topM.failure_count} fallas) del total evaluado.`,
        metrics: {
          event_count: topM.failure_count
        },
        evidence_event_ids: [],
        source_references: [],
        rule_version: ruleVersion,
        created_at: now
      });
    }
  }

  // 5. Cross-Machine Pattern Alert (same failure emerging in >= 3 distinct machines)
  for (const pat of inputs.crossMachinePatterns) {
    if (pat.is_cross_machine_pattern) {
      alerts.push({
        signal_id: `ALT-CROSS-${pat.normalized_failure}-${Date.now()}`,
        signal_type: 'CROSS_MACHINE_PATTERN_ALERT',
        scope: 'GLOBAL',
        target_id: 'GLOBAL',
        severity: 'Advertencia',
        message: `Patrón transversal entre máquinas: modo '${pat.normalized_failure}' detectado simultáneamente en ${pat.distinct_machines_count} máquinas distintas (${pat.machine_ids.join(', ')}).`,
        metrics: {
          event_count: pat.total_occurrences
        },
        evidence_event_ids: pat.event_ids,
        source_references: [],
        rule_version: ruleVersion,
        created_at: now
      });
    }
  }

  // 6. Data Quality Alert (high percentage of unattributed / partial records)
  if (inputs.dataQuality.overall_quality === 'UNRELIABLE' || inputs.dataQuality.overall_quality === 'PARTIAL') {
    alerts.push({
      signal_id: `ALT-DQ-${inputs.targetId}-${Date.now()}`,
      signal_type: 'DATA_QUALITY_ALERT',
      scope: inputs.scope,
      target_id: inputs.targetId,
      severity: 'Informativa',
      message: `Aviso de calidad de datos de fallas (${inputs.dataQuality.overall_quality}): ${inputs.dataQuality.warnings.join(' ')}`,
      metrics: {
        event_count: inputs.dataQuality.total_events
      },
      evidence_event_ids: [],
      source_references: [],
      rule_version: ruleVersion,
      created_at: now
    });
  }

  return alerts;
}
