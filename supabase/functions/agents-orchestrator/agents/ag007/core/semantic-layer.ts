// supabase/functions/agents-orchestrator/agents/ag007/core/semantic-layer.ts
// Semantic Layer Orchestrator for AG-007 (v1.0)
// Frozen under Token: AG007-SEMANTIC-LAYER-001
// Invariant: Full coordination of Prompt, Fast-path, MiMo Call, Validator, Merge Guard (§1-4, §171-175 PRD)

import type { SemanticInputPayload } from '../contracts/ag007-semantic-input.contract.ts';
import type { SemanticOutputPayload } from '../contracts/ag007-semantic-output.contract.ts';
import { shouldUseSemanticLayer, type SemanticDecisionResult } from '../decision/should-use-semantic-layer.ts';
import { callMiMoSemanticLayer, type MiMoCallAudit } from '../adapters/mimo-provider.adapter.ts';
import { validateSemanticOutput, type ValidationReport } from '../validators/semantic-validator.ts';
import { enforceMonetaryMergeGuard, type MonetaryMergeReport } from '../guards/monetary-semantic-merge-guard.ts';

export interface SemanticExecutionResult {
  decision: SemanticDecisionResult;
  output: SemanticOutputPayload | null;
  validation?: ValidationReport;
  mergeReport?: MonetaryMergeReport;
  audit: MiMoCallAudit;
  fallbackUsed: boolean;
  status: 'SUCCESS' | 'NO_AI_FAST_PATH' | 'VALIDATION_FAILED' | 'PROVIDER_FAILED';
}

export function generateDeterministicFallbackOutput(input: SemanticInputPayload): SemanticOutputPayload {
  const periodStr = input.period.month || String(input.period.year);
  const varianceStr = input.variance.variance_amount !== null
    ? `${input.variance.variance_amount > 0 ? '+' : ''}$${input.variance.variance_amount.toFixed(2)} MXN (${input.variance.variance_pct !== null ? (input.variance.variance_pct > 0 ? '+' : '') + input.variance.variance_pct + '%' : 'N/A'})`
    : 'No disponible (sin presupuesto configurado)';

  const patterns: string[] = [];
  if (input.variance.status === 'UNFAVORABLE') patterns.push('BUDGET_EXCEEDED');
  else if (input.variance.status === 'FAVORABLE') patterns.push('BUDGET_WITHIN_RANGE');
  if (input.forecast.forecast_total !== null && input.budget.budget_value !== null && input.forecast.forecast_total > input.budget.budget_value) {
    patterns.push('FORECAST_OVER_BUDGET');
  }
  if (input.actual.completeness === 'PARTIAL_COST_TOTAL') patterns.push('PARTIAL_COST_INFORMATION');
  if (patterns.length === 0) patterns.push('NO_SIGNIFICANT_COST_PATTERN');

  return {
    period: periodStr,
    scope: input.scope,
    executive_summary: `Gasto conocido registrado a la fecha: $${input.actual.known_total.toFixed(2)} MXN. Presupuesto asignado: ${input.budget.budget_value !== null ? '$' + input.budget.budget_value.toFixed(2) + ' MXN' : 'Sin presupuesto'}. Desviación actual: ${varianceStr}.`,
    budget_status_explanation: input.budget.status === 'AVAILABLE'
      ? `El presupuesto oficial autorizado es de $${input.budget.budget_value?.toFixed(2)} MXN (${input.budget.budget_source}).`
      : 'No existe presupuesto corporativo general cargado para este período.',
    variance_explanation: `La desviación calculada respecto al plan es de ${varianceStr}.`,
    forecast_explanation: input.forecast.forecast_total !== null
      ? `Proyección matemática determinística a cierre de período: $${input.forecast.forecast_total.toFixed(2)} MXN (tasa diaria: $${input.forecast.burn_rate_per_day?.toFixed(2)} MXN/día).`
      : 'Proyección no disponible debido a falta de histórico en el período.',
    cost_driver_summary: input.cost_breakdown.top_machine_drivers.map(d => ({
      category: 'MACHINE',
      name: d.machine_id,
      amount_mxn: d.actual_cost,
      percentage: d.pct_of_known,
      explanation: `Telar ${d.machine_id} acumuló $${d.actual_cost.toFixed(2)} MXN (${d.pct_of_known.toFixed(1)}% del gasto conocido).`,
      source_ref: `machine:${d.machine_id}`
    })),
    pattern_codes: patterns,
    alert_explanations: input.deterministic_alerts.map(a => ({
      alert_code: a.alert_code,
      severity: a.severity,
      target: a.machine_id || periodStr,
      why: a.message,
      suggested_review: 'Revisar consumos de refacciones e incidencias técnicas asociadas.',
      source_ref: a.alert_id
    })),
    data_quality_warnings: input.actual.completeness === 'PARTIAL_COST_TOTAL'
      ? ['Aviso de calidad: El costo registrado representa únicamente refacciones y componentes con precio conocido (tarifa de mano de obra y paros pendientes de cotizar).']
      : [],
    management_notes: [
      'Seguimiento rutinario de variaciones y disponibilidad de presupuesto.',
      'Auditoría continua de refacciones consumidas por telar.'
    ],
    source_references: input.source_references || ['source:deterministic_cost_engine'],
    requires_human_review: input.actual.completeness === 'PARTIAL_COST_TOTAL' || input.deterministic_alerts.length > 0
  };
}

export async function processSemanticLayer(
  input: SemanticInputPayload,
  config: {
    apiKey?: string;
    endpoint?: string;
    model?: string;
    flags?: {
      mimoEnabled?: boolean;
      llmCallsEnabled?: boolean;
      userExplicitAIRequest?: boolean;
      hasFreshCachedExplanation?: boolean;
    };
  } = {}
): Promise<SemanticExecutionResult> {
  // 1. Fast path decision
  const decision = shouldUseSemanticLayer(input, config.flags);

  if (!decision.shouldCallLLM) {
    const fallback = generateDeterministicFallbackOutput(input);
    return {
      decision,
      output: fallback,
      audit: {
        provider: 'Xiaomi MiMo',
        model: config.model || 'mimo-v2.5',
        input_tokens: 0,
        output_tokens: 0,
        total_tokens: 0,
        cost_status: 'KNOWN',
        total_cost_usd: 0.00,
        latency_ms: 0,
        success: true
      },
      fallbackUsed: true,
      status: 'NO_AI_FAST_PATH'
    };
  }

  // 2. Call Xiaomi MiMo Provider
  const mimoRes = await callMiMoSemanticLayer(input, {
    apiKey: config.apiKey,
    endpoint: config.endpoint,
    model: config.model
  });

  if (!mimoRes.audit.success || !mimoRes.output) {
    const fallback = generateDeterministicFallbackOutput(input);
    return {
      decision,
      output: fallback,
      audit: mimoRes.audit,
      fallbackUsed: true,
      status: 'PROVIDER_FAILED'
    };
  }

  // 3. Validate semantic output
  const validation = validateSemanticOutput(mimoRes.output);

  if (!validation.isValid) {
    const fallback = generateDeterministicFallbackOutput(input);
    return {
      decision,
      output: fallback,
      validation,
      audit: mimoRes.audit,
      fallbackUsed: true,
      status: 'VALIDATION_FAILED'
    };
  }

  // 4. Enforce monetary merge guard
  const mergeReport = enforceMonetaryMergeGuard(input, mimoRes.output);

  return {
    decision,
    output: mergeReport.sanitizedOutput,
    validation,
    mergeReport,
    audit: mimoRes.audit,
    fallbackUsed: false,
    status: 'SUCCESS'
  };
}
