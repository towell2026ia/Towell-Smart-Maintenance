// supabase/functions/agents-orchestrator/agents/ag013/ag013-executor.ts
// Master End-to-End Orchestration Entrypoint for AG-013 (v1.0)
// Frozen under Token: AG013-1.0-FROZEN
// Invariant: Full E2E pipeline: Deterministic Engine -> Protected Snapshot -> MiMo v2.5 -> Verification -> Audit (§1-8 PRD-AG-013.4)

import { AG013BadActorEngine } from './core/ag013-bad-actor-engine.ts';
import { AG013SemanticCoordinator } from './semantic/ag013-semantic-coordinator.ts';
import { AG013BadActorConfigRegistry } from './config/ag013-bad-actor-config-registry.ts';
import { AG013SemanticConfigRegistry } from './config/ag013-semantic-config-registry.ts';
import { AG013SemanticAudit } from './audit/ag013-semantic-audit.ts';
import type { AG013ExecutionRequest, AG013ExecutionResponse, BadActorAnalysisPackage } from './types/ag013.types.ts';

export interface AG013MasterE2ERequest extends AG013ExecutionRequest {
  api_key?: string;
  mock_semantic_response?: any;
  skip_semantic_explanation?: boolean;
}

export interface AG013MasterE2EResponse {
  success: boolean;
  agent_id: 'AG-013';
  version: '1.0';
  request_id: string;
  evaluation_at: string;
  package: BadActorAnalysisPackage;
  execution_mode: 'REAL_MIMO' | 'FAST_PATH' | 'DETERMINISTIC_ONLY';
  fingerprints: {
    bad_actor_model_sha256: string;
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

export async function executeAG013(request: AG013MasterE2ERequest): Promise<AG013MasterE2EResponse> {
  const startTime = Date.now();
  const evaluationAt = request.evaluation_at || new Date().toISOString();

  // 1. Preflight Fingerprints
  const deterministicEvidence = AG013BadActorConfigRegistry.getCompositeDecisionModelEvidence();
  const semanticEvidence = AG013SemanticConfigRegistry.getSemanticModelEvidence();

  // 2. Deterministic Bad Actor Engine Execution
  const detResponse: AG013ExecutionResponse = AG013BadActorEngine.execute(request);
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
    const semResult = await AG013SemanticCoordinator.explain(
      detResponse.package,
      deterministicEvidence.ag013_bad_actor_model_sha256,
      request.api_key,
      request.mock_semantic_response
    );

    finalPackage = semResult.merged_package;
    semanticDuration = semResult.telemetry.duration_ms;
    totalTokens = semResult.telemetry.tokens;
    inputTokens = semResult.telemetry.input_tokens;
    outputTokens = semResult.telemetry.output_tokens;
    costUsd = semResult.telemetry.cost_usd;
    provider = semResult.telemetry.provider;
    model = semResult.telemetry.model;
    executionMode = request.mock_semantic_response ? 'FAST_PATH' : 'REAL_MIMO';

    // 4. Audit logging
    AG013SemanticAudit.createSemanticAuditRecord(
      finalPackage,
      semResult.telemetry,
      semanticEvidence.ag013_semantic_model_sha256
    );
  }

  const totalDuration = Date.now() - startTime;

  return {
    success: true,
    agent_id: 'AG-013',
    version: '1.0',
    request_id: request.request_id,
    evaluation_at: evaluationAt,
    package: finalPackage,
    execution_mode: executionMode,
    fingerprints: {
      bad_actor_model_sha256: deterministicEvidence.ag013_bad_actor_model_sha256,
      semantic_model_sha256: semanticEvidence.ag013_semantic_model_sha256
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
      provider: provider,
      model: model
    }
  };
}
