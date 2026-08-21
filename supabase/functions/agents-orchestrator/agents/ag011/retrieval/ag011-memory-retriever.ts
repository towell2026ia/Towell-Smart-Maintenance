// supabase/functions/agents-orchestrator/agents/ag011/retrieval/ag011-memory-retriever.ts
// Deterministic Top-5 Memory Retriever for AG-011 (v1.0)
// Frozen under Token: AG011-RETRIEVAL-ENGINE-001
// Invariant: Zero Embeddings, Temporal Filter by evaluation_at & Top-5 Limit (§115-133 PRD-AG-011.2)

import { AG011MemoryRanker } from './ag011-memory-ranker.ts';
import { AG011MemoryDedupe } from './ag011-memory-dedupe.ts';
import { AG011MemoryVersionEngine } from '../versioning/ag011-memory-version-engine.ts';
import { AG011CircularDependencyGuard } from '../guards/ag011-circular-dependency-guard.ts';
import { AG011ApplicabilityResolver } from '../scope/ag011-applicability-resolver.ts';
import { AG011MemoryConfigRegistry } from '../config/ag011-memory-config-registry.ts';
import type { AG011MemoryQuery, AG011MemoryRetrievalOutput, AG011TechnicalMemoryItem } from '../types/ag011.types.ts';

export class AG011MemoryRetriever {
  public static retrieve(
    query: AG011MemoryQuery,
    memoryStore: AG011TechnicalMemoryItem[],
    currentCaseId?: string | null
  ): AG011MemoryRetrievalOutput {
    const topNLimit = query.top_n_limit || 5;
    const queryTimestamp = query.evaluation_at || new Date().toISOString();

    // 1. Anti-Loop: Exclude memories originating from current case
    let candidates = AG011CircularDependencyGuard.filterOutOriginCases(memoryStore, currentCaseId);

    // 2. Filter by Productive Status: APPROVED only by default
    candidates = candidates.filter(m => m.status === 'APPROVED');

    // 3. Temporal Cutoff Filter: Must be effective at evaluation_at
    candidates = candidates.filter(m => AG011MemoryVersionEngine.isEffectiveAt(m, queryTimestamp));

    // 4. Scope & Applicability Filter
    candidates = candidates.filter(m => {
      const match = AG011ApplicabilityResolver.evaluateScopeMatch(m.scope, {
        asset_id: query.asset_id,
        component_id: query.problem_context.component || undefined
      });
      return match.matches;
    });

    // 5. Deduplicate
    candidates = AG011MemoryDedupe.deduplicateMemories(candidates);

    // 6. Deterministic Ranking
    const rankedResults = AG011MemoryRanker.rankMemories({
      memories: candidates,
      asset_id: query.asset_id,
      component_id: query.problem_context.component,
      problem_text: query.problem_context.statement
    });

    // 7. Apply Top-N Limit
    const topResults = rankedResults.slice(0, topNLimit);

    const modelEvidence = AG011MemoryConfigRegistry.getCompositeMemoryModelEvidence();

    let dataQuality: 'SUFFICIENT' | 'PARTIAL' | 'EMPTY' = 'SUFFICIENT';
    if (topResults.length === 0) {
      dataQuality = 'EMPTY';
    } else if (topResults.length < 2) {
      dataQuality = 'PARTIAL';
    }

    return {
      query_id: query.query_id || `QRY-${Date.now()}`,
      asset_id: query.asset_id,
      evaluation_at: queryTimestamp,
      consumer: query.consumer,
      top_n_limit: topNLimit,
      retrieved_count: topResults.length,
      memories: topResults,
      retrieval_model_sha256: modelEvidence.ag011_memory_model_sha256,
      data_quality: dataQuality
    };
  }
}
