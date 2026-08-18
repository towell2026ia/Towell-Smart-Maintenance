// supabase/functions/agents-orchestrator/agents/ag003/selectors/top4-predictive-selector.ts
// Top-4 Deterministic Predictive Selector (§62-69 PRD)

import { PredictiveCandidate } from '../types/ag003.types.ts';
import { SELECTION_CONFIG } from '../rules/selection.rules.ts';

export interface Top4SelectionResult {
  allCandidatesCount: number;
  eligibleCandidatesCount: number;
  availableSlots: number;
  selectedCandidates: PredictiveCandidate[];
  selectedCount: number;
  status: 'SUCCESS' | 'NO_CANDIDATES' | 'CAPACITY_REACHED';
}

export function selectTop4PredictiveCandidates(
  candidates: PredictiveCandidate[],
  availableSlots = 4
): Top4SelectionResult {
  const maxSlots = Math.max(0, Math.min(SELECTION_CONFIG.MAX_MONTHLY_SELECTIONS, availableSlots));

  if (maxSlots === 0) {
    return {
      allCandidatesCount: candidates.length,
      eligibleCandidatesCount: candidates.filter(c => c.eligibility).length,
      availableSlots: 0,
      selectedCandidates: [],
      selectedCount: 0,
      status: 'CAPACITY_REACHED'
    };
  }

  // Filter only eligible candidates above threshold or with positive deviation
  const eligible = candidates.filter(c => {
    if (!c.eligibility) return false;
    if (c.data_status === 'NO_PRODUCTION_DATA' || c.data_status === 'INSUFFICIENT_DATA') return false;
    const score = c.priority_score?.total_score || 0;
    const hasQualitySignal = (c.quality_metrics?.total_segundas || 0) > 0;
    return score >= SELECTION_CONFIG.MIN_SELECTION_SCORE_THRESHOLD || hasQualitySignal;
  });

  if (eligible.length === 0) {
    return {
      allCandidatesCount: candidates.length,
      eligibleCandidatesCount: 0,
      availableSlots: maxSlots,
      selectedCandidates: [],
      selectedCount: 0,
      status: 'NO_CANDIDATES'
    };
  }

  // Deterministic sorting with tie breakers
  const sorted = [...eligible].sort((a, b) => {
    // 1. Total Priority Score DESC
    const scoreDiff = (b.priority_score?.total_score || 0) - (a.priority_score?.total_score || 0);
    if (Math.abs(scoreDiff) > 0.001) return scoreDiff;

    // 2. Relative Deviation DESC
    const devDiff = (b.deviation?.relative_deviation || 0) - (a.deviation?.relative_deviation || 0);
    if (Math.abs(devDiff) > 0.001) return devDiff;

    // 3. Historical Failures DESC
    const failDiff = (b.historical_context?.failures_count || 0) - (a.historical_context?.failures_count || 0);
    if (failDiff !== 0) return failDiff;

    // 4. Criticality Score DESC
    const critDiff = (b.priority_score?.criticality_score || 0) - (a.priority_score?.criticality_score || 0);
    if (Math.abs(critDiff) > 0.001) return critDiff;

    // 5. Machine ID ASC (Stable Tie-Breaker)
    return a.machine_id.localeCompare(b.machine_id);
  });

  const selected = sorted.slice(0, maxSlots).map((c, index) => ({
    ...c,
    predictive_priority_rank: index + 1,
    selection_reason: `Seleccionado Top-${index + 1} con Score ${c.priority_score.total_score} pts y ${c.quality_metrics.total_segundas} segundas detectadas en 30d.`
  }));

  return {
    allCandidatesCount: candidates.length,
    eligibleCandidatesCount: eligible.length,
    availableSlots: maxSlots,
    selectedCandidates: selected,
    selectedCount: selected.length,
    status: 'SUCCESS'
  };
}
