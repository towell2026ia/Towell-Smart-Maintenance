// supabase/functions/agents-orchestrator/agents/ag011/retrieval/ag011-memory-dedupe.ts
// Deterministic Memory Deduplication for AG-011 (v1.0)
// Frozen under Token: AG011-RETRIEVAL-ENGINE-001
// Invariant: Non-Destructive Deduplication by ID & Exact Provenance (§134-136 PRD-AG-011.2)

import type { AG011TechnicalMemoryItem } from '../types/ag011.types.ts';

export class AG011MemoryDedupe {
  public static deduplicateMemories(memories: AG011TechnicalMemoryItem[]): AG011TechnicalMemoryItem[] {
    const seen = new Set<string>();
    const result: AG011TechnicalMemoryItem[] = [];

    for (const mem of memories) {
      if (!seen.has(mem.memory_id)) {
        seen.add(mem.memory_id);
        result.push(mem);
      }
    }

    return result;
  }
}
