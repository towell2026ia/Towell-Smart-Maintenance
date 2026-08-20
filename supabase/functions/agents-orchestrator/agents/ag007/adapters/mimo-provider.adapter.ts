// supabase/functions/agents-orchestrator/agents/ag007/adapters/mimo-provider.adapter.ts
// Xiaomi MiMo Provider Adapter for AG-007 (v1.0)
// Frozen under Token: AG007-SEMANTIC-LAYER-001
// Invariant: Server-side API key, token tracking, latency audit (§90-92, §112-117 PRD)

import type { SemanticInputPayload } from '../contracts/ag007-semantic-input.contract.ts';
import type { SemanticOutputPayload } from '../contracts/ag007-semantic-output.contract.ts';
import { SYSTEM_PROMPT_AG007_MIMO, buildUserPromptForCostContext } from '../prompts/ag007-semantic.prompt.ts';

export interface MiMoCallAudit {
  provider: 'Xiaomi MiMo';
  model: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  cost_status: 'KNOWN' | 'ESTIMATED' | 'UNKNOWN';
  total_cost_usd: number;
  latency_ms: number;
  success: boolean;
  error?: string;
}

export interface MiMoResponseResult {
  output: SemanticOutputPayload | null;
  rawText: string;
  audit: MiMoCallAudit;
}

export async function callMiMoSemanticLayer(
  input: SemanticInputPayload,
  config: {
    apiKey?: string;
    endpoint?: string;
    model?: string;
    timeoutMs?: number;
  } = {}
): Promise<MiMoResponseResult> {
  const apiKey = config.apiKey || (typeof Deno !== 'undefined' ? Deno.env.get('MIMO_API_KEY') : (typeof process !== 'undefined' ? process.env?.MIMO_API_KEY : undefined));
  const endpoint = config.endpoint || 'https://api.xiaomimimo.com/v1/chat/completions';
  const model = config.model || 'mimo-v2.5';
  const timeoutMs = config.timeoutMs || 25000;

  const startTime = Date.now();

  const audit: MiMoCallAudit = {
    provider: 'Xiaomi MiMo',
    model,
    input_tokens: 0,
    output_tokens: 0,
    total_tokens: 0,
    cost_status: 'KNOWN',
    total_cost_usd: 0.00,
    latency_ms: 0,
    success: false
  };

  if (!apiKey) {
    audit.error = 'MIMO_API_KEY_NOT_CONFIGURED';
    audit.latency_ms = Date.now() - startTime;
    return { output: null, rawText: '', audit };
  }

  const systemPrompt = SYSTEM_PROMPT_AG007_MIMO;
  const userPrompt = buildUserPromptForCostContext(input);

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' }
      }),
      signal: controller.signal
    });

    clearTimeout(timer);
    audit.latency_ms = Date.now() - startTime;

    if (!res.ok) {
      audit.error = `HTTP_${res.status}_${res.statusText}`;
      return { output: null, rawText: '', audit };
    }

    const data = await res.json();
    const rawContent = data.choices?.[0]?.message?.content || '';

    // Extract token metrics
    audit.input_tokens = data.usage?.prompt_tokens || 0;
    audit.output_tokens = data.usage?.completion_tokens || 0;
    audit.total_tokens = data.usage?.total_tokens || (audit.input_tokens + audit.output_tokens);

    // Pricing rate: $0.15 / 1M input tokens, $0.60 / 1M output tokens (Xiaomi MiMo standard)
    const costInput = (audit.input_tokens / 1_000_000) * 0.15;
    const costOutput = (audit.output_tokens / 1_000_000) * 0.60;
    audit.total_cost_usd = Math.round((costInput + costOutput) * 100000) / 100000;
    audit.cost_status = 'KNOWN';
    audit.success = true;

    let parsedJson: any = null;
    try {
      parsedJson = JSON.parse(rawContent);
    } catch {
      // JSON repair attempt: clean code fences
      const clean = rawContent.replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '').trim();
      parsedJson = JSON.parse(clean);
    }

    return {
      output: parsedJson as SemanticOutputPayload,
      rawText: rawContent,
      audit
    };
  } catch (err: any) {
    audit.latency_ms = Date.now() - startTime;
    audit.error = err.name === 'AbortError' ? 'PROVIDER_TIMEOUT' : (err.message || 'PROVIDER_NETWORK_ERROR');
    return { output: null, rawText: '', audit };
  }
}
