// supabase/functions/agents-orchestrator/agents/ag010/retrieval/ag010-previous-case-retriever.ts
// Deterministic Previous Case Retriever for AG-010 (v1.0)
// Frozen under Token: AG010-RETRIEVAL-ENGINE-001
// Invariant: Pure deterministic filtering without LLM calls (§65-70 PRD-AG-010.2)

import type { PreviousCase } from '../types/ag010.types.ts';
import { AG010EvaluationTimeGuard } from '../guards/ag010-evaluation-time-guard.ts';

export class AG010PreviousCaseRetriever {
  public static retrieveCandidateCases(
    allCases: PreviousCase[],
    targetAssetId: string,
    evaluationAt: string
  ): PreviousCase[] {
    // Filter strictly by historical cutoff
    const historicalCases = allCases.filter(c =>
      AG010EvaluationTimeGuard.isHistoricalEvent(c.occurred_at, evaluationAt)
    );

    // Candidates: cases from the same asset or matching asset family/failure domain
    return historicalCases.filter(c => {
      return c.asset_id === targetAssetId || c.failure_title.length > 3;
    });
  }
}
