// supabase/functions/agents-orchestrator/agents/ag010/adapters/mimo-provider.adapter.ts
// Xiaomi MiMo v2.5 Provider Adapter for AG-010 (v1.0)
// Frozen under Token: AG010-MIMO-POLICY-001
// Invariant: Structured JSON Output with token, latency and cost accounting (§68-77, 141-144 PRD-AG-010.3)

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

function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export class AG010MiMoProviderAdapter {
  public static readonly MODEL = 'mimo-v2.5';
  public static readonly MIMO_URL = 'https://api.xiaomimimo.com/v1/chat/completions';
  public static readonly PRICE_INPUT_PER_1M = 0.14;  // $0.14 USD per 1M input tokens
  public static readonly PRICE_OUTPUT_PER_1M = 0.28; // $0.28 USD per 1M output tokens

  public static async execute(
    inputPayload: AG010SemanticInputPayload,
    apiKey?: string,
    mockResponse?: AG010SemanticOutput
  ): Promise<MiMoExecutionResult> {
    const startTime = Date.now();

    // If mock response provided (for unit testing or controlled simulation)
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

    const key = apiKey ||
      (typeof Deno !== 'undefined' ? Deno.env?.get('MIMO_API_KEY') : undefined) ||
      (typeof process !== 'undefined' ? process.env?.MIMO_API_KEY : undefined) ||
      '';

    if (!key) {
      throw new Error('[AG010MiMoProviderAdapter] MIMO_API_KEY is missing.');
    }

    const systemPrompt = AG010FiveWhysPrompt.buildSystemPrompt();
    const userPrompt = AG010FiveWhysPrompt.buildUserPrompt(inputPayload);

    let attempt = 0;
    const maxRetries = 3;
    const baseDelayMs = 1000;

    while (attempt < maxRetries) {
      attempt++;
      try {
        const body: Record<string, any> = {
          model: this.MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.1,
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: 'ag010_five_whys_response',
              strict: true,
              schema: AG010_SEMANTIC_JSON_SCHEMA
            }
          }
        };

        const response = await fetch(this.MIMO_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${key}`
          },
          body: JSON.stringify(body)
        });

        if (response.status === 429 || response.status >= 500) {
          if (attempt === maxRetries) {
            throw new Error(`[MiMo API Error] Status ${response.status} tras ${attempt} intentos.`);
          }
          const jitter = Math.random() * 500;
          const delay = baseDelayMs * Math.pow(2, attempt - 1) + jitter;
          console.warn(`[MiMo API] Status ${response.status}. Reintentando intento ${attempt + 1}/${maxRetries} en ${Math.round(delay)}ms...`);
          await wait(delay);
          continue;
        }

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`[MiMo API Error] Status ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        const choice = data.choices?.[0];
        const usage = data.usage || {};

        const rawText = choice?.message?.content || '{}';
        const parsedOutput: AG010SemanticOutput = JSON.parse(rawText);

        const inputTokens = usage.prompt_tokens || 0;
        const outputTokens = usage.completion_tokens || 0;
        const totalTokens = inputTokens + outputTokens;

        const costUsd = (inputTokens * this.PRICE_INPUT_PER_1M / 1_000_000) +
                        (outputTokens * this.PRICE_OUTPUT_PER_1M / 1_000_000);

        return {
          output: parsedOutput,
          input_tokens: inputTokens,
          output_tokens: outputTokens,
          total_tokens: totalTokens,
          cost_usd: Number(costUsd.toFixed(8)),
          latency_ms: Date.now() - startTime,
          provider: 'Xiaomi MiMo',
          model: this.MODEL
        };
      } catch (err: any) {
        if (attempt === maxRetries) {
          throw err;
        }
        const jitter = Math.random() * 500;
        const delay = baseDelayMs * Math.pow(2, attempt - 1) + jitter;
        console.warn(`[MiMo API] Error de red (${err.message}). Reintentando intento ${attempt + 1}/${maxRetries} en ${Math.round(delay)}ms...`);
        await wait(delay);
      }
    }

    throw new Error('[AG010MiMoProviderAdapter] Excedido el número máximo de reintentos.');
  }
}
