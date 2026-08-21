// supabase/functions/agents-orchestrator/agents/ag010/ag010-executor.ts
// Master End-to-End Orchestration Entrypoint for AG-010 (v1.0)
// Frozen under Token: AG010-1.0-FROZEN
// Invariant: Full E2E pipeline: Retrieval -> Semantic Layer -> Validation -> Audit (§1-8 PRD-AG-010.4)

import { AG010RetrievalEngine, type AG010RetrievalRequest } from './core/ag010-retrieval-engine.ts';
import { AG010SemanticLayer, type AG010SemanticLayerResponse } from './core/ag010-semantic-layer.ts';
import { AG010RetrievalConfigRegistry } from './config/ag010-retrieval-config-registry.ts';
import { AG010SemanticConfigRegistry } from './config/ag010-semantic-config-registry.ts';
import type { AG010Output } from './types/ag010.types.ts';

export interface AG010ExecutionRequest {
  request_id?: string;
  event_id?: string | null;
  correlation_id?: string | null;
  asset_id: string;
  problem_statement: string;
  evaluation_at?: string;
  m010_context: any;
  ag008_context?: any;
  m011_context?: any;
  api_key?: string;
  mock_response?: any;
}

export interface AG010ExecutionResponse {
  success: boolean;
  agent_id: 'AG-010';
  version: '1.0';
  case_id: string;
  asset_id: string;
  evaluation_at: string;
  output: AG010Output;
  execution_mode: 'MIMO_V2_5' | 'FAST_PATH';
  fingerprints: {
    retrieval_model_sha256: string;
    semantic_model_sha256: string;
  };
  telemetry: {
    retrieval_duration_ms: number;
    semantic_duration_ms: number;
    total_duration_ms: number;
    tokens: {
      input_tokens: number;
      output_tokens: number;
      total_tokens: number;
    };
    cost_usd: number;
  };
}

export async function executeAG010(request: AG010ExecutionRequest): Promise<AG010ExecutionResponse> {
  const startTime = Date.now();

  // 1. Preflight Retrieval & Semantic Fingerprints
  const retrievalComposite = AG010RetrievalConfigRegistry.getCompositeModelEvidence();
  const semanticComposite = AG010SemanticConfigRegistry.getCompositeSemanticModelEvidence();

  // 2. Step 1: Deterministic Evidence & Previous Case Retrieval (AG-010.2)
  const retrievalResult = await AG010RetrievalEngine.execute({
    request_id: request.request_id,
    event_id: request.event_id,
    correlation_id: request.correlation_id,
    asset_id: request.asset_id,
    problem_statement: request.problem_statement,
    evaluation_at: request.evaluation_at,
    m010_context: request.m010_context,
    ag008_context: request.ag008_context,
    m011_context: request.m011_context
  });

  const retrievalDurationMs = retrievalResult.duration_ms;

  // 3. Step 2: Semantic Interpretation, Five Whys & RCA Hypotheses (AG-010.3)
  const semanticResult: AG010SemanticLayerResponse = await AG010SemanticLayer.interpretEvidence({
    request_id: request.request_id,
    event_id: request.event_id,
    correlation_id: request.correlation_id,
    evidence_package: retrievalResult.evidence_package,
    retrieval_model_sha256: retrievalResult.ag010_retrieval_model_sha256,
    api_key: request.api_key,
    mock_response: request.mock_response
  });

  const totalDurationMs = Date.now() - startTime;

  return {
    success: true,
    agent_id: 'AG-010',
    version: '1.0',
    case_id: retrievalResult.case_id,
    asset_id: retrievalResult.asset_id,
    evaluation_at: retrievalResult.evaluation_at,
    output: semanticResult.output,
    execution_mode: semanticResult.execution_mode,
    fingerprints: {
      retrieval_model_sha256: retrievalComposite.ag010_retrieval_model_sha256,
      semantic_model_sha256: semanticComposite.ag010_semantic_model_sha256
    },
    telemetry: {
      retrieval_duration_ms: retrievalDurationMs,
      semantic_duration_ms: semanticResult.latency_ms,
      total_duration_ms: totalDurationMs,
      tokens: semanticResult.tokens,
      cost_usd: semanticResult.cost_usd
    }
  };
}
