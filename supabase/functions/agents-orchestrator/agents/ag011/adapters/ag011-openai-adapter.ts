// supabase/functions/agents-orchestrator/agents/ag011/adapters/ag011-openai-adapter.ts
// OpenAI Domain Adapter for AG-011 Semantic Layer (v1.0)
// Frozen under Token: AG011-OPENAI-POLICY-001
// Invariant: Connects strictly via central callOpenAIWithRetry (§64-74 PRD-AG-011.3)

import { callOpenAIWithRetry, type AIResponse } from '../../../providers/openai-adapter.ts';
import { AG011TechnicalMemoryPrompt } from '../prompts/ag011-technical-memory.prompt.ts';
import { AG011_SEMANTIC_OUTPUT_JSON_SCHEMA, type AG011SemanticOutput } from '../contracts/ag011-semantic-output.contract.ts';
import type { AG011SemanticInput } from '../contracts/ag011-semantic-input.contract.ts';

export interface AG011OpenAIExecutionResult {
  output: AG011SemanticOutput;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  cost_usd: number;
  latency_ms: number;
  model: string;
}

export class AG011OpenAIAdapter {
  public static readonly MODEL = 'gpt-4o-mini';
  public static readonly INPUT_COST_PER_1K = 0.00015; // $0.15 / 1M
  public static readonly OUTPUT_COST_PER_1K = 0.00060; // $0.60 / 1M

  public static async execute(
    semanticInput: AG011SemanticInput,
    apiKey?: string,
    mockResponse?: AG011SemanticOutput
  ): Promise<AG011OpenAIExecutionResult> {
    const startTime = Date.now();

    // Support controlled mock in test environment
    if (mockResponse) {
      const inputStr = JSON.stringify(semanticInput);
      const outputStr = JSON.stringify(mockResponse);
      const estInputTokens = Math.max(100, Math.floor(inputStr.length / 4));
      const estOutputTokens = Math.max(100, Math.floor(outputStr.length / 4));
      const estCost = (estInputTokens / 1000) * this.INPUT_COST_PER_1K + (estOutputTokens / 1000) * this.OUTPUT_COST_PER_1K;

      return {
        output: mockResponse,
        input_tokens: estInputTokens,
        output_tokens: estOutputTokens,
        total_tokens: estInputTokens + estOutputTokens,
        cost_usd: estCost,
        latency_ms: Date.now() - startTime,
        model: this.MODEL
      };
    }

    const key = apiKey || (typeof Deno !== 'undefined' ? Deno.env.get('OPENAI_API_KEY') : process.env.OPENAI_API_KEY);
    if (!key) {
      throw new Error('[AG011_REAL_PROVIDER_VERIFICATION_BLOCKED] OPENAI_API_KEY no encontrada para ejecución real.');
    }

    const systemPrompt = AG011TechnicalMemoryPrompt.getSystemPrompt();
    const userPrompt = AG011TechnicalMemoryPrompt.getUserPrompt(JSON.stringify(semanticInput, null, 2));

    const response: AIResponse = await callOpenAIWithRetry(
      key,
      this.MODEL,
      systemPrompt,
      userPrompt,
      AG011_SEMANTIC_OUTPUT_JSON_SCHEMA,
      2
    );

    if (!response.parsedOutput) {
      throw new Error('[AG011OpenAIAdapter] Error al parsear JSON estructurado de OpenAI.');
    }

    const costUsd = (response.inputTokens / 1000) * this.INPUT_COST_PER_1K + (response.outputTokens / 1000) * this.OUTPUT_COST_PER_1K;

    return {
      output: response.parsedOutput as AG011SemanticOutput,
      input_tokens: response.inputTokens,
      output_tokens: response.outputTokens,
      total_tokens: response.inputTokens + response.outputTokens,
      cost_usd: costUsd,
      latency_ms: response.durationMs,
      model: response.modelUsed
    };
  }
}
