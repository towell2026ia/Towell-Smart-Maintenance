// supabase/functions/agents-orchestrator/agents/ag013/guards/ag013-temporal-guard.ts
// Temporal Integrity Guard for AG-013 (v1.0)
// Frozen under Token: AG013-BAD-ACTOR-ENGINE-001

export class AG013TemporalGuard {
  public static validate(evaluationAt: string, eventTimestamps: Array<{ id: string; timestamp: string }>): {
    valid: boolean;
    future_events: string[];
  } {
    const cutoffMs = new Date(evaluationAt).getTime();
    const future_events: string[] = [];

    for (const ev of eventTimestamps) {
      if (ev.timestamp) {
        const evMs = new Date(ev.timestamp).getTime();
        if (evMs > cutoffMs) {
          future_events.push(`${ev.id} (${ev.timestamp} > ${evaluationAt})`);
        }
      }
    }

    return {
      valid: future_events.length === 0,
      future_events
    };
  }
}
