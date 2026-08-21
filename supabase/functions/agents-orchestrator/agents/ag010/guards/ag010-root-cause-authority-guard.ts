// supabase/functions/agents-orchestrator/agents/ag010/guards/ag010-root-cause-authority-guard.ts
// Root Cause Authority Guard for AG-010.2 (v1.0)
// Frozen under Token: AG010-DATA-MAP-001
// Invariant: AG-010.2 produces 0 root cause hypotheses and 0 confirmed causes (§102-106 PRD-AG-010.2)

export class AG010RootCauseAuthorityViolationError extends Error {
  constructor(message: string) {
    super(`[AG010_ROOT_CAUSE_AUTHORITY_VIOLATION] ${message}`);
    this.name = 'AG010RootCauseAuthorityViolationError';
  }
}

export class AG010RootCauseAuthorityGuard {
  public static assertDeterministicPhaseOutputs(payload: any): void {
    if (payload.root_cause_candidates && payload.root_cause_candidates.length > 0) {
      throw new AG010RootCauseAuthorityViolationError(
        'AG-010.2 is deterministic evidence retrieval only; root_cause_candidates must be empty.'
      );
    }

    if (payload.five_whys && payload.five_whys.length > 0) {
      throw new AG010RootCauseAuthorityViolationError(
        'AG-010.2 is deterministic evidence retrieval only; five_whys narrative must be empty.'
      );
    }
  }
}
