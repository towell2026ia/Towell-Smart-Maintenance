// supabase/functions/agents-orchestrator/agents/ag011/core/ag011-semantic-layer.ts
// Master Semantic Layer Coordinator for AG-011 (v1.0)
// Frozen under Token: AG011-SEMANTIC-LAYER-001
// Invariant: Structured Synthesis with Strict Invariant Verification (§8, 104 PRD-AG-011.3)

import type { AG011MemoryRetrievalOutput } from '../types/ag011.types.ts';
import { buildSemanticInput } from '../contracts/ag011-semantic-input.contract.ts';
import { AG011SemanticDecisionEngine } from '../decision/should-use-memory-semantic-layer.ts';
import { AG011OpenAIAdapter, type AG011OpenAIExecutionResult } from '../adapters/ag011-openai-adapter.ts';
import { AG011SemanticOutputValidator } from '../validators/ag011-semantic-output-validator.ts';
import { AG011ProtectedFieldValidator } from '../validators/ag011-protected-field-validator.ts';
import { AG011SemanticMergeEngine, type AG011FinalSemanticOutput } from './ag011-semantic-merge.ts';
import { AG011SemanticAuditor } from '../audit/ag011-semantic-audit.ts';
import { AG011TechnicalMemoryPrompt } from '../prompts/ag011-technical-memory.prompt.ts';
import { AG011SemanticConfigRegistry } from '../config/ag011-semantic-config-registry.ts';

export const EXPECTED_MEMORY_MODEL_SHA256 = 'ce6ab889c09a2a721d3aedeaeb8c27b7d9881c66c212d0f62f7a9e0bf25096f7';

export interface AG011SemanticLayerRequest {
  request_id?: string;
  event_id?: string | null;
  correlation_id?: string | null;
  retrieval_output: AG011MemoryRetrievalOutput;
  problem_statement: string;
  component?: string | null;
  memory_model_sha256: string;
  api_key?: string;
  mock_response?: any;
}

export interface AG011SemanticLayerResponse {
  success: boolean;
  agent_id: 'AG-011';
  output: AG011FinalSemanticOutput;
  execution_mode: 'OPENAI_GPT41_MINI' | 'FAST_PATH';
  tokens: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
  };
  cost_usd: number;
  latency_ms: number;
  network_provider_latency_ms?: number;
  provider_response_id?: string;
  http_status?: number;
  cache_hit?: boolean;
  semantic_model_sha256: string;
}

export class AG011SemanticLayer {
  public static async synthesize(
    request: AG011SemanticLayerRequest
  ): Promise<AG011SemanticLayerResponse> {
    const startTime = Date.now();
    const requestId = request.request_id || `REQ-SEM-${Date.now()}`;
    const retrievalOutput = request.retrieval_output;

    // 1. Verify Upstream Deterministic Memory Model Fingerprint
    if (request.memory_model_sha256 !== EXPECTED_MEMORY_MODEL_SHA256) {
      throw new Error(
        `[AG011_MEMORY_MODEL_MISMATCH] Se esperaba '${EXPECTED_MEMORY_MODEL_SHA256}', se recibió '${request.memory_model_sha256}'.`
      );
    }

    const semanticModelEvidence = AG011SemanticConfigRegistry.getCompositeSemanticModelEvidence();

    // 2. Create Protected Field Snapshot
    const protectedSnapshot = AG011ProtectedFieldValidator.createSnapshot(retrievalOutput);

    // 3. Build Semantic Input
    const semanticInput = buildSemanticInput(
      retrievalOutput,
      request.problem_statement,
      request.component
    );

    // 4. Evaluate Fast Path
    const decision = AG011SemanticDecisionEngine.evaluate(retrievalOutput);

    let semanticOutput: any;
    let inputTokens = 0;
    let outputTokens = 0;
    let totalTokens = 0;
    let costUsd = 0;
    let networkProviderLatencyMs = 0;
    let providerResponseId = 'NONE';
    let httpStatus = 200;
    let cacheHit = false;
    let executionMode: 'OPENAI_GPT41_MINI' | 'FAST_PATH' = 'OPENAI_GPT41_MINI';
    let providerName: 'OpenAI' | 'FAST_PATH' = 'OpenAI';
    let modelName: 'gpt-4o-mini' | 'NONE' = 'gpt-4o-mini';

    if (!decision.shouldCallProvider && decision.fastPathOutput) {
      executionMode = 'FAST_PATH';
      providerName = 'FAST_PATH';
      modelName = 'NONE';
      semanticOutput = decision.fastPathOutput;
    } else {
      // 5. Call OpenAI Adapter
      const openaiResult: AG011OpenAIExecutionResult = await AG011OpenAIAdapter.execute(
        semanticInput,
        request.api_key,
        request.mock_response
      );

      semanticOutput = openaiResult.output;
      inputTokens = openaiResult.input_tokens;
      outputTokens = openaiResult.output_tokens;
      totalTokens = openaiResult.total_tokens;
      costUsd = openaiResult.cost_usd;
      networkProviderLatencyMs = openaiResult.network_provider_latency_ms;
      providerResponseId = openaiResult.provider_response_id;
      httpStatus = openaiResult.http_status;
      cacheHit = openaiResult.cache_hit;
    }

    // 6. Execute Semantic Output Validation Pipeline
    AG011SemanticOutputValidator.validate(semanticOutput, semanticInput);

    // 7. Assert Zero Protected Field Diff
    AG011ProtectedFieldValidator.assertProtectedFieldsUntouched(retrievalOutput, protectedSnapshot);

    // 8. Merge Deterministic Retrieval Package with Validated Semantic Synthesis
    const finalMergedOutput = AG011SemanticMergeEngine.merge(retrievalOutput, semanticOutput);

    const latencyMs = Date.now() - startTime;

    // 9. Record Audit
    AG011SemanticAuditor.recordAudit({
      request_id: requestId,
      event_id: request.event_id || null,
      correlation_id: request.correlation_id || null,
      agent_id: 'AG-011',
      operation: 'SEMANTIC_SYNTHESIS',
      asset_id: retrievalOutput.asset_id,
      evaluation_at: retrievalOutput.evaluation_at,
      memory_count: retrievalOutput.memories.length,
      retrieval_model_sha256: request.memory_model_sha256,
      semantic_model_sha256: semanticModelEvidence.ag011_semantic_model_sha256,
      provider: providerName,
      model: modelName,
      prompt_version: AG011TechnicalMemoryPrompt.PROMPT_VERSION,
      semantic_rules_version: 'AG011-SEMANTIC-RULES-001',
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      total_tokens: totalTokens,
      cost_usd: costUsd,
      latency_ms: latencyMs,
      protected_field_diff: 0,
      requires_human_review: semanticOutput.requires_human_review,
      status: executionMode === 'FAST_PATH' ? 'FAST_PATH' : 'SUCCESS',
      created_at: new Date().toISOString()
    });

    return {
      success: true,
      agent_id: 'AG-011',
      output: finalMergedOutput,
      execution_mode: executionMode,
      tokens: {
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        total_tokens: totalTokens
      },
      cost_usd: costUsd,
      latency_ms: latencyMs,
      network_provider_latency_ms: networkProviderLatencyMs,
      provider_response_id: providerResponseId,
      http_status: httpStatus,
      cache_hit: cacheHit,
      semantic_model_sha256: semanticModelEvidence.ag011_semantic_model_sha256
    };
  }
}
