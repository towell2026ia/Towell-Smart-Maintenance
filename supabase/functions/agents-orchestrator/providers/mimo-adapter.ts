// supabase/functions/agents-orchestrator/providers/mimo-adapter.ts
// Central Xiaomi MiMo Provider Adapter (v1.0)
// Frozen under Token: CENTRAL-MIMO-ADAPTER-001
// Invariant: Authoritative for Authentication, Transport, Retry with Backoff & Usage Parsing

export interface MiMoAIResponse {
  text: string;
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens?: number;
  reasoningTokens?: number;
}

const MIMO_URL = 'https://api.xiaomimimo.com/v1/chat/completions';

function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Adaptador central del proveedor Xiaomi para mimo-v2.5
 * Soporta control técnico de límites de tasa 429 e implementa Backoff Exponencial con Jitter.
 */
export async function callMiMo(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  jsonSchema: Record<string, any> | null = null,
  maxRetries: number = 3
): Promise<MiMoAIResponse> {
  let attempt = 0;
  const baseDelayMs = 1000;

  while (attempt < maxRetries) {
    attempt++;
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      };

      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ];

      const body: Record<string, any> = {
        model: model,
        messages: messages,
        temperature: 0.1
      };

      if (jsonSchema) {
        body.response_format = {
          type: 'json_schema',
          json_schema: {
            name: 'agent_response',
            strict: true,
            schema: jsonSchema
          }
        };
      }

      const response = await fetch(MIMO_URL, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body)
      });

      if (response.status === 429 || response.status >= 500) {
        if (attempt === maxRetries) {
          throw new Error(`[MiMo API RateLimit/Server Error] Status ${response.status} tras ${attempt} intentos.`);
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

      return {
        text: choice?.message?.content || '',
        inputTokens: usage.prompt_tokens || 0,
        outputTokens: usage.completion_tokens || 0,
        cachedInputTokens: usage.prompt_tokens_details?.cached_tokens || 0,
        reasoningTokens: usage.completion_tokens_details?.reasoning_tokens || 0
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

  throw new Error('[MiMo API] Excedido el número máximo de reintentos.');
}
