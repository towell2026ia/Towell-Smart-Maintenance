// supabase/functions/agents-orchestrator/agents/ag010/security/ag010-untrusted-content-guard.ts
// Untrusted Content & Prompt Injection Guard for AG-010 (v1.0)
// Frozen under Token: AG010-UNTRUSTED-CONTENT-GUARD-001
// Invariant: Raw text remains UNTRUSTED_SOURCE_TEXT and is never executed (§98-101 PRD-AG-010.2)

export class AG010UntrustedContentGuard {
  private static readonly INJECTION_PATTERNS = [
    /ignora\s+(las\s+)?instrucciones/i,
    /ignore\s+(previous\s+)?instructions/i,
    /marca\s+causa\s+confirmada/i,
    /crea\s+(una\s+)?ot/i,
    /drop\s+table/i,
    /delete\s+from/i,
    /system\s*:\s*/i
  ];

  public static sanitizeAndFlag(rawText: string): { sanitizedText: string; isInjectionAttempt: boolean } {
    if (!rawText) return { sanitizedText: '', isInjectionAttempt: false };

    let isInjectionAttempt = false;
    for (const pattern of this.INJECTION_PATTERNS) {
      if (pattern.test(rawText)) {
        isInjectionAttempt = true;
        break;
      }
    }

    // Always preserve as raw quoted untrusted string
    const sanitizedText = rawText.trim();
    return { sanitizedText, isInjectionAttempt };
  }
}
