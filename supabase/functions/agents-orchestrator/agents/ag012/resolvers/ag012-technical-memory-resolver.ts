// supabase/functions/agents-orchestrator/agents/ag012/resolvers/ag012-technical-memory-resolver.ts
// Technical Memory Resolver consuming AG-011 approved knowledge (v1.0)
// Frozen under Token: AG012-TECHNICAL-MEMORY-RULES-001

export class AG012TechnicalMemoryResolver {
  public static resolve(ag011Context?: any): {
    has_approved_repair_procedure: boolean;
    known_limitations_count: number;
    approved_memories_count: number;
  } {
    if (!ag011Context) {
      return {
        has_approved_repair_procedure: false,
        known_limitations_count: 0,
        approved_memories_count: 0
      };
    }

    const memories = Array.isArray(ag011Context.memories) ? ag011Context.memories : [];
    const approvedMemories = memories.filter((m: any) => m.status === 'APPROVED' || m.is_approved === true);

    return {
      has_approved_repair_procedure: approvedMemories.length > 0,
      known_limitations_count: ag011Context.limitations ? ag011Context.limitations.length : 0,
      approved_memories_count: approvedMemories.length
    };
  }
}
