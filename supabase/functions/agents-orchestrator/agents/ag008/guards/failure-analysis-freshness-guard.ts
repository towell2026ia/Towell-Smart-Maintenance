// supabase/functions/agents-orchestrator/agents/ag008/guards/failure-analysis-freshness-guard.ts
// Freshness Guard to detect if sources/rules/scope changed for AG-008 (v1.0)

export interface FreshnessState {
  sourceFingerprint: string;
  scope: string;
  periodKey: string;
  ruleVersion: string;
}

export function isAnalysisFresh(
  currentState: FreshnessState,
  previousSnapshot: FreshnessState | null
): boolean {
  if (!previousSnapshot) return false;
  return (
    currentState.sourceFingerprint === previousSnapshot.sourceFingerprint &&
    currentState.scope === previousSnapshot.scope &&
    currentState.periodKey === previousSnapshot.periodKey &&
    currentState.ruleVersion === previousSnapshot.ruleVersion
  );
}
