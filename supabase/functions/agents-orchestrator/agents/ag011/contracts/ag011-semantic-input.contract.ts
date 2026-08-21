// supabase/functions/agents-orchestrator/agents/ag011/contracts/ag011-semantic-input.contract.ts
// Semantic Input Contract for AG-011 GPT-4.1 Mini Layer (v1.0)
// Frozen under Token: AG011-SEMANTIC-INPUT-001
// Invariant: Structured Input Contract for Semantic Synthesis (§12-17 PRD-AG-011.3)

import type { AG011MemoryRetrievalOutput, AG011MemoryQueryResultItem } from '../types/ag011.types.ts';

export interface AG011SemanticInput {
  query_context: {
    query_id: string;
    asset_id: string;
    evaluation_at: string;
    consumer: string;
    problem_statement: string;
    component?: string | null;
  };
  retrieval_metadata: {
    top_n_limit: number;
    retrieved_count: number;
    retrieval_model_sha256: string;
    data_quality: string;
  };
  memories: {
    memory_id: string;
    version: string;
    title: string;
    memory_type: string;
    status: string;
    quality: string;
    scope: {
      scope_level: string;
      asset_id?: string | null;
      machine_model?: string | null;
      machine_family?: string | null;
      component_id?: string | null;
      department?: string | null;
    };
    technical_content: {
      condition_description: string;
      validated_observations: string[];
      confirmed_root_cause?: string | null;
      validated_procedure: string;
      expected_outcome: string;
      required_parts?: string[];
      required_tools?: string[];
      safety_warnings?: string[];
    };
    limitations: string[];
    relevance_score: number;
    relevance_factors: string[];
    rank: number;
    source_references: string[];
  }[];
}

export function buildSemanticInput(
  retrievalOutput: AG011MemoryRetrievalOutput,
  problemStatement: string,
  component?: string | null
): AG011SemanticInput {
  return {
    query_context: {
      query_id: retrievalOutput.query_id,
      asset_id: retrievalOutput.asset_id,
      evaluation_at: retrievalOutput.evaluation_at,
      consumer: retrievalOutput.consumer,
      problem_statement: problemStatement,
      component: component || null
    },
    retrieval_metadata: {
      top_n_limit: retrievalOutput.top_n_limit,
      retrieved_count: retrievalOutput.retrieved_count,
      retrieval_model_sha256: retrievalOutput.retrieval_model_sha256,
      data_quality: retrievalOutput.data_quality
    },
    memories: retrievalOutput.memories.map((item: AG011MemoryQueryResultItem) => ({
      memory_id: item.memory.memory_id,
      version: item.memory.version,
      title: item.memory.title,
      memory_type: item.memory.memory_type,
      status: item.memory.status,
      quality: item.memory.quality,
      scope: item.memory.scope,
      technical_content: item.memory.technical_content,
      limitations: item.memory.limitations,
      relevance_score: item.relevance_score,
      relevance_factors: item.relevance_factors,
      rank: item.rank,
      source_references: item.memory.evidence.map(e => `${e.source_type}:${e.source_id}`)
    }))
  };
}
