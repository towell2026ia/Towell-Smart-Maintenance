// supabase/functions/agents-orchestrator/agents/ag004/adapters/mimo-provider.adapter.ts
// Xiaomi MiMo Provider Adapter for AG-004.3

import { AutonomousSemanticInputPayload } from '../contracts/semantic-input.contract.ts';
import { AutonomousSemanticOutputPayload } from '../contracts/semantic-output.contract.ts';
import { buildAutonomousSystemPrompt, buildAutonomousUserPrompt } from '../prompts/autonomous-semantic.prompt.ts';
import { AutonomousBlock } from '../types/ag004.types.ts';

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
  interpretAutonomousContext(input: AutonomousSemanticInputPayload): Promise<MiMoResponse>;
}

export class MockMiMoProvider implements IMiMoProvider {
  public async interpretAutonomousContext(input: AutonomousSemanticInputPayload): Promise<MiMoResponse> {
    const start = Date.now();

    const m = input.machine;
    const h = input.historical_context;
    const s = input.schedule;
    const w = input.target_week;

    const patternCodes: string[] = [];
    const focus: AutonomousBlock[] = [];
    const attentionNotes: string[] = [];
    const warnings: string[] = [];
    const techCtx: string[] = [];

    if (h.data_quality_status === 'NO_HISTORY') {
      patternCodes.push('NO_AUTONOMOUS_HISTORY');
      attentionNotes.push(`Activo ${m.machine_id} sin historial previo en el sistema. Ejecutar checklist estándar completo.`);
    } else {
      if (h.completed_autonomous_count > 0 && h.recent_findings.length === 0) {
        patternCodes.push('RECENT_AUTONOMOUS_COMPLETED');
        patternCodes.push('NO_SIGNIFICANT_AUTONOMOUS_PATTERN');
      }

      if (h.pending_autonomous_count > 0) {
        patternCodes.push('RECENT_AUTONOMOUS_PENDING');
        attentionNotes.push(`El activo cuenta con ${h.pending_autonomous_count} inspección(es) pendiente(s) o vencida(s) en semanas previas.`);
      }

      // Check findings by block
      const blocksWithFindings = new Set(h.recent_findings.map(f => f.block));
      for (const b of blocksWithFindings) {
        focus.push(b);
        if (b === 'Vibración') patternCodes.push('RECURRENT_VIBRATION_FINDING');
        if (b === 'Limpieza') patternCodes.push('RECURRENT_CLEANING_FINDING');
        if (b === 'Lubricación') patternCodes.push('RECURRENT_LUBRICATION_FINDING');
        if (b === 'Temperatura') patternCodes.push('RECURRENT_TEMPERATURE_FINDING');
        if (b === 'Cableado') patternCodes.push('RECURRENT_WIRING_FINDING');
      }

      if (blocksWithFindings.size > 1) {
        patternCodes.push('MULTI_BLOCK_FINDING_HISTORY');
      }

      if (h.recent_correctives.length > 0) {
        patternCodes.push('RECENT_CORRECTIVE_AFTER_AUTONOMOUS');
        techCtx.push(`Se registran ${h.recent_correctives.length} solicitud(es) correctiva(s) derivada(s) de inspecciones previas.`);
      }

      if (h.data_quality_status === 'PARTIAL') {
        patternCodes.push('PARTIAL_HISTORY');
        warnings.push('Información histórica incompleta; se recomienda verificación presencial exhaustiva.');
      }
    }

    if (focus.length === 0) {
      focus.push('Temperatura', 'Vibración'); // Default focus
    }

    const summary = `Contexto histórico para ${m.machine_id} (${m.department}) programado para ${s.scheduled_date} (${w.week_key}). Registra ${h.completed_autonomous_count} inspecciones completadas y ${h.recent_findings.length} hallazgos previos.`;
    const histSummary = `Estatus de datos: ${h.data_quality_status}. Último mantenimiento autónomo: ${h.last_autonomous_date || 'N/A'}. Hallazgos recientes en bloques: ${Array.from(new Set(h.recent_findings.map(f => f.block))).join(', ') || 'Ninguno'}.`;

    const payload: AutonomousSemanticOutputPayload = {
      machine_id: m.machine_id,
      executive_summary: summary,
      historical_context_summary: histSummary,
      pattern_codes: patternCodes.length > 0 ? patternCodes : ['NO_SIGNIFICANT_AUTONOMOUS_PATTERN'],
      inspection_focus: focus,
      attention_notes: attentionNotes,
      data_quality_warnings: warnings,
      technical_context: techCtx,
      source_references: input.source_references,
      requires_human_review: warnings.length > 0 || h.recent_findings.length > 0
    };

    return {
      success: true,
      rawJson: payload,
      input_tokens: 380,
      output_tokens: 320,
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

  public async interpretAutonomousContext(input: AutonomousSemanticInputPayload): Promise<MiMoResponse> {
    const start = Date.now();
    const systemPrompt = buildAutonomousSystemPrompt();
    const userPrompt = buildAutonomousUserPrompt(input);

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
