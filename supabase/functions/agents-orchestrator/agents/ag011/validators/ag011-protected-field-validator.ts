// supabase/functions/agents-orchestrator/agents/ag011/validators/ag011-protected-field-validator.ts
// Protected Field Validator & Snapshot Engine for AG-011 (v1.0)
// Frozen under Token: AG011-SEMANTIC-RULES-001
// Invariant: protected_field_diff = 0 (§20-21, 87-88 PRD-AG-011.3)

import type { AG011MemoryRetrievalOutput } from '../types/ag011.types.ts';

export class AG011ProtectedFieldValidator {
  public static createSnapshot(retrievalOutput: AG011MemoryRetrievalOutput): string {
    const protectedData = {
      query_id: retrievalOutput.query_id,
      asset_id: retrievalOutput.asset_id,
      evaluation_at: retrievalOutput.evaluation_at,
      top_n_limit: retrievalOutput.top_n_limit,
      retrieved_count: retrievalOutput.retrieved_count,
      retrieval_model_sha256: retrievalOutput.retrieval_model_sha256,
      memories: retrievalOutput.memories.map(m => ({
        memory_id: m.memory.memory_id,
        version: m.memory.version,
        status: m.memory.status,
        quality: m.memory.quality,
        scope: m.memory.scope,
        relevance_score: m.relevance_score,
        rank: m.rank,
        effective_from: m.memory.effective_from,
        effective_to: m.memory.effective_to,
        origin_case_ids: m.memory.origin_case_ids
      }))
    };

    return JSON.stringify(protectedData);
  }

  public static assertProtectedFieldsUntouched(
    retrievalOutput: AG011MemoryRetrievalOutput,
    snapshotJson: string
  ): void {
    const currentSnapshot = this.createSnapshot(retrievalOutput);
    if (currentSnapshot !== snapshotJson) {
      throw new Error('[AG011_PROTECTED_FIELD_VIOLATION] Los campos protegidos determinísticos fueron alterados durante la síntesis semántica.');
    }
  }
}
