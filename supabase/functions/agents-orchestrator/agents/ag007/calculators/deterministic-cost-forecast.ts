// supabase/functions/agents-orchestrator/agents/ag007/calculators/deterministic-cost-forecast.ts
// Deterministic Cost Forecast Engine for AG-007 (v1.0)
// Frozen under Token: AG007-DETERMINISTIC-ENGINE-001
// Invariant: Mathematical run-rate forecast without LLM (§96-106 PRD)

export interface ForecastInputs {
  actualSpendToDate: number;
  daysElapsed: number;
  totalDaysInPeriod: number;
  plannedRemainingPreventive?: number;
  committedCosts?: number;
}

export interface ForecastResult {
  forecastTotal: number | null;
  projectedRemaining: number | null;
  burnRatePerDay: number | null;
  status: 'COMPLETE' | 'FORECAST_DATA_PARTIAL' | 'FORECAST_NOT_AVAILABLE';
  method: string;
}

export function calculateDeterministicForecast(inputs: ForecastInputs): ForecastResult {
  const { actualSpendToDate, daysElapsed, totalDaysInPeriod, plannedRemainingPreventive = 0, committedCosts = 0 } = inputs;

  if (totalDaysInPeriod <= 0 || daysElapsed <= 0) {
    return {
      forecastTotal: null,
      projectedRemaining: null,
      burnRatePerDay: null,
      status: 'FORECAST_NOT_AVAILABLE',
      method: 'NONE'
    };
  }

  const remainingDays = Math.max(0, totalDaysInPeriod - daysElapsed);

  // Daily burn rate of actual spend
  const dailyBurnRate = actualSpendToDate / daysElapsed;
  const roundedBurnRate = Math.round(dailyBurnRate * 100) / 100;

  // Run-rate projection for remaining days + specific planned preventive costs
  const projectedRunRate = roundedBurnRate * remainingDays;
  const totalProjectedRemaining = projectedRunRate + plannedRemainingPreventive + committedCosts;
  const roundedRemaining = Math.round(totalProjectedRemaining * 100) / 100;

  const totalForecast = actualSpendToDate + roundedRemaining;
  const roundedForecast = Math.round(totalForecast * 100) / 100;

  return {
    forecastTotal: roundedForecast,
    projectedRemaining: roundedRemaining,
    burnRatePerDay: roundedBurnRate,
    status: 'COMPLETE',
    method: 'DETERMINISTIC_RUN_RATE_PLUS_PLANNED'
  };
}
