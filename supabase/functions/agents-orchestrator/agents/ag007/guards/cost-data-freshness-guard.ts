// supabase/functions/agents-orchestrator/agents/ag007/guards/cost-data-freshness-guard.ts
// Data Freshness Guard for AG-007 (v1.0)
// Frozen under Token: AG007-DETERMINISTIC-ENGINE-001
// Invariant: Avoid redundant recalculation if sources and rules remain unchanged (§132-134 PRD)

export interface FreshnessState {
  lastSourceUpdate: string;
  lastCalculation: string;
  sourceHash: string;
  isRecalculationNeeded: boolean;
}

export function evaluateDataFreshness(
  lastSourceTimestamp: string,
  lastCalculationTimestamp: string | null,
  currentSourceHash: string,
  lastCachedSourceHash: string | null
): FreshnessState {
  if (!lastCalculationTimestamp || !lastCachedSourceHash) {
    return {
      lastSourceUpdate: lastSourceTimestamp,
      lastCalculation: new Date().toISOString(),
      sourceHash: currentSourceHash,
      isRecalculationNeeded: true
    };
  }

  const isHashChanged = currentSourceHash !== lastCachedSourceHash;
  const isSourceNewer = new Date(lastSourceTimestamp) > new Date(lastCalculationTimestamp);

  return {
    lastSourceUpdate: lastSourceTimestamp,
    lastCalculation: lastCalculationTimestamp,
    sourceHash: currentSourceHash,
    isRecalculationNeeded: isHashChanged || isSourceNewer
  };
}
