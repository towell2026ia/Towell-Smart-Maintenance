// supabase/functions/agents-orchestrator/agents/ag003/calculators/deviation-calculator.ts
// Deviation Calculator (§32-35 PRD)

import { DeviationCalculationResult } from '../types/ag003.types.ts';
import { DEVIATION_CONFIG } from '../rules/deviation.rules.ts';

export function calculateDeviation(
  currentMetric: number,
  baselineValue: number
): DeviationCalculationResult {
  const current = Math.max(0, currentMetric || 0);
  const baseline = Math.max(0, baselineValue || 0);

  const absoluteDeviation = Number((current - baseline).toFixed(2));

  let relativeDeviation = 0;
  let isRelativeApplicable = false;

  if (baseline > 0) {
    relativeDeviation = Number(((current - baseline) / baseline).toFixed(3));
    isRelativeApplicable = true;
  }

  let trend: 'SIGNIFICANT_INCREASE' | 'MODERATE_INCREASE' | 'STABLE' | 'DECREASE' = 'STABLE';
  if (isRelativeApplicable) {
    if (relativeDeviation >= DEVIATION_CONFIG.SIGNIFICANT_INCREASE_RELATIVE_THRESHOLD) {
      trend = 'SIGNIFICANT_INCREASE';
    } else if (relativeDeviation >= DEVIATION_CONFIG.MODERATE_INCREASE_RELATIVE_THRESHOLD) {
      trend = 'MODERATE_INCREASE';
    } else if (relativeDeviation <= DEVIATION_CONFIG.DECREASE_RELATIVE_THRESHOLD) {
      trend = 'DECREASE';
    } else {
      trend = 'STABLE';
    }
  } else {
    // If baseline was 0 and current > 0
    if (current > 5) trend = 'SIGNIFICANT_INCREASE';
    else if (current > 0) trend = 'MODERATE_INCREASE';
    else trend = 'STABLE';
  }

  return {
    current_metric: current,
    baseline_value: baseline,
    absolute_deviation: absoluteDeviation,
    relative_deviation: relativeDeviation,
    is_relative_applicable: isRelativeApplicable,
    trend
  };
}
