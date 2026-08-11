// supabase/functions/agents-orchestrator/providers/openai-adapter.ts

export interface AIResponse {
  text: string;
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens: number;
  reasoningTokens: number;
}

/**
 * Adaptador de OpenAI para Edge Functions (Deno).
 * Se comunica de forma directa con la API oficial de OpenAI usando fetch.
 */
export async function callOpenAI(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  jsonSchema: Record<string, any> | null = null
): Promise<AIResponse> {
  const url = 'https://api.openai.com/v1/chat/completions';
  
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

  // Habilitar salida estructurada si se provee JSON Schema
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

  const response = await fetch(url, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`[OpenAI API Error] Status ${response.status}: ${errorText}`);
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
}
