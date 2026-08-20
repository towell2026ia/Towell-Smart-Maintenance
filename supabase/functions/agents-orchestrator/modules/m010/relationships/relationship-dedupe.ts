// supabase/functions/agents-orchestrator/modules/m010/relationships/relationship-dedupe.ts
// Relationship Deduplicator for Multi-Path Joins (v1.0)
// Frozen under Token: M010-RELATIONSHIP-RULES-001
// Invariant: Prevents same source item appearing twice from multiple join paths without mutating sources (§95-100 PRD-M-010.2-R1)

export function dedupeItemsBySourceId<T extends { source_reference?: { source_id: string } }>(items: T[]): T[] {
  const seenIds = new Set<string>();
  const deduped: T[] = [];

  for (const item of items) {
    const id = item.source_reference?.source_id;
    if (id) {
      if (!seenIds.has(id)) {
        seenIds.add(id);
        deduped.push(item);
      }
    } else {
      deduped.push(item);
    }
  }

  return deduped;
}
