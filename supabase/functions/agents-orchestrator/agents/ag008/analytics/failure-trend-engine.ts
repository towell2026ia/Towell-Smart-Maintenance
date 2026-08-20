// supabase/functions/agents-orchestrator/agents/ag008/analytics/failure-trend-engine.ts
// Failure Trend Engine for AG-008 (v1.0)
// Frozen under Token: AG008-TREND-RULES-001
// Method: Linear regression slope / percentage shift over chronological series.

import type { FailureSeriesPoint, TrendDirection } from '../types/ag008.types.ts';

export interface TrendAnalysisResult {
  direction: TrendDirection;
  slope: number;
  percentage_change: number | null;
  periods_evaluated: number;
  is_statistically_valid: boolean;
  status_reason: string;
}

export function computeFailureTrend(
  series: FailureSeriesPoint[],
  minPeriodsRequired = 3
): TrendAnalysisResult {
  if (!series || series.length < minPeriodsRequired) {
    return {
      direction: 'INSUFFICIENT_DATA',
      slope: 0,
      percentage_change: null,
      periods_evaluated: series ? series.length : 0,
      is_statistically_valid: false,
      status_reason: `Se requieren al menos ${minPeriodsRequired} periodos continuos para calcular tendencia (disponibles: ${series ? series.length : 0}).`
    };
  }

  // Simple Linear Regression over period indices (0, 1, 2, ... N-1)
  const n = series.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  for (let i = 0; i < n; i++) {
    const y = series[i].event_count;
    sumX += i;
    sumY += y;
    sumXY += i * y;
    sumXX += i * i;
  }

  const denominator = n * sumXX - sumX * sumX;
  const slope = denominator !== 0 ? (n * sumXY - sumX * sumY) / denominator : 0;

  const firstCount = series[0].event_count;
  const lastCount = series[series.length - 1].event_count;
  const pctChange = firstCount > 0 ? Math.round(((lastCount - firstCount) / firstCount) * 10000) / 100 : null;

  let direction: TrendDirection = 'STABLE';
  if (slope > 0.25 || (pctChange !== null && pctChange >= 25)) {
    direction = 'UP';
  } else if (slope < -0.25 || (pctChange !== null && pctChange <= -25)) {
    direction = 'DOWN';
  } else {
    direction = 'STABLE';
  }

  return {
    direction,
    slope: Math.round(slope * 1000) / 1000,
    percentage_change: pctChange,
    periods_evaluated: n,
    is_statistically_valid: true,
    status_reason: `Tendencia ${direction} calculada sobre ${n} periodos con pendiente ${slope.toFixed(3)}.`
  };
}
