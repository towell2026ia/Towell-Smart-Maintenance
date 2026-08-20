// supabase/functions/agents-orchestrator/agents/ag008/analytics/failure-frequency-engine.ts
// Failure Frequency Engine for AG-008 (v1.0)
// Frozen under Token: AG008-FREQUENCY-RULES-001

import type { FailureEvent, FailureSeriesPoint } from '../types/ag008.types.ts';

export interface FrequencySummary {
  total_events: number;
  total_periods: number;
  average_failures_per_period: number;
  max_failures_in_single_period: number;
  metric_type: 'COUNT'; // Strict guard: No FAILURES_PER_OPERATING_HOUR without valid exposure denominator
  mtbf_status: 'MTBF_NOT_SUPPORTED_WITH_CURRENT_DATA';
}

export function computeFailureFrequency(series: FailureSeriesPoint[]): FrequencySummary {
  if (!series || series.length === 0) {
    return {
      total_events: 0,
      total_periods: 0,
      average_failures_per_period: 0,
      max_failures_in_single_period: 0,
      metric_type: 'COUNT',
      mtbf_status: 'MTBF_NOT_SUPPORTED_WITH_CURRENT_DATA'
    };
  }

  let totalEvents = 0;
  let maxEvents = 0;

  for (const point of series) {
    totalEvents += point.event_count;
    if (point.event_count > maxEvents) {
      maxEvents = point.event_count;
    }
  }

  const avg = Math.round((totalEvents / series.length) * 100) / 100;

  return {
    total_events: totalEvents,
    total_periods: series.length,
    average_failures_per_period: avg,
    max_failures_in_single_period: maxEvents,
    metric_type: 'COUNT',
    mtbf_status: 'MTBF_NOT_SUPPORTED_WITH_CURRENT_DATA'
  };
}
