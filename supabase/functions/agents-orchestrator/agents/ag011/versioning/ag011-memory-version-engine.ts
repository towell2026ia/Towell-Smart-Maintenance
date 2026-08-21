// supabase/functions/agents-orchestrator/agents/ag011/versioning/ag011-memory-version-engine.ts
// Versioning & Supersession Engine for AG-011 (v1.0)
// Frozen under Token: AG011-VERSIONING-ENGINE-001
// Invariant: Immutable Versions, effective_from/to & Supersession Links (§96-108 PRD-AG-011.2)

import type { AG011TechnicalMemoryItem } from '../types/ag011.types.ts';

export class AG011MemoryVersionEngine {
  public static incrementVersion(currentVersion: string, isMajor: boolean = false): string {
    const [majorStr, minorStr] = (currentVersion || '1.0').split('.');
    const major = parseInt(majorStr, 10) || 1;
    const minor = parseInt(minorStr, 10) || 0;

    if (isMajor) {
      return `${major + 1}.0`;
    }
    return `${major}.${minor + 1}`;
  }

  public static isEffectiveAt(memory: AG011TechnicalMemoryItem, queryTimestamp: string): boolean {
    const queryTime = new Date(queryTimestamp).getTime();
    const effectiveFrom = new Date(memory.effective_from).getTime();

    if (queryTime < effectiveFrom) {
      return false; // Future memory leakage prevention
    }

    if (memory.effective_to) {
      const effectiveTo = new Date(memory.effective_to).getTime();
      if (queryTime >= effectiveTo) {
        return false; // Superseded / expired at query time
      }
    }

    return true;
  }
}
