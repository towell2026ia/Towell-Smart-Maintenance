// supabase/functions/agents-orchestrator/agents/ag010/guards/ag010-evaluation-time-guard.ts
// Evaluation Time Cutoff Guard for AG-010 (v1.0)
// Frozen under Token: AG010-EVALUATION-TIME-RULES-001
// Invariant: future_case_leakage = 0, future_evidence_leakage = 0 (§24-27 PRD-AG-010.2)

export class AG010EvaluationTimeGuard {
  public static isHistoricalEvent(eventTimestampIso: string, evaluationAtIso: string): boolean {
    const eventTime = new Date(eventTimestampIso).getTime();
    const cutoffTime = new Date(evaluationAtIso).getTime();
    return eventTime <= cutoffTime;
  }

  public static filterHistoricalItems<T extends { occurred_at?: string; fecha_creacion?: string }>(
    items: T[],
    evaluationAtIso: string
  ): T[] {
    const cutoffTime = new Date(evaluationAtIso).getTime();
    return items.filter(item => {
      const ts = item.occurred_at || item.fecha_creacion;
      if (!ts) return true;
      return new Date(ts).getTime() <= cutoffTime;
    });
  }
}
