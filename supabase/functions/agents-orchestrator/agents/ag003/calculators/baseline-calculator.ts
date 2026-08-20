// supabase/functions/agents-orchestrator/agents/ag003/calculators/baseline-calculator.ts
// Baseline Calculator (§26-31 PRD)

import { BaselineCalculationResult } from '../types/ag003.types.ts';
import { BASELINE_CONFIG } from '../rules/baseline.rules.ts';

export function calculateBaseline(
  historicalSegundas: number,
  historicalRolls: number,
  historicalPzas?: number
): BaselineCalculationResult {
  const rolls = Math.max(0, historicalRolls || 0);
  const segundas = Math.max(0, historicalSegundas || 0);
  const pzas = Math.max(0, historicalPzas || 0);

  if (pzas >= 50 && rolls >= BASELINE_CONFIG.MIN_HISTORICAL_ROLLS_FOR_MACHINE_BASELINE) {
    const meanPct = Number(((segundas / pzas) * 100).toFixed(2));
    return {
      baseline_value: meanPct,
      baseline_rolls_count: rolls,
      baseline_available: true,
      baseline_type: 'MACHINE_HISTORICAL_MEAN'
    };
  }

  if (rolls >= BASELINE_CONFIG.MIN_HISTORICAL_ROLLS_FOR_MACHINE_BASELINE) {
    const mean = Number((segundas / rolls).toFixed(2));
    return {
      baseline_value: mean,
      baseline_rolls_count: rolls,
      baseline_available: true,
      baseline_type: 'MACHINE_HISTORICAL_MEAN'
    };
  }

  if (BASELINE_CONFIG.ALLOW_PEER_FALLBACK) {
    return {
      baseline_value: BASELINE_CONFIG.DEFAULT_PEER_GROUP_FALLBACK_BASELINE,
      baseline_rolls_count: rolls,
      baseline_available: true,
      baseline_type: 'PEER_GROUP_FALLBACK'
    };
  }

  return {
    baseline_value: 0,
    baseline_rolls_count: rolls,
    baseline_available: false,
    baseline_type: 'NOT_AVAILABLE'
  };
}
