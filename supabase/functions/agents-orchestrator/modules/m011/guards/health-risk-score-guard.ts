// supabase/functions/agents-orchestrator/modules/m011/guards/health-risk-score-guard.ts
// Score & Numerical Integrity Guard for M-011 (v1.0)
// Frozen under Token: M011-SCORE-GUARD-001
// Invariant: Prevents NaN, Infinity, out-of-range, and client manipulation (§88-92 PRD-M-011.2)

export class M011ScoreGuardError extends Error {
  constructor(message: string) {
    super(`[M011_SCORE_INTEGRITY_VIOLATION] ${message}`);
    this.name = 'M011ScoreGuardError';
  }
}

export class HealthRiskScoreGuard {
  public static validateScore(score: number | null, scoreType: 'HEALTH' | 'RISK'): void {
    if (score === null) return; // Null is valid for INSUFFICIENT_DATA

    if (Number.isNaN(score)) {
      throw new M011ScoreGuardError(`${scoreType} score evaluated to NaN.`);
    }

    if (!Number.isFinite(score)) {
      throw new M011ScoreGuardError(`${scoreType} score evaluated to Infinity.`);
    }

    if (score < 0 || score > 100) {
      throw new M011ScoreGuardError(`${scoreType} score ${score} is out of allowable range [0, 100].`);
    }
  }

  public static assertNoClientOverrides(clientPayload: Record<string, any>): void {
    const prohibitedKeys = [
      'health_score',
      'risk_score',
      'health_state',
      'risk_state',
      'weights',
      'thresholds',
      'formula'
    ];

    for (const key of prohibitedKeys) {
      if (key in clientPayload && clientPayload[key] !== undefined) {
        throw new M011ScoreGuardError(`Client override of '${key}' is strictly prohibited. Scores must be evaluated server-side.`);
      }
    }
  }
}
