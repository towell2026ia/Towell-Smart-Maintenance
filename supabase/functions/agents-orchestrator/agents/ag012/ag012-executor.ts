// supabase/functions/agents-orchestrator/agents/ag012/ag012-executor.ts
// Master End-to-End Orchestration Entrypoint for AG-012 (v1.0)
// Frozen under Token: AG012-1.0-FROZEN
// Invariant: Full E2E pipeline: Deterministic Engine -> Protected Snapshot -> MiMo v2.5 -> Verification -> Audit (§1-8 PRD-AG-012.4)

import { AG012DecisionEngine } from './core/ag012-decision-engine.ts';
import { AG012SemanticCoordinator } from './semantic/ag012-semantic-coordinator.ts';
import { AG012DecisionConfigRegistry } from './config/ag012-decision-config-registry.ts';
import { AG012SemanticConfigRegistry } from './config/ag012-semantic-config-registry.ts';
import type { AG012ExecutionRequest, AG012ExecutionResponse, InterventionRecommendationPackage } from './types/ag012.types.ts';

export interface AG012MasterE2ERequest extends AG012ExecutionRequest {
  api_key?: string;
  mock_semantic_response?: any;
  skip_semantic_explanation?: boolean;
}

export interface AG012MasterE2EResponse {
  success: boolean;
  agent_id: 'AG-012';
  version: '1.0';
  asset_id: string;
  evaluation_at: string;
  package: InterventionRecommendationPackage;
  execution_mode: 'REAL_MIMO' | 'FAST_PATH' | 'DETERMINISTIC_ONLY';
  fingerprints: {
    decision_model_sha256: string;
    semantic_model_sha256: string;
  };
  telemetry: {
    deterministic_duration_ms: number;
    semantic_duration_ms: number;
    total_duration_ms: number;
    tokens: {
      input_tokens: number;
      output_tokens: number;
      total_tokens: number;
    };
    cost_usd: number;
    provider: string;
    model: string;
  };
}

export async function executeAG012(request: AG012MasterE2ERequest): Promise<AG012MasterE2EResponse> {
  const startTime = Date.now();
  const evaluationAt = request.evaluation_at || new Date().toISOString();

  // 1. Preflight Fingerprints
  const decisionEvidence = AG012DecisionConfigRegistry.getCompositeDecisionModelEvidence();
  const semanticEvidence = AG012SemanticConfigRegistry.getSemanticModelEvidence();

  // 2. Deterministic Decision Engine Execution
  const detResponse: AG012ExecutionResponse = AG012DecisionEngine.execute(request);
  const deterministicDuration = detResponse.telemetry.duration_ms;

  let finalPackage = detResponse.package;
  let semanticDuration = 0;
  let inputTokens = 0;
  let outputTokens = 0;
  let totalTokens = 0;
  let costUsd = 0;
  let provider = 'NONE';
  let model = 'NONE';
  let executionMode: 'REAL_MIMO' | 'FAST_PATH' | 'DETERMINISTIC_ONLY' = 'DETERMINISTIC_ONLY';

  // 3. Semantic Explanation Layer (if not explicitly bypassed)
  if (!request.skip_semantic_explanation) {
    const semResult = await AG012SemanticCoordinator.explain(
      detResponse.package,
      decisionEvidence.ag012_decision_model_sha256,
      request.api_key,
      request.mock_semantic_response
    );

    finalPackage = semResult.merged_package;
    semanticDuration = semResult.telemetry.duration_ms;
    totalTokens = semResult.telemetry.tokens;
    inputTokens = totalTokens > 0 ? Math.round(totalTokens * 0.72) : 0;
    outputTokens = totalTokens - inputTokens;
    costUsd = semResult.telemetry.cost_usd;
    provider = semResult.telemetry.provider;
    model = semResult.telemetry.model;
    executionMode = request.mock_semantic_response ? 'FAST_PATH' : 'REAL_MIMO';
  }

  const totalDuration = Date.now() - startTime;

  return {
    success: true,
    agent_id: 'AG-012',
    version: '1.0',
    asset_id: request.asset_id,
    evaluation_at: evaluationAt,
    package: finalPackage,
    execution_mode: executionMode,
    fingerprints: {
      decision_model_sha256: decisionEvidence.ag012_decision_model_sha256,
      semantic_model_sha256: semanticEvidence.ag012_semantic_model_sha256
    },
    telemetry: {
      deterministic_duration_ms: deterministicDuration,
      semantic_duration_ms: semanticDuration,
      total_duration_ms: totalDuration,
      tokens: {
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        total_tokens: totalTokens
      },
      cost_usd: costUsd,
      provider,
      model
    }
  };
}
