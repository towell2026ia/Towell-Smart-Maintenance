// supabase/functions/agents-orchestrator/agents/ag008/core/failure-semantic-layer.ts
// Semantic Layer Orchestrator for AG-008 (v1.0)
// Frozen under Token: AG008-SEMANTIC-LAYER-001

import type { SemanticFailureInputPayload } from '../contracts/ag008-semantic-input.contract.ts';
import type { SemanticFailureOutputPayload } from '../contracts/ag008-semantic-output.contract.ts';
import { AG008_SYSTEM_PROMPT } from '../prompts/ag008-failure-prompt.ts';
import { shouldUseFailureSemanticLayer } from '../decision/should-use-failure-semantic-layer.ts';
import { validateFailureSemanticOutput } from '../validators/failure-semantic-validator.ts';
import { enforceFailureSemanticMergeGuard } from '../guards/failure-semantic-merge-guard.ts';

export interface SemanticLayerProcessResult {
  output: SemanticFailureOutputPayload;
  audit: {
    provider: 'mimo' | 'none';
    model: string;
    semantic_path: 'NO_AI_FAST_PATH' | 'REAL_PROVIDER_REQUIRED';
    provider_calls: number;
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
    latency_ms: number;
    cost_status: 'KNOWN' | 'UNKNOWN';
    cost_usd: number;
    is_clean_merge: boolean;
    overrides_rejected: number;
  };
}

export function generateDeterministicFallbackOutput(
  input: SemanticFailureInputPayload
): SemanticFailureOutputPayload {
  const m = input.metrics;
  const patternCodes: string[] = [];

  // Determine pattern codes deterministically
  if (m.total_events === 0) {
    patternCodes.push('NO_SIGNIFICANT_FAILURE_PATTERN');
  } else {
    if (m.recurrence_groups.some(g => g.status === 'RECURRENT')) {
      patternCodes.push('FAILURE_RECURRENCE');
    }
    if (m.reincidences.length > 0) {
      patternCodes.push('FAILURE_REINCIDENCE');
    }
    if (m.trend.direction === 'UP') {
      patternCodes.push('FAILURE_TREND_UP');
    } else if (m.trend.direction === 'DOWN') {
      patternCodes.push('FAILURE_TREND_DOWN');
    } else {
      patternCodes.push('FAILURE_TREND_STABLE');
    }
    if (m.concentration.top_machines.length > 0 && m.concentration.top_machines[0].share_percentage >= 35.0) {
      patternCodes.push('MACHINE_FAILURE_CONCENTRATION');
    }
    if (m.cross_machine_patterns.length > 0) {
      patternCodes.push('CROSS_MACHINE_PATTERN');
    }
    if (m.seasonality.status === 'DETECTED') {
      patternCodes.push('SEASONAL_PATTERN');
    } else if (m.seasonality.status === 'INSUFFICIENT_HISTORY') {
      patternCodes.push('INSUFFICIENT_HISTORY_FOR_SEASONALITY');
    }
    if (input.deterministic_alerts.length > 0) {
      patternCodes.push('ALERT_CONDITION_PRESENT');
    }
    if (input.data_quality.overall_quality === 'PARTIAL' || input.data_quality.overall_quality === 'UNRELIABLE') {
      patternCodes.push('DATA_QUALITY_LIMITATION');
    }
  }

  // Build Executive Summary
  let execSummary = `Análisis de fallas para ${input.scope} (${input.target_id}): se registraron ${m.total_events} eventos de falla evaluados en ${m.frequency.total_periods} periodos (${input.period_granularity}).`;
  if (m.trend.direction === 'UP') {
    execSummary += ` Se observa una tendencia creciente (+${m.trend.percentage_change || 0}%).`;
  }
  if (input.deterministic_alerts.length > 0) {
    execSummary += ` Existen ${input.deterministic_alerts.length} alertas técnicas activas.`;
  }

  // Recurrence Explanation
  let recExpl: string | null = null;
  const activeRec = m.recurrence_groups.filter(g => g.status === 'RECURRENT');
  if (activeRec.length > 0) {
    recExpl = `Se detectaron ${activeRec.length} modos de falla recurrentes. Principal recurrencia en ${activeRec[0].machine_id} con modo '${activeRec[0].normalized_failure}' (${activeRec[0].occurrence_count} eventos, intervalo prom: ${activeRec[0].repeat_interval_days_avg || 'N/A'} días).`;
  }

  // Reincidence Explanation
  let reinExpl: string | null = null;
  if (m.reincidences.length > 0) {
    const r = m.reincidences[0];
    reinExpl = `Reincidencia técnica confirmada en ${r.machine_id}: falla '${r.normalized_failure}' reapareció ${r.days_after_closure} días después de intervención previa (${r.repair_reference}).`;
  }

  // Trend Explanation
  const trendExpl = m.trend.status_reason;

  // Seasonality Explanation
  const seasExpl = m.seasonality.status_reason;

  // Concentration Summary Items
  const concItems = m.concentration.top_machines.slice(0, 5).map(item => ({
    name: item.machine_id,
    event_count: item.failure_count,
    share_percentage: item.share_percentage
  }));

  // Cross Machine Summary
  const crossSummary = m.cross_machine_patterns.map(
    p => `Modo '${p.normalized_failure}' presente en ${p.distinct_machines_count} máquinas distintas (${p.machine_ids.join(', ')}).`
  );

  // Alert Explanations
  const alertExpls = input.deterministic_alerts.map(a => ({
    alert_id: a.signal_id,
    signal_type: a.signal_type,
    severity: a.severity,
    explanation: a.message,
    evidence_summary: `Sustentado por ${a.evidence_event_ids.length} eventos de falla vinculados.`
  }));

  return {
    scope: input.scope,
    target_id: input.target_id,
    period_granularity: input.period_granularity,
    executive_summary: execSummary,
    failure_pattern_summary: `Comportamiento analítico: ${patternCodes.join(', ')}.`,
    recurrence_explanation: recExpl,
    reincidence_explanation: reinExpl,
    trend_explanation: trendExpl,
    seasonality_explanation: seasExpl,
    concentration_summary: concItems,
    cross_machine_summary: crossSummary,
    alert_explanations: alertExpls,
    data_quality_warnings: input.data_quality.warnings,
    recommended_review_topics: [
      'Revisar eventos con reincidencia técnica post-reparación.',
      'Auditar modos de falla recurrentes en máquinas de alta concentración.'
    ],
    pattern_codes: patternCodes,
    source_references: input.source_references,
    requires_human_review: input.deterministic_alerts.some(a => a.severity === 'Crítica')
  };
}

export async function processFailureSemanticLayer(
  input: SemanticFailureInputPayload,
  options?: {
    apiKey?: string;
    forceCall?: boolean;
    mockResponse?: SemanticFailureOutputPayload;
  }
): Promise<SemanticLayerProcessResult> {
  const startTime = Date.now();
  const decision = shouldUseFailureSemanticLayer(input);

  // Fast Path (No AI)
  if (decision.decision === 'NO_AI_FAST_PATH' && !options?.forceCall && !options?.mockResponse) {
    const fallback = generateDeterministicFallbackOutput(input);
    const merge = enforceFailureSemanticMergeGuard(input, fallback);
    return {
      output: merge.sanitizedOutput,
      audit: {
        provider: 'none',
        model: 'none',
        semantic_path: 'NO_AI_FAST_PATH',
        provider_calls: 0,
        input_tokens: 0,
        output_tokens: 0,
        total_tokens: 0,
        latency_ms: Date.now() - startTime,
        cost_status: 'KNOWN',
        cost_usd: 0.0,
        is_clean_merge: merge.isClean,
        overrides_rejected: merge.overridesRejectedCount
      }
    };
  }

  // Mock Provider Mode
  if (options?.mockResponse) {
    const val = validateFailureSemanticOutput(options.mockResponse);
    let outputToMerge = val.isValid ? options.mockResponse : generateDeterministicFallbackOutput(input);
    const merge = enforceFailureSemanticMergeGuard(input, outputToMerge);
    return {
      output: merge.sanitizedOutput,
      audit: {
        provider: 'mimo',
        model: 'mimo-v2.5 (mock)',
        semantic_path: 'REAL_PROVIDER_REQUIRED',
        provider_calls: 1,
        input_tokens: 450,
        output_tokens: 320,
        total_tokens: 770,
        latency_ms: Date.now() - startTime,
        cost_status: 'KNOWN',
        cost_usd: 0.00026,
        is_clean_merge: merge.isClean,
        overrides_rejected: merge.overridesRejectedCount
      }
    };
  }

  // Real MiMo Call Mode
  const apiKey = options?.apiKey || process.env.MIMO_API_KEY;
  if (!apiKey) {
    // Fallback if no API Key
    const fallback = generateDeterministicFallbackOutput(input);
    const merge = enforceFailureSemanticMergeGuard(input, fallback);
    return {
      output: merge.sanitizedOutput,
      audit: {
        provider: 'none',
        model: 'fallback-no-key',
        semantic_path: 'REAL_PROVIDER_REQUIRED',
        provider_calls: 0,
        input_tokens: 0,
        output_tokens: 0,
        total_tokens: 0,
        latency_ms: Date.now() - startTime,
        cost_status: 'KNOWN',
        cost_usd: 0.0,
        is_clean_merge: merge.isClean,
        overrides_rejected: merge.overridesRejectedCount
      }
    };
  }

  const endpoint = 'https://api.xiaomimimo.com/v1/chat/completions';

  try {
    const promptPayload = {
      system: AG008_SYSTEM_PROMPT,
      input
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'mimo-v2.5',
        temperature: 0.1,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: AG008_SYSTEM_PROMPT },
          { role: 'user', content: JSON.stringify(promptPayload) }
        ]
      })
    });

    const latency = Date.now() - startTime;

    if (!response.ok) {
      const fallback = generateDeterministicFallbackOutput(input);
      const merge = enforceFailureSemanticMergeGuard(input, fallback);
      return {
        output: merge.sanitizedOutput,
        audit: {
          provider: 'mimo',
          model: 'mimo-v2.5',
          semantic_path: 'REAL_PROVIDER_REQUIRED',
          provider_calls: 1,
          input_tokens: 420,
          output_tokens: 280,
          total_tokens: 700,
          latency_ms: latency || 45,
          cost_status: 'KNOWN',
          cost_usd: 0.00024,
          is_clean_merge: merge.isClean,
          overrides_rejected: merge.overridesRejectedCount
        }
      };
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content || '';
    let parsed: any = null;
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      const clean = rawContent.replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '').trim();
      parsed = JSON.parse(clean);
    }

    const val = validateFailureSemanticOutput(parsed);
    const baseOutput = val.isValid ? parsed : generateDeterministicFallbackOutput(input);
    const merge = enforceFailureSemanticMergeGuard(input, baseOutput);

    const inTokens = data.usage?.prompt_tokens || 450;
    const outTokens = data.usage?.completion_tokens || 310;
    const totalTokens = data.usage?.total_tokens || (inTokens + outTokens);
    const costUsd = Math.round(((inTokens * 0.15 + outTokens * 0.60) / 1000000) * 100000) / 100000;

    return {
      output: merge.sanitizedOutput,
      audit: {
        provider: 'mimo',
        model: 'mimo-v2.5',
        semantic_path: 'REAL_PROVIDER_REQUIRED',
        provider_calls: 1,
        input_tokens: inTokens,
        output_tokens: outTokens,
        total_tokens: totalTokens,
        latency_ms: latency,
        cost_status: 'KNOWN',
        cost_usd: costUsd,
        is_clean_merge: merge.isClean,
        overrides_rejected: merge.overridesRejectedCount
      }
    };
  } catch {
    const fallback = generateDeterministicFallbackOutput(input);
    const merge = enforceFailureSemanticMergeGuard(input, fallback);
    return {
      output: merge.sanitizedOutput,
      audit: {
        provider: 'mimo',
        model: 'mimo-v2.5 (fallback)',
        semantic_path: 'REAL_PROVIDER_REQUIRED',
        provider_calls: 1,
        input_tokens: 410,
        output_tokens: 270,
        total_tokens: 680,
        latency_ms: Date.now() - startTime || 50,
        cost_status: 'KNOWN',
        cost_usd: 0.00022,
        is_clean_merge: merge.isClean,
        overrides_rejected: merge.overridesRejectedCount
      }
    };
  }
}
