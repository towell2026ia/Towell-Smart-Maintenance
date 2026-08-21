// supabase/functions/agents-orchestrator/agents/ag011/guards/ag011-circular-dependency-guard.ts
// Anti-Loop & Circular Dependency Guard for AG-011 (v1.0)
// Frozen under Token: AG011-CIRCULARITY-GUARD-001
// Invariant: self_reinforcing_memory_loop = 0 (§71-78 PRD-AG-011.2)

import type { AG011TechnicalMemoryItem } from '../types/ag011.types.ts';

export class AG011CircularDependencyGuard {
  public static filterOutOriginCases(
    memories: AG011TechnicalMemoryItem[],
    currentCaseId?: string | null
  ): AG011TechnicalMemoryItem[] {
    if (!currentCaseId) return memories;

    return memories.filter(mem => {
      if (mem.origin_case_ids && mem.origin_case_ids.includes(currentCaseId)) {
        console.warn(`[AG011CircularDependencyGuard] Bloqueando memoria '${mem.memory_id}': coincide con el caso actual '${currentCaseId}'.`);
        return false;
      }
      return true;
    });
  }

  public static assertNoCircularSupport(memory: AG011TechnicalMemoryItem, targetCaseId: string): void {
    if (memory.origin_case_ids && memory.origin_case_ids.includes(targetCaseId)) {
      throw new Error(`[AG011_SELF_REINFORCING_LOOP] Memoria '${memory.memory_id}' no puede utilizarse como soporte independiente de su propio caso de origen '${targetCaseId}'.`);
    }
  }
}
