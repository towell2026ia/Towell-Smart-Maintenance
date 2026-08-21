// supabase/functions/agents-orchestrator/agents/ag010/core/ag010-semantic-layer.ts
// Master Semantic Layer Coordinator for AG-010 (v1.0)
// Frozen under Token: AG010-SEMANTIC-LAYER-001
// Invariant: AI interprets evidence without altering deterministic foundation (§1-8, 149-157 PRD-AG-010.3)

import type { AG010EvidencePackage, AG010Output } from '../types/ag010.types.ts';
import { buildSemanticInput } from '../contracts/ag010-semantic-input.contract.ts';
import { AG010SemanticDecisionEngine } from '../decision/should-use-semantic-layer.ts';
import { AG010MiMoProviderAdapter, type MiMoExecutionResult } from '../adapters/mimo-provider.adapter.ts';
import { AG010SemanticOutputValidator } from '../validators/ag010-semantic-output-validator.ts';
import { AG010ProtectedFieldValidator } from '../validators/ag010-protected-field-validator.ts';
import { AG010FactHypothesisValidator } from '../validators/ag010-fact-hypothesis-validator.ts';
import { AG010RootCauseValidator } from '../validators/ag010-root-cause-validator.ts';
import { AG010SemanticMergeEngine } from './ag010-semantic-merge.ts';
import { AG010SemanticAuditor } from '../audit/ag010-semantic-audit.ts';
import { AG010FiveWhysPrompt } from '../prompts/ag010-five-whys.prompt.ts';

export const EXPECTED_RETRIEVAL_MODEL_SHA256 = 'cd98352d83be94a860bf6fe75a4cac1a2d700cb16d771e5c3890260b41fc43ee';

export interface AG010SemanticLayerRequest {
  request_id?: string;
  event_id?: string | null;
  correlation_id?: string | null;
  evidence_package: AG010EvidencePackage;
  retrieval_model_sha256: string;
  api_key?: string;
  mock_response?: any;
}

export interface AG010SemanticLayerResponse {
  success: boolean;
  agent_id: 'AG-010';
  output: AG010Output;
  execution_mode: 'MIMO_V2_5' | 'FAST_PATH';
  tokens: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
  };
  cost_usd: number;
  latency_ms: number;
}

export class AG010SemanticLayer {
  public static async interpretEvidence(
    request: AG010SemanticLayerRequest
  ): Promise<AG010SemanticLayerResponse> {
    const startTime = Date.now();
    const requestId = request.request_id || `REQ-SEM-${Date.now()}`;
    const evidencePackage = request.evidence_package;

    // 1. Verify Retrieval Model Fingerprint
    if (request.retrieval_model_sha256 !== EXPECTED_RETRIEVAL_MODEL_SHA256) {
      throw new Error(
        `[AG010_RETRIEVAL_MODEL_MISMATCH] Expected ${EXPECTED_RETRIEVAL_MODEL_SHA256}, got ${request.retrieval_model_sha256}`
      );
    }

    // 2. Build Semantic Input
    const semanticInput = buildSemanticInput(evidencePackage, request.retrieval_model_sha256);

    // 3. Fast Path Decision Engine
    const decision = AG010SemanticDecisionEngine.evaluate(evidencePackage);

    let semanticOutput: any;
    let inputTokens = 0;
    let outputTokens = 0;
    let totalTokens = 0;
    let costUsd = 0;
    let executionMode: 'MIMO_V2_5' | 'FAST_PATH' = 'MIMO_V2_5';
    let providerName: 'Xiaomi MiMo' | 'FAST_PATH' = 'Xiaomi MiMo';
    let modelName: 'mimo-v2.5' | 'NONE' = 'mimo-v2.5';

    if (!decision.shouldCallProvider && decision.fastPathOutput) {
      executionMode = 'FAST_PATH';
      providerName = 'FAST_PATH';
      modelName = 'NONE';
      semanticOutput = decision.fastPathOutput;
    } else {
      // 4. Call Xiaomi MiMo Provider Adapter (or mock in test mode)
      const mimoResult: MiMoExecutionResult = await AG010MiMoProviderAdapter.execute(
        semanticInput,
        request.api_key,
        request.mock_response
      );

      semanticOutput = mimoResult.output;
      inputTokens = mimoResult.input_tokens;
      outputTokens = mimoResult.output_tokens;
      totalTokens = mimoResult.total_tokens;
      costUsd = mimoResult.cost_usd;
    }

    // 5. Semantic Validation Pipeline
    AG010SemanticOutputValidator.validate(semanticOutput, evidencePackage);
    AG010FactHypothesisValidator.validateFiveWhysNodes(semanticOutput.five_whys || []);
    semanticOutput.root_cause_candidates = AG010RootCauseValidator.validateAndSanitizeCandidates(
      semanticOutput.root_cause_candidates || []
    );

    // 6. Merge Deterministic Foundation with Validated Semantic Output
    const finalOutput: AG010Output = AG010SemanticMergeEngine.merge(evidencePackage, semanticOutput);

    // 7. Assert Zero Protected Field Diff
    AG010ProtectedFieldValidator.assertProtectedFieldsUntouched(evidencePackage, finalOutput);

    const latencyMs = Date.now() - startTime;

    // 8. Record Execution Audit
    AG010SemanticAuditor.recordAudit({
      request_id: requestId,
      event_id: request.event_id || null,
      correlation_id: request.correlation_id || null,
      agent_id: 'AG-010',
      case_id: evidencePackage.case_id,
      asset_id: evidencePackage.asset_id,
      evaluation_at: evidencePackage.evaluation_at,
      retrieval_model_sha256: request.retrieval_model_sha256,
      provider: providerName,
      model: modelName,
      prompt_version: AG010FiveWhysPrompt.PROMPT_VERSION,
      semantic_contract_version: 'AG010-SEMANTIC-OUTPUT-001',
      input_evidence_count: evidencePackage.certified_facts.length,
      previous_case_count: evidencePackage.previous_cases.length,
      five_whys_depth: finalOutput.five_whys.length,
      root_cause_candidate_count: finalOutput.root_cause_candidates.length,
      requires_human_validation: finalOutput.requires_human_validation,
      protected_field_diff: 0,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      total_tokens: totalTokens,
      cost_usd: costUsd,
      latency_ms: latencyMs,
      status: executionMode === 'FAST_PATH' ? 'FAST_PATH' : 'SUCCESS',
      created_at: new Date().toISOString()
    });

    return {
      success: true,
      agent_id: 'AG-010',
      output: finalOutput,
      execution_mode: executionMode,
      tokens: {
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        total_tokens: totalTokens
      },
      cost_usd: costUsd,
      latency_ms: latencyMs
    };
  }
}
