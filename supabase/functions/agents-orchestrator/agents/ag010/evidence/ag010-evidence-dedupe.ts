// supabase/functions/agents-orchestrator/agents/ag010/evidence/ag010-evidence-dedupe.ts
// Deterministic Evidence Deduplication Module for AG-010 (v1.0)
// Frozen under Token: AG010-EVIDENCE-DEDUPE-RULES-001
// Invariant: Non-destructive deduplication without loss of lineage (§50-52 PRD-AG-010.2)

import type { AG010EvidenceItem } from '../types/ag010.types.ts';

export class AG010EvidenceDedupe {
  public static deduplicate(items: AG010EvidenceItem[]): AG010EvidenceItem[] {
    const seenIds = new Set<string>();
    const result: AG010EvidenceItem[] = [];

    for (const item of items) {
      if (!seenIds.has(item.evidence_id)) {
        seenIds.add(item.evidence_id);
        result.push(item);
      }
    }

    return result;
  }
}
