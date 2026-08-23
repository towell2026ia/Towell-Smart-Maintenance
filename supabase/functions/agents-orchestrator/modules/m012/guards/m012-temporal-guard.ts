// supabase/functions/agents-orchestrator/modules/m012/guards/m012-temporal-guard.ts
// Temporal Cutoff Guard for M-012 (v1.0)
// Frozen under Token: M012-TEMPORAL-RULES-001
// Invariant: future_preparation_data_leakage = 0 (§104-109 PRD-M-012.2)

export class M012TemporalGuard {
  public static isRecordEligible(recordTimestamp: string | null | undefined, evaluationAt: string): boolean {
    if (!recordTimestamp) return true; // Undated metadata
    const recordTime = new Date(recordTimestamp).getTime();
    const cutoffTime = new Date(evaluationAt).getTime();
    return recordTime <= cutoffTime;
  }

  public static filterRecordsByCutoff<T extends { created_at?: string; effective_from?: string; occurred_at?: string }>(
    records: T[],
    evaluationAt: string
  ): T[] {
    const cutoffTime = new Date(evaluationAt).getTime();
    return records.filter(r => {
      const ts = r.occurred_at || r.effective_from || r.created_at;
      if (!ts) return true;
      return new Date(ts).getTime() <= cutoffTime;
    });
  }
}
