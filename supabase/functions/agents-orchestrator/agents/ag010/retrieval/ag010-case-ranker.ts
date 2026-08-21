// supabase/functions/agents-orchestrator/agents/ag010/retrieval/ag010-case-ranker.ts
// Deterministic Case Ranker & Tie-Breaker for AG-010 (v1.0)
// Frozen under Token: AG010-RANKING-ENGINE-001
// Invariant: SIMILARITY_SCORE != CAUSE_PROBABILITY; Deterministic Tie-Breaker (§71-82 PRD-AG-010.2)

import type { PreviousCase, PreviousCaseMatch } from '../types/ag010.types.ts';
import { rankPreviousCases, MAX_PREVIOUS_CASES_RETURNED } from '../contracts/ag010-previous-case.contract.ts';

export class AG010CaseRanker {
  public static extractKeywords(problemDescription: string): string[] {
    if (!problemDescription) return [];
    return problemDescription
      .toLowerCase()
      .replace(/[.,;:()'"?!]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3 && !['para', 'como', 'este', 'esta', 'sobre', 'falla', 'paro', 'equipo'].includes(w));
  }

  public static rankAndFilter(
    targetAssetId: string,
    problemDescription: string,
    candidates: PreviousCase[],
    evaluationAt: string
  ): PreviousCaseMatch[] {
    const keywords = this.extractKeywords(problemDescription);
    const ranked = rankPreviousCases(targetAssetId, keywords, candidates, evaluationAt);
    return ranked.slice(0, MAX_PREVIOUS_CASES_RETURNED);
  }
}
