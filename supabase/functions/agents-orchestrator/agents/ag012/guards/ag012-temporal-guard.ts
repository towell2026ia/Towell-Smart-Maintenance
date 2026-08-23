// supabase/functions/agents-orchestrator/agents/ag012/guards/ag012-temporal-guard.ts
// Temporal Guard preventing future data leakage (v1.0)
// Frozen under Token: AG012-TEMPORAL-RULES-001

export class AG012TemporalGuard {
  public static isRecordFuture(recordTimestamp: string, evaluationAt: string): boolean {
    if (!recordTimestamp || !evaluationAt) return false;
    const tRecord = new Date(recordTimestamp).getTime();
    const tEval = new Date(evaluationAt).getTime();
    return tRecord > tEval;
  }

  public static filterHistoricalRecords<T extends { created_at?: string; timestamp?: string }>(
    records: T[],
    evaluationAt: string
  ): T[] {
    if (!records || !Array.isArray(records)) return [];
    return records.filter(r => {
      const ts = r.timestamp || r.created_at;
      if (!ts) return true;
      return !this.isRecordFuture(ts, evaluationAt);
    });
  }
}
