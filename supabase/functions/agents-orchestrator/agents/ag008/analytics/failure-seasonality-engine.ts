// supabase/functions/agents-orchestrator/agents/ag008/analytics/failure-seasonality-engine.ts
// Failure Seasonality Engine for AG-008 (v1.0)
// Frozen under Token: AG008-SEASONALITY-RULES-001
// Invariant: Requires >= 12 monthly periods. Missing data != zero failures.

import type { FailureSeriesPoint, SeasonalityStatus } from '../types/ag008.types.ts';

export interface SeasonalityAnalysisResult {
  status: SeasonalityStatus;
  monthly_periods_count: number;
  is_statistically_sufficient: boolean;
  detected_cycle_months: number | null;
  seasonality_strength: number | null;
  status_reason: string;
}

export function evaluateFailureSeasonality(
  monthlySeries: FailureSeriesPoint[],
  minMonthsRequired = 12
): SeasonalityAnalysisResult {
  const n = monthlySeries ? monthlySeries.length : 0;

  if (n < minMonthsRequired) {
    return {
      status: 'INSUFFICIENT_HISTORY',
      monthly_periods_count: n,
      is_statistically_sufficient: false,
      detected_cycle_months: null,
      seasonality_strength: null,
      status_reason: `Histórico insuficiente para detectar estacionalidad: se requieren al menos ${minMonthsRequired} meses continuos (disponibles: ${n}).`
    };
  }

  // Calculate autocorrelation with lag 12 or seasonal variance
  // For monthly data, compare variances across repeated calendar months (e.g. comparing month-to-month across years)
  const monthMap = new Map<number, number[]>(); // month (1-12) -> array of event counts

  for (const point of monthlySeries) {
    const parts = point.period_key.split('-');
    if (parts.length >= 2) {
      const monthNum = parseInt(parts[1], 10);
      if (!isNaN(monthNum)) {
        if (!monthMap.has(monthNum)) monthMap.set(monthNum, []);
        monthMap.get(monthNum)!.push(point.event_count);
      }
    }
  }

  let repeatedMonthsCount = 0;
  let seasonalCorrelationScore = 0;

  for (const counts of monthMap.values()) {
    if (counts.length >= 2) {
      repeatedMonthsCount++;
      // Compare repeatability across years
      const maxC = Math.max(...counts);
      const minC = Math.min(...counts);
      if (maxC > 0 && minC / maxC >= 0.7) {
        seasonalCorrelationScore++;
      }
    }
  }

  const isDetected = repeatedMonthsCount >= 4 && seasonalCorrelationScore >= 3;

  return {
    status: isDetected ? 'DETECTED' : 'NOT_DETECTED',
    monthly_periods_count: n,
    is_statistically_sufficient: true,
    detected_cycle_months: isDetected ? 12 : null,
    seasonality_strength: isDetected ? Math.round((seasonalCorrelationScore / repeatedMonthsCount) * 100) / 100 : null,
    status_reason: isDetected
      ? `Patrón estacional anual detectado con base en ${n} meses de histórico continuos.`
      : `No se detectó un patrón estacional recurrente estadísticamente significativo en los ${n} meses analizados.`
  };
}
