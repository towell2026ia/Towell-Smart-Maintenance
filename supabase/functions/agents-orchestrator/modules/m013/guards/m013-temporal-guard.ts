// supabase/functions/agents-orchestrator/modules/m013/guards/m013-temporal-guard.ts
// Temporal Validation Guard enforcing zero future leakage & permit expiration check (v1.0)
// Frozen under Token: M013-TEMPORAL-RULES-001

export class M013TemporalGuard {
  public static isEvidenceFuture(evidenceCreatedAt: string, evaluationAt: string): boolean {
    const evTime = new Date(evidenceCreatedAt).getTime();
    const evalTime = new Date(evaluationAt).getTime();
    return evTime > evalTime;
  }

  public static isPermitExpired(validTo: string | undefined | null, evaluationAt: string): boolean {
    if (!validTo) return false;
    const toTime = new Date(validTo).getTime();
    const evalTime = new Date(evaluationAt).getTime();
    return evalTime > toTime;
  }
}
