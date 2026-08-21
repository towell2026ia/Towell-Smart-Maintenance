// supabase/functions/agents-orchestrator/agents/ag010/cases/ag010-case-dedupe.ts
// Deterministic Case Deduplication for AG-010 (v1.0)
// Frozen under Token: AG010-CASE-DEDUPE-RULES-001
// Invariant: duplicate_previous_cases = 0 (§83-84 PRD-AG-010.2)

import type { PreviousCase } from '../types/ag010.types.ts';

export class AG010CaseDedupe {
  public static deduplicateCases(cases: PreviousCase[]): PreviousCase[] {
    const seenIds = new Set<string>();
    const result: PreviousCase[] = [];

    for (const c of cases) {
      if (!seenIds.has(c.previous_case_id)) {
        seenIds.add(c.previous_case_id);
        result.push(c);
      }
    }

    return result;
  }
}
