// supabase/functions/agents-orchestrator/agents/ag010/adapters/mimo-provider.adapter.ts
// Xiaomi MiMo v2.5 Provider Adapter for AG-010 (v1.0)
// Frozen under Token: AG010-MIMO-POLICY-001
// Invariant: Thin Domain Wrapper delegating to Central MiMo Adapter (§3-17 PRD-AG-010.3-R1)

import { callMiMo } from '../../../providers/mimo-adapter.ts';
import { AG010FiveWhysPrompt } from '../prompts/ag010-five-whys.prompt.ts';
import { AG010_SEMANTIC_JSON_SCHEMA, type AG010SemanticOutput } from '../contracts/ag010-semantic-output.contract.ts';
import type { AG010SemanticInputPayload } from '../contracts/ag010-semantic-input.contract.ts';

export interface MiMoExecutionResult {
  output: AG010SemanticOutput;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  cost_usd: number;
  latency_ms: number;
  provider: 'Xiaomi MiMo';
  model: 'mimo-v2.5';
}

export class AG010MiMoProviderAdapter {
  public static readonly MODEL = 'mimo-v2.5';
  public static readonly PRICE_INPUT_PER_1M = 0.14;  // $0.14 USD per 1M input tokens
  public static readonly PRICE_OUTPUT_PER_1M = 0.28; // $0.28 USD per 1M output tokens

  public static async execute(
    inputPayload: AG010SemanticInputPayload,
    apiKey?: string,
    mockResponse?: AG010SemanticOutput
  ): Promise<MiMoExecutionResult> {
    const startTime = Date.now();

    // 1. Mock Response Mode (for local regression and mock suites)
    if (mockResponse) {
      const simulatedInputTokens = 850;
      const simulatedOutputTokens = 320;
      const totalTokens = simulatedInputTokens + simulatedOutputTokens;
      const costUsd = (simulatedInputTokens * this.PRICE_INPUT_PER_1M / 1_000_000) +
                      (simulatedOutputTokens * this.PRICE_OUTPUT_PER_1M / 1_000_000);

      return {
        output: mockResponse,
        input_tokens: simulatedInputTokens,
        output_tokens: simulatedOutputTokens,
        total_tokens: totalTokens,
        cost_usd: Number(costUsd.toFixed(8)),
        latency_ms: Date.now() - startTime,
        provider: 'Xiaomi MiMo',
        model: this.MODEL
      };
    }

    // 2. Resolve Key (Server-Side)
    const key = apiKey ||
      (typeof Deno !== 'undefined' ? Deno.env?.get('MIMO_API_KEY') : undefined) ||
      (typeof process !== 'undefined' ? process.env?.MIMO_API_KEY : undefined) ||
      '';

    if (!key) {
      throw new Error('[AG010MiMoProviderAdapter] MIMO_API_KEY is missing.');
    }

    // 3. Domain Prompt Building
    const systemPrompt = AG010FiveWhysPrompt.buildSystemPrompt();
    const userPrompt = AG010FiveWhysPrompt.buildUserPrompt(inputPayload);

    // 4. Delegate to Central Provider Adapter
    const centralResponse = await callMiMo(
      key,
      this.MODEL,
      systemPrompt,
      userPrompt,
      AG010_SEMANTIC_JSON_SCHEMA,
      3
    );

    const latencyMs = Date.now() - startTime;
    const inputTokens = centralResponse.inputTokens || 0;
    const outputTokens = centralResponse.outputTokens || 0;
    const totalTokens = inputTokens + outputTokens;

    const costUsd = (inputTokens * this.PRICE_INPUT_PER_1M / 1_000_000) +
                    (outputTokens * this.PRICE_OUTPUT_PER_1M / 1_000_000);

    let parsedOutput: AG010SemanticOutput;
    try {
      parsedOutput = JSON.parse(centralResponse.text);
    } catch (e: any) {
      throw new Error(`[AG010MiMoProviderAdapter] Failed to parse MiMo response as JSON: ${e.message}`);
    }

    return {
      output: parsedOutput,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      total_tokens: totalTokens,
      cost_usd: Number(costUsd.toFixed(8)),
      latency_ms: latencyMs,
      provider: 'Xiaomi MiMo',
      model: this.MODEL
    };
  }
}
