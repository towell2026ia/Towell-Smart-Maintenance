// supabase/functions/agents-orchestrator/agents/ag003/adapters/mimo-provider.adapter.ts
// Xiaomi MiMo Provider Adapter for AG-003.3 (§86-90, §144-149 PRD)

import { SemanticInputPayload } from '../contracts/semantic-input.contract.ts';
import { SemanticOutputPayload } from '../contracts/semantic-output.contract.ts';
import { SYSTEM_PROMPT_AG003_MIMO, buildUserPromptForPredictiveMachine } from '../prompts/predictive-semantic.prompt.ts';

export interface MiMoResponse {
  success: boolean;
  rawJson?: any;
  input_tokens: number;
  output_tokens: number;
  latency_ms: number;
  error_code?: string;
  error_message?: string;
}

export interface IMiMoProvider {
  interpretPredictiveCandidate(input: SemanticInputPayload): Promise<MiMoResponse>;
}

export class MockMiMoProvider implements IMiMoProvider {
  public async interpretPredictiveCandidate(input: SemanticInputPayload): Promise<MiMoResponse> {
    const start = Date.now();

    const m = input.machine;
    const q = input.analysis_window;
    const b = input.baseline;
    const d = input.deviation;
    const p = input.priority;

    const patternCodes = [...input.precalculated_patterns];
    const sourceRefs: string[] = input.untrusted_historical_content.map(c => `ref:${c.reference_id}`);

    const summary = `El telar ${m.machine_id} de Producción (PF) fue seleccionado en el ranking mensual con Score ${p.priority_score} pts (Top-${p.rank_position}). Registra ${q.total_segundas} segundas detectadas en los últimos 30 días (${q.segundas_per_roll} seg/rollo).`;
    const explanation = `La prioridad predictiva (${p.priority_score} pts) se justifica por una desviación de calidad de +${(d.relative_deviation * 100).toFixed(1)}% respecto a su baseline histórico (${b.baseline_value} seg/rollo), acompañado de ${input.historical_context.deduplicated_failures_30d} eventos de paro/falla.`;

    const focus: ('Electrónico' | 'Mecánico' | 'Limpieza' | 'Lubricación')[] = ['Mecánico', 'Electrónico'];
    if (d.relative_deviation >= 0.50) focus.push('Lubricación');
    if (q.total_segundas > 50) focus.push('Limpieza');

    const historicalObs = input.untrusted_historical_content.map(c => ({
      observation: `Evento registrado el ${c.date} (${c.source}): ${c.description}`,
      source_references: [`ref:${c.reference_id}`]
    }));

    const warnings: string[] = [];
    if (!input.data_quality.is_sufficient) {
      warnings.push(`Muestra estadística parcial (${q.valid_rolls} rollos válidos). Se recomienda verificar en piso.`);
    }
    if (!b.is_available) {
      warnings.push('Baseline propio no disponible; se utilizó estimación por grupo de referencia.');
    }

    const payload: SemanticOutputPayload = {
      machine_id: m.machine_id,
      executive_summary: summary,
      selection_explanation: explanation,
      pattern_codes: patternCodes,
      quality_interpretation: `Tasa actual de ${q.segundas_per_roll} seg/rollo supera el baseline de ${b.baseline_value} seg/rollo (${d.trend}).`,
      historical_context_summary: `Se registran ${input.historical_context.deduplicated_failures_30d} paros y ${input.historical_context.downtime_hours_30d} hrs de inactividad reciente.`,
      inspection_focus: focus,
      data_quality_warnings: warnings,
      technical_observations: historicalObs,
      recommendation: `Ejecutar levantamiento predictivo en la fecha programada ${p.scheduled_date} enfocando la revisión en los bloques seleccionados.`,
      source_references: sourceRefs,
      requires_human_review: warnings.length > 0
    };

    return {
      success: true,
      rawJson: payload,
      input_tokens: 420,
      output_tokens: 360,
      latency_ms: Date.now() - start
    };
  }
}

export class RealMiMoProvider implements IMiMoProvider {
  private apiKey: string;
  private endpoint: string;
  private model: string;

  constructor(apiKey: string, model: string = 'mimo-v2.5', endpoint: string = 'https://api.xiaomimimo.com/v1/chat/completions') {
    this.apiKey = apiKey;
    this.model = model;
    this.endpoint = endpoint;
  }

  public async interpretPredictiveCandidate(input: SemanticInputPayload): Promise<MiMoResponse> {
    const start = Date.now();
    const systemPrompt = SYSTEM_PROMPT_AG003_MIMO;
    const userPrompt = buildUserPromptForPredictiveMachine(input);

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.1,
          max_tokens: 1500
        })
      });

      const latency = Date.now() - start;

      if (response.status === 401 || response.status === 403) {
        return {
          success: false,
          input_tokens: 0,
          output_tokens: 0,
          latency_ms: latency,
          error_code: 'PROVIDER_AUTHENTICATION_ERROR',
          error_message: 'API Key de MiMo inválida o no autorizada.'
        };
      }

      if (response.status === 429) {
        return {
          success: false,
          input_tokens: 0,
          output_tokens: 0,
          latency_ms: latency,
          error_code: 'PROVIDER_RATE_LIMIT',
          error_message: 'Límite de tasa de MiMo alcanzado.'
        };
      }

      if (!response.ok) {
        return {
          success: false,
          input_tokens: 0,
          output_tokens: 0,
          latency_ms: latency,
          error_code: 'PROVIDER_SERVER_ERROR',
          error_message: `Error del servidor MiMo HTTP ${response.status}.`
        };
      }

      const resData = await response.json();
      const content = resData.choices?.[0]?.message?.content;
      const parsedJson = typeof content === 'string' ? JSON.parse(content) : content;

      return {
        success: true,
        rawJson: parsedJson,
        input_tokens: resData.usage?.prompt_tokens || 0,
        output_tokens: resData.usage?.completion_tokens || 0,
        latency_ms: latency
      };
    } catch (err: any) {
      return {
        success: false,
        input_tokens: 0,
        output_tokens: 0,
        latency_ms: Date.now() - start,
        error_code: 'PROVIDER_INVALID_RESPONSE',
        error_message: err?.message || 'Fallo de conexión con MiMo.'
      };
    }
  }
}
