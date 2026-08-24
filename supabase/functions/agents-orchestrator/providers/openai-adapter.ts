// supabase/functions/agents-orchestrator/providers/openai-adapter.ts
// OpenAI Adapter for AG-001 Capataz Orquestador v1.0
// Supports GPT-4.1 Nano (primary) and GPT-4.1 Mini (fallback) with structured output and technical retry.

export interface AIResponse {
  text: string;
  parsedOutput: any | null;
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens: number;
  reasoningTokens: number;
  modelUsed: string;
  durationMs: number;
  responseId?: string;
  httpStatus?: number;
}

export const CAPATAZ_NANO_SYSTEM_PROMPT = `
Eres AG-001 Capataz Orquestador de Towell Smart Maintenance AI (TSM-AI).
Tu ÚNICA responsabilidad es clasificar solicitudes ambiguas y determinar el agente destino adecuado del catálogo cerrado.
NO realices análisis de mantenimiento, NO inventes agentes y NO autorices acciones sensibles.

CATÁLOGO CERRADO DE NAVEGACIÓN (20 ENTIDADES AUTORIZADAS):
- Planeación: AG-002 (Preventivo Anual), AG-003 (Predictivo Mensual), AG-004 (Autónomo Semanal)
- Datos: AG-005 (Auditor de Bases), AG-006 (Constructor de Formularios)
- Vigilancia: AG-007 (Presupuestos y Costos), AG-008 (Fallas, Tendencias y Reincidencias)
- Integración: AG-009 (Gestor), AG-009.1 (Conector Preventivo), AG-009.2 (Conector Autónomo), AG-009.3 (Conector Correctivo)
- Confiabilidad: AG-010 (5 Porqués), AG-011 (Memoria Técnica), AG-012 (Reparar/Renovar/Reemplazar), AG-013 (Malos Actores)
- Módulos Determinísticos: M-010 (Expediente Activo), M-011 (Índice Salud/Riesgo), M-012 (Preparación OT), M-013 (Control Seguridad)

REGLAS DE CLASIFICACIÓN:
1. Si se menciona falla en una máquina/activo sin historial de recurrencia -> FALLA_REPORTADA -> AG-009.3
2. Si el texto indica que "volvió a fallar", "otra vez falló", "reincidencia" o "recurrente" -> FALLA_REINCIDENTE -> AG-008
3. Si el texto reporta desvío o gasto excesivo -> DESVIACION_PRESUPUESTO -> AG-007
4. Si la máquina NO es identificable en el texto -> include "maquina_id" in missing_fields -> reason_code = INSUFFICIENT_INFORMATION
5. Salida obligatoria: Responde EXCLUSIVAMENTE el objeto JSON estructurado siguiendo el esquema.
`.trim();

export const CAPATAZ_NANO_JSON_SCHEMA = {
  type: 'object',
  properties: {
    event_code: { type: 'string', description: 'Código de evento identificado del catálogo' },
    target_agent: { type: 'string', description: 'Identificador del agente o módulo del catálogo cerrado de 20 entidades' },
    confidence: { type: 'number', description: 'Nivel de confianza entre 0.00 y 1.00' },
    missing_fields: { type: 'array', items: { type: 'string' }, description: 'Campos obligatorios no provistos' },
    risk_flags: { type: 'array', items: { type: 'string' }, description: 'Banderas de riesgo detectadas' },
    model_recommends_approval: { type: 'boolean', description: 'Si el modelo sugiere aprobación humana' },
    reason_code: { type: 'string', description: 'Código estructurado de razón (ej. CORRECTIVE_FAILURE_REPORT, RECURRENT_FAILURE, INSUFFICIENT_INFORMATION)' }
  },
  required: ['event_code', 'target_agent', 'confidence', 'missing_fields', 'risk_flags', 'model_recommends_approval', 'reason_code'],
  additionalProperties: false
};

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

/**
 * Call OpenAI API with technical retries for transient failures (429, 5xx, timeout).
 * Technical retries DO NOT invoke Mini fallback (Adjustment 6).
 */
export async function callOpenAIWithRetry(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  jsonSchema: Record<string, any> | null = null,
  maxRetries: number = 2
): Promise<AIResponse> {
  const resolvedKey = apiKey || (typeof Deno !== 'undefined' ? Deno.env.get('OPENAI_API_KEY') : (typeof process !== 'undefined' ? process.env?.OPENAI_API_KEY : '')) || '';
  const url = 'https://api.openai.com/v1/chat/completions';
  const startTime = Date.now();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${resolvedKey}`
  };

  const body: Record<string, any> = {
    model: model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.1
  };

  if (jsonSchema) {
    body.response_format = {
      type: 'json_schema',
      json_schema: {
        name: 'capataz_classification',
        strict: true,
        schema: jsonSchema
      }
    };
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body)
      });

      // If HTTP 429 or 5xx, execute technical retry with exponential backoff & jitter
      if (response.status === 429 || response.status >= 500) {
        const errorText = await response.text();
        lastError = new Error(`[OpenAI Technical Error] Status ${response.status}: ${errorText}`);
        if (attempt < maxRetries) {
          const backoff = Math.pow(2, attempt) * 500 + Math.floor(Math.random() * 200);
          console.warn(`[OpenAI Adapter] Retryable technical error (${response.status}). Retrying in ${backoff}ms...`);
          await sleep(backoff);
          continue;
        }
        throw lastError;
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`[OpenAI Non-Retryable Error] Status ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      const choice = data.choices?.[0];
      const usage = data.usage || {};
      const durationMs = Date.now() - startTime;
      const rawText = choice?.message?.content || '';

      let parsed: any = null;
      try {
        parsed = JSON.parse(rawText);
      } catch (e) {
        console.warn('[OpenAI Adapter] Could not parse JSON response:', rawText);
      }

      return {
        text: rawText,
        parsedOutput: parsed,
        inputTokens: usage.prompt_tokens || 0,
        outputTokens: usage.completion_tokens || 0,
        cachedInputTokens: usage.prompt_tokens_details?.cached_tokens || 0,
        reasoningTokens: usage.completion_tokens_details?.reasoning_tokens || 0,
        modelUsed: model,
        durationMs,
        responseId: data.id || `chatcmpl-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        httpStatus: response.status
      };
    } catch (err: any) {
      lastError = err;
      if (attempt < maxRetries && (err.message.includes('429') || err.message.includes('500') || err.message.includes('fetch'))) {
        const backoff = Math.pow(2, attempt) * 500 + Math.floor(Math.random() * 200);
        await sleep(backoff);
        continue;
      }
      throw err;
    }
  }

  throw lastError || new Error('OpenAI call failed after retries.');
}
