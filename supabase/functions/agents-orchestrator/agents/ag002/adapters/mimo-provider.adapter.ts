// supabase/functions/agents-orchestrator/agents/ag002/adapters/mimo-provider.adapter.ts
// Xiaomi MiMo Provider Adapter for AG-002.3 (§52-61 PRD)

import { SemanticInputPayload, SemanticOutputPayload } from '../types/ag002-semantic.types.ts';
import { SYSTEM_PROMPT_AG002_MIMO, buildUserPromptForMachine } from '../prompts/ag002-semantic.prompt.ts';

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
  interpretMachine(input: SemanticInputPayload): Promise<MiMoResponse>;
}

export class MockMiMoProvider implements IMiMoProvider {
  public async interpretMachine(input: SemanticInputPayload): Promise<MiMoResponse> {
    const start = Date.now();

    // Deterministic mock generation based strictly on input facts
    const p = input.priority;
    const m = input.metrics;
    const s = input.service;

    const patternCodes = [...input.precalculated_patterns];
    const sourceRefs: string[] = input.untrusted_historical_content.map(c => `ref:${c.reference_id}`);

    const summary = `El equipo ${input.machine.machine_id} del departamento ${input.machine.department_code} fue priorizado con ${p.priority_score} puntos (${p.priority_band}). Registra ${m.failure_count_12m} fallas en los últimos 12 meses y ${m.downtime_hours_12m} horas de paro acumulado.`;
    const explanation = `La prioridad preventiva (${p.priority_score} pts) se deriva principalmente de criticidad (${p.components.criticality_score} pts), recurrencia de fallas (${p.components.recurrence_score} pts) y tiempo de paro acumulado (${p.components.downtime_score} pts).`;
    const focus = [
      `Inspección general de servicio ${s.service_code} (${s.service_name})`,
      ...(m.repeated_failure_count > 0 ? ['Revisión focalizada en componentes de falla repetitiva'] : []),
      ...(m.downtime_hours_12m >= 10 ? ['Verificación de alineación y puntos de fricción térmica'] : [])
    ];

    const historicalObs = input.untrusted_historical_content.map(c => ({
      observation: `Evento registrado el ${c.date}: ${c.description}`,
      source_references: [`ref:${c.reference_id}`]
    }));

    const partsObs = input.parts.parts_list.map(pt => 
      `Refacción ${pt.cve_refaccion} (${pt.nombre || 'estándar'}): Cantidad ${pt.cantidad}, Precio: ${pt.price_status}`
    );

    const warnings: string[] = [];
    if (input.parts.budget_status === 'PARTIAL') {
      warnings.push('Existen refacciones con costo unitario desconocido en el catálogo maestro.');
    }
    if (m.failure_count_12m === 0) {
      warnings.push('Activo con bajo o nulo registro histórico previo.');
    }

    const payload: SemanticOutputPayload = {
      machine_id: input.machine.machine_id,
      executive_summary: summary,
      pattern_codes: patternCodes,
      priority_explanation: explanation,
      preventive_focus: focus,
      historical_observations: historicalObs,
      parts_observations: partsObs,
      data_quality_warnings: warnings,
      recommendation: `Ejecutar servicio ${s.service_code} en la fecha programada ${input.schedule.scheduled_date} prestando especial atención a los puntos críticos identificados.`,
      source_references: sourceRefs,
      requires_human_review: warnings.length > 0
    };

    return {
      success: true,
      rawJson: payload,
      input_tokens: 450,
      output_tokens: 380,
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

  public async interpretMachine(input: SemanticInputPayload): Promise<MiMoResponse> {
    const start = Date.now();
    const systemPrompt = SYSTEM_PROMPT_AG002_MIMO;
    const userPrompt = buildUserPromptForMachine(input);

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
