// supabase/functions/agents-orchestrator/agents/ag011/ag011-executor.ts
// Master End-to-End Orchestration Entrypoint for AG-011 (v1.0)
// Frozen under Token: AG011-1.0-FROZEN
// Invariant: Full E2E pipeline: Deterministic Engine -> Persistence -> Retrieval -> Semantic Layer -> Validation -> Audit (§1-8 PRD-AG-011.4)

import { AG011MemoryEngine, type AG011EngineRequest, type AG011EngineResponse } from './core/ag011-memory-engine.ts';
import { AG011SemanticLayer, type AG011SemanticLayerResponse } from './core/ag011-semantic-layer.ts';
import { AG011MemoryConfigRegistry } from './config/ag011-memory-config-registry.ts';
import { AG011SemanticConfigRegistry } from './config/ag011-semantic-config-registry.ts';
import type { AG011TechnicalMemoryItem, AG011MemoryRetrievalOutput } from './types/ag011.types.ts';
import type { AG011FinalSemanticOutput } from './core/ag011-semantic-merge.ts';

export interface AG011ExecutionRequest {
  request_id?: string;
  event_id?: string | null;
  correlation_id?: string | null;
  operation: 'QUERY_MEMORIES' | 'RESOLVE_CANDIDATE' | 'REVIEW_APPROVAL' | 'CREATE_VERSION';
  asset_id?: string;
  problem_statement?: string;
  component?: string | null;
  machine_model?: string | null;
  machine_family?: string | null;
  department?: string | null;
  evaluation_at?: string;
  consumer?: string;
  top_n_limit?: number;
  memory_store?: AG011TechnicalMemoryItem[];
  candidate_payload?: any;
  approval_payload?: any;
  version_payload?: any;
  api_key?: string;
  mock_response?: any;
}

export interface AG011ExecutionResponse {
  success: boolean;
  agent_id: 'AG-011';
  version: '1.0';
  operation: string;
  asset_id?: string;
  evaluation_at: string;
  output: AG011FinalSemanticOutput | any;
  execution_mode: 'OPENAI_GPT41_MINI' | 'FAST_PATH' | 'DETERMINISTIC_ONLY';
  fingerprints: {
    memory_model_sha256: string;
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

export async function executeAG011(request: AG011ExecutionRequest): Promise<AG011ExecutionResponse> {
  const startTime = Date.now();
  const evaluationAt = request.evaluation_at || new Date().toISOString();

  // 1. Preflight Memory Model & Semantic Model Fingerprints
  const memoryEvidence = AG011MemoryConfigRegistry.getCompositeMemoryModelEvidence();
  const semanticEvidence = AG011SemanticConfigRegistry.getCompositeSemanticModelEvidence();

  // 2. Map Operation to Engine Operation
  let engineOp: any = 'RETRIEVE_MEMORIES';
  if (request.operation === 'RESOLVE_CANDIDATE') engineOp = 'BUILD_CANDIDATE';
  if (request.operation === 'REVIEW_APPROVAL') engineOp = 'PROCESS_REVIEW_DECISION';
  if (request.operation === 'CREATE_VERSION') engineOp = 'CREATE_NEW_VERSION';

  const engineResult: AG011EngineResponse = await AG011MemoryEngine.execute({
    request_id: request.request_id,
    event_id: request.event_id,
    correlation_id: request.correlation_id,
    operation: engineOp,
    query_params: request.operation === 'QUERY_MEMORIES' ? {
      query_id: request.request_id || `QRY-${Date.now()}`,
      asset_id: request.asset_id || 'UNKNOWN',
      machine_model: request.machine_model || null,
      machine_family: request.machine_family || null,
      department: request.department || null,
      evaluation_at: evaluationAt,
      problem_context: {
        statement: request.problem_statement || '',
        component: request.component || undefined
      },
      consumer: request.consumer || 'M-012',
      top_n_limit: request.top_n_limit || 5
    } : undefined,
    candidate_params: request.candidate_payload,
    approval_params: request.approval_payload,
    memory_params: request.version_payload,
    memory_store: request.memory_store
  });

  if (!engineResult.success) {
    throw new Error(`[AG011Executor] Error en motor determinístico: ${engineResult.error}`);
  }

  const retrievalDurationMs = Date.now() - startTime;

  // 3. If Operation is not QUERY_MEMORIES, return deterministic result directly
  if (request.operation !== 'QUERY_MEMORIES') {
    return {
      success: true,
      agent_id: 'AG-011',
      version: '1.0',
      operation: request.operation,
      asset_id: request.asset_id,
      evaluation_at: evaluationAt,
      output: engineResult.result,
      execution_mode: 'DETERMINISTIC_ONLY',
      fingerprints: {
        memory_model_sha256: memoryEvidence.ag011_memory_model_sha256,
        semantic_model_sha256: semanticEvidence.ag011_semantic_model_sha256
      },
      telemetry: {
        retrieval_duration_ms: retrievalDurationMs,
        semantic_duration_ms: 0,
        total_duration_ms: Date.now() - startTime,
        tokens: { input_tokens: 0, output_tokens: 0, total_tokens: 0 },
        cost_usd: 0
      }
    };
  }

  // 4. For QUERY_MEMORIES, pipe retrieval output into Semantic Synthesis Layer
  const retrievalOutput: AG011MemoryRetrievalOutput = engineResult.result;
  const semanticStart = Date.now();

  const semanticResult: AG011SemanticLayerResponse = await AG011SemanticLayer.synthesize({
    request_id: request.request_id,
    event_id: request.event_id,
    correlation_id: request.correlation_id,
    retrieval_output: retrievalOutput,
    problem_statement: request.problem_statement || '',
    component: request.component || null,
    memory_model_sha256: memoryEvidence.ag011_memory_model_sha256,
    api_key: request.api_key,
    mock_response: request.mock_response
  });

  const totalDurationMs = Date.now() - startTime;

  return {
    success: true,
    agent_id: 'AG-011',
    version: '1.0',
    operation: 'QUERY_MEMORIES',
    asset_id: request.asset_id,
    evaluation_at: evaluationAt,
    output: semanticResult.output,
    execution_mode: semanticResult.execution_mode,
    fingerprints: {
      memory_model_sha256: memoryEvidence.ag011_memory_model_sha256,
      semantic_model_sha256: semanticEvidence.ag011_semantic_model_sha256
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
