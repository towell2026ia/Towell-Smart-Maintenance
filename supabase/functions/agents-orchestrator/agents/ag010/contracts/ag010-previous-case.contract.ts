// supabase/functions/agents-orchestrator/agents/ag010/contracts/ag010-previous-case.contract.ts
// Previous Case Retrieval & Ranking Rules Contract for AG-010 (v1.0)
// Frozen under Tokens: AG010-PREVIOUS-CASE-RETRIEVAL-001, AG010-CASE-SIMILARITY-RULES-001
// Invariant: SIMILAR PREVIOUS CASE != SAME ROOT CAUSE; Deterministic structured ranking (§46-64 PRD-AG-010.1)

import type { PreviousCase, PreviousCaseMatch } from '../types/ag010.types.ts';

export const MAX_PREVIOUS_CASES_RETURNED = 5;

export function rankPreviousCases(
  targetAssetId: string,
  targetProblemKeywords: string[],
  availableCases: PreviousCase[],
  evaluationAt: string
): PreviousCaseMatch[] {
  const evalDate = new Date(evaluationAt).getTime();

  // Filter out any cases occurring after evaluationAt (zero future data leakage)
  const validHistoricalCases = availableCases.filter(c => {
    const caseDate = new Date(c.occurred_at).getTime();
    return caseDate <= evalDate;
  });

  const matches: PreviousCaseMatch[] = [];

  for (const prevCase of validHistoricalCases) {
    let score = 0;
    const matchReasons: string[] = [];
    const isSameAsset = prevCase.asset_id === targetAssetId;

    if (isSameAsset) {
      score += 40;
      matchReasons.push('SAME_ASSET_HISTORY');
    }

    // Keyword / failure title overlap
    let keywordOverlap = 0;
    const titleLower = prevCase.failure_title.toLowerCase();
    for (const kw of targetProblemKeywords) {
      if (kw.length > 2 && titleLower.includes(kw.toLowerCase())) {
        keywordOverlap++;
      }
    }

    if (keywordOverlap > 0) {
      const kwScore = Math.min(keywordOverlap * 15, 30);
      score += kwScore;
      matchReasons.push(`KEYWORD_MATCH (${keywordOverlap} terms)`);
    }

    // Resolved case bonus
    if (prevCase.outcome === 'RESOLVED') {
      score += 15;
      matchReasons.push('RESOLVED_OUTCOME_RECORDED');
    }

    // Recent case bonus (within last 365 days)
    const daysDiff = (evalDate - new Date(prevCase.occurred_at).getTime()) / (1000 * 3600 * 24);
    if (daysDiff <= 365) {
      score += 15;
      matchReasons.push('RECENCY_WITHIN_1_YEAR');
    }

    matches.push({
      previous_case: prevCase,
      similarity_score: Math.min(score, 100),
      match_reasons: matchReasons,
      is_same_asset: isSameAsset,
      is_same_failure_type: keywordOverlap > 0
    });
  }

  // Sort descending by similarity_score, then recency
  matches.sort((a, b) => {
    if (b.similarity_score !== a.similarity_score) {
      return b.similarity_score - a.similarity_score;
    }
    return new Date(b.previous_case.occurred_at).getTime() - new Date(a.previous_case.occurred_at).getTime();
  });

  return matches.slice(0, MAX_PREVIOUS_CASES_RETURNED);
}
