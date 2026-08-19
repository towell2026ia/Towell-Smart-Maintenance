// supabase/functions/agents-orchestrator/agents/ag004/core/semantic-layer.ts
// Semantic Layer Orchestrator for AG-004 — Autónomo Semanal (v1.0 Frozen)

import { AutonomousSemanticInputPayload } from '../contracts/semantic-input.contract.ts';
import { AutonomousSemanticOutputPayload } from '../contracts/semantic-output.contract.ts';
import { shouldUseAutonomousSemanticLayer } from '../decision/should-use-semantic-layer.ts';
import { IMiMoProvider, MockMiMoProvider } from '../adapters/mimo-provider.adapter.ts';
import { validateAutonomousSemanticOutput } from '../validators/semantic-validator.ts';
import { mergeAutonomousDeterministicAndSemantic, MergedAutonomousContext } from '../guards/semantic-merge-guard.ts';
import { PROMPT_VERSION } from '../prompts/autonomous-semantic.prompt.ts';
import { SEMANTIC_INPUT_VERSION } from '../contracts/semantic-input.contract.ts';
import { SEMANTIC_OUTPUT_VERSION } from '../contracts/semantic-output.contract.ts';
import { PATTERN_CATALOG_VERSION } from '../catalog/pattern-catalog.ts';
import { SEMANTIC_CALL_RULES_VERSION } from '../rules/semantic-call.rules.ts';

export interface SemanticLayerOptions {
  provider?: IMiMoProvider;
  isMimoEnabled?: boolean;
  correlationId: string;
  eventId?: string;
}

export interface SemanticExecutionResult {
  status: 'SUCCESS' | 'FAST_PATH_SKIPPED' | 'SEMANTIC_FAILED_FALLBACK_DETERMINISTIC';
  mergedContext: MergedAutonomousContext;
  rawSemanticOutput?: AutonomousSemanticOutputPayload;
  audit: {
    event_id: string;
    correlation_id: string;
    agent_id: 'AG-004';
    machine_id: string;
    provider: string;
    model: string;
    prompt_version: string;
    semantic_input_version: string;
    semantic_output_version: string;
    pattern_catalog_version: string;
    semantic_call_rules_version: string;
    provider_calls: number;
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
    cost_status: 'NOT_APPLICABLE' | 'LOGGED' | 'UNKNOWN';
    latency_ms: number;
    validator_status: 'PASS' | 'FAILED' | 'SKIPPED';
    merge_status: 'DETERMINISTIC_MERGED';
    error_code?: string;
  };
}

export class AutonomousSemanticLayer {
  public static async interpret(
    input: AutonomousSemanticInputPayload,
    options: SemanticLayerOptions
  ): Promise<SemanticExecutionResult> {
    const startTime = Date.now();
    const isEnabled = options.isMimoEnabled !== false;
    const provider = options.provider || new MockMiMoProvider();

    // 1. Fast Path Evaluation
    const decision = shouldUseAutonomousSemanticLayer(input, isEnabled);

    if (!decision.shouldCallMiMo) {
      // Fast path: Deterministic context without AI call
      const merged = mergeAutonomousDeterministicAndSemantic(input, null);
      return {
        status: 'FAST_PATH_SKIPPED',
        mergedContext: merged,
        audit: {
          event_id: options.eventId || `EVT-SEM-${Date.now()}`,
          correlation_id: options.correlationId,
          agent_id: 'AG-004',
          machine_id: input.machine.machine_id,
          provider: 'none',
          model: 'none',
          prompt_version: PROMPT_VERSION,
          semantic_input_version: SEMANTIC_INPUT_VERSION,
          semantic_output_version: SEMANTIC_OUTPUT_VERSION,
          pattern_catalog_version: PATTERN_CATALOG_VERSION,
          semantic_call_rules_version: SEMANTIC_CALL_RULES_VERSION,
          provider_calls: 0,
          input_tokens: 0,
          output_tokens: 0,
          total_tokens: 0,
          cost_status: 'NOT_APPLICABLE',
          latency_ms: Date.now() - startTime,
          validator_status: 'SKIPPED',
          merge_status: 'DETERMINISTIC_MERGED'
        }
      };
    }

    // 2. Provider Invocation
    const mimoRes = await provider.interpretAutonomousContext(input);

    if (!mimoRes.success || !mimoRes.rawJson) {
      // Fallback deterministic
      const merged = mergeAutonomousDeterministicAndSemantic(input, null);
      return {
        status: 'SEMANTIC_FAILED_FALLBACK_DETERMINISTIC',
        mergedContext: merged,
        audit: {
          event_id: options.eventId || `EVT-SEM-${Date.now()}`,
          correlation_id: options.correlationId,
          agent_id: 'AG-004',
          machine_id: input.machine.machine_id,
          provider: 'mimo',
          model: 'mimo-v2.5',
          prompt_version: PROMPT_VERSION,
          semantic_input_version: SEMANTIC_INPUT_VERSION,
          semantic_output_version: SEMANTIC_OUTPUT_VERSION,
          pattern_catalog_version: PATTERN_CATALOG_VERSION,
          semantic_call_rules_version: SEMANTIC_CALL_RULES_VERSION,
          provider_calls: 1,
          input_tokens: mimoRes.input_tokens,
          output_tokens: mimoRes.output_tokens,
          total_tokens: mimoRes.input_tokens + mimoRes.output_tokens,
          cost_status: mimoRes.input_tokens > 0 ? 'LOGGED' : 'UNKNOWN',
          latency_ms: mimoRes.latency_ms,
          validator_status: 'FAILED',
          merge_status: 'DETERMINISTIC_MERGED',
          error_code: mimoRes.error_code || 'PROVIDER_CALL_FAILED'
        }
      };
    }

    // 3. Output Validation
    const val = validateAutonomousSemanticOutput(mimoRes.rawJson, input.machine.machine_id);

    if (!val.isValid || !val.cleanedPayload) {
      const merged = mergeAutonomousDeterministicAndSemantic(input, null);
      return {
        status: 'SEMANTIC_FAILED_FALLBACK_DETERMINISTIC',
        mergedContext: merged,
        audit: {
          event_id: options.eventId || `EVT-SEM-${Date.now()}`,
          correlation_id: options.correlationId,
          agent_id: 'AG-004',
          machine_id: input.machine.machine_id,
          provider: 'mimo',
          model: 'mimo-v2.5',
          prompt_version: PROMPT_VERSION,
          semantic_input_version: SEMANTIC_INPUT_VERSION,
          semantic_output_version: SEMANTIC_OUTPUT_VERSION,
          pattern_catalog_version: PATTERN_CATALOG_VERSION,
          semantic_call_rules_version: SEMANTIC_CALL_RULES_VERSION,
          provider_calls: 1,
          input_tokens: mimoRes.input_tokens,
          output_tokens: mimoRes.output_tokens,
          total_tokens: mimoRes.input_tokens + mimoRes.output_tokens,
          cost_status: 'LOGGED',
          latency_ms: mimoRes.latency_ms,
          validator_status: 'FAILED',
          merge_status: 'DETERMINISTIC_MERGED',
          error_code: val.errorCode || 'SEMANTIC_VALIDATION_FAILED'
        }
      };
    }

    // 4. Merge Guard (Deterministic Values Win 100%)
    const merged = mergeAutonomousDeterministicAndSemantic(input, val.cleanedPayload);

    return {
      status: 'SUCCESS',
      mergedContext: merged,
      rawSemanticOutput: val.cleanedPayload,
      audit: {
        event_id: options.eventId || `EVT-SEM-${Date.now()}`,
        correlation_id: options.correlationId,
        agent_id: 'AG-004',
        machine_id: input.machine.machine_id,
        provider: 'mimo',
        model: 'mimo-v2.5',
        prompt_version: PROMPT_VERSION,
        semantic_input_version: SEMANTIC_INPUT_VERSION,
        semantic_output_version: SEMANTIC_OUTPUT_VERSION,
        pattern_catalog_version: PATTERN_CATALOG_VERSION,
        semantic_call_rules_version: SEMANTIC_CALL_RULES_VERSION,
        provider_calls: 1,
        input_tokens: mimoRes.input_tokens,
        output_tokens: mimoRes.output_tokens,
        total_tokens: mimoRes.input_tokens + mimoRes.output_tokens,
        cost_status: 'LOGGED',
        latency_ms: mimoRes.latency_ms,
        validator_status: 'PASS',
        merge_status: 'DETERMINISTIC_MERGED'
      }
    };
  }
}
