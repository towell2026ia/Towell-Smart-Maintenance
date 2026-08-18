// supabase/functions/agents-orchestrator/agents/ag003/core/semantic-layer.ts
// Master Semantic Layer for AG-003.3 (§1-13 PRD)

import { PredictiveEngineOutput } from '../types/ag003.types.ts';
import { SemanticInputPayload } from '../contracts/semantic-input.contract.ts';
import { IMiMoProvider, MockMiMoProvider } from '../adapters/mimo-provider.adapter.ts';
import { shouldUseSemanticLayer } from '../decision/should-use-semantic-layer.ts';
import { validateSemanticOutput } from '../validators/semantic-validator.ts';
import { mergeDeterministicWithSemantic, EnrichedPredictiveItem } from '../guards/semantic-merge-guard.ts';
import { PredictivePatternCode } from '../catalog/pattern-catalog.ts';

export interface SemanticLayerConfig {
  provider?: IMiMoProvider;
  mimoEnabled?: boolean;
  llmCallsEnabled?: boolean;
  isTestModeDeterministicOnly?: boolean;
}

export interface EnrichedPredictiveOutput extends Omit<PredictiveEngineOutput, 'schedule_items'> {
  schedule_items: EnrichedPredictiveItem[];
  semantic_audit: {
    total_calls: number;
    successful_calls: number;
    failed_calls: number;
    total_input_tokens: number;
    total_output_tokens: number;
    average_latency_ms: number;
    ai_cost_usd: number;
  };
}

export async function runPredictiveSemanticLayer(
  deterministicOutput: PredictiveEngineOutput,
  config: SemanticLayerConfig = {}
): Promise<EnrichedPredictiveOutput> {
  const provider = config.provider || new MockMiMoProvider();
  const enrichedItems: EnrichedPredictiveItem[] = [];

  let totalCalls = 0;
  let successfulCalls = 0;
  let failedCalls = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalLatency = 0;

  for (const item of deterministicOutput.schedule_items) {
    const candidate = deterministicOutput.all_candidates.find(c => c.machine_id === item.machine_id);

    const shouldRun = shouldUseSemanticLayer({
      isSelected: true,
      mimoEnabled: config.mimoEnabled,
      llmCallsEnabled: config.llmCallsEnabled,
      isTestModeDeterministicOnly: config.isTestModeDeterministicOnly,
      hasSufficientContext: true
    });

    if (!shouldRun || !candidate) {
      enrichedItems.push(mergeDeterministicWithSemantic(item, candidate || ({} as any)));
      continue;
    }

    totalCalls++;

    // Build precalculated patterns
    const patterns: PredictivePatternCode[] = [];
    if (candidate.deviation.relative_deviation >= 0.50) patterns.push('HIGH_QUALITY_DEVIATION');
    else if (candidate.deviation.relative_deviation >= 0.15) patterns.push('MODERATE_QUALITY_DEVIATION');
    else patterns.push('QUALITY_STABLE');

    if (candidate.quality_metrics.total_segundas > 50) patterns.push('PERSISTENT_QUALITY_DEGRADATION');
    if (candidate.historical_context.failures_count >= 2) patterns.push('HIGH_FAILURE_CONTEXT');
    if (candidate.historical_context.downtime_hours >= 10) patterns.push('HIGH_DOWNTIME_CONTEXT');
    if (candidate.historical_context.criticality === 'Muy Alta' || candidate.historical_context.criticality === 'Alta') patterns.push('CRITICAL_ASSET_CONTEXT');

    const inputPayload: SemanticInputPayload = {
      contract_id: 'AG003-SEMANTIC-INPUT-001',
      version: '1.0',
      target_month: item.month_str,
      machine: {
        machine_id: item.machine_id,
        department_code: 'PF',
        is_loom: true,
        criticality: candidate.historical_context.criticality
      },
      analysis_window: {
        from_date: `${item.month_str}-01`,
        to_date: item.scheduled_date,
        total_rolls: candidate.quality_metrics.total_rolls,
        valid_rolls: candidate.quality_metrics.total_rolls,
        total_segundas: candidate.quality_metrics.total_segundas,
        segundas_per_roll: candidate.quality_metrics.segundas_rate
      },
      baseline: {
        baseline_value: candidate.baseline.baseline_value,
        baseline_type: candidate.baseline.baseline_type,
        is_available: candidate.baseline.baseline_available
      },
      deviation: {
        absolute_deviation: candidate.deviation.absolute_deviation,
        relative_deviation: candidate.deviation.relative_deviation,
        trend: candidate.deviation.trend
      },
      data_quality: {
        status: candidate.data_status,
        is_sufficient: candidate.data_status === 'SUFFICIENT_DATA'
      },
      historical_context: {
        deduplicated_failures_30d: candidate.historical_context.failures_count,
        downtime_hours_30d: candidate.historical_context.downtime_hours,
        last_predictive_days_ago: null
      },
      priority: {
        priority_score: item.priority_score,
        rank_position: item.rank_position,
        selected: true,
        scheduled_date: item.scheduled_date
      },
      precalculated_patterns: patterns,
      untrusted_historical_content: []
    };

    const res = await provider.interpretPredictiveCandidate(inputPayload);
    totalLatency += res.latency_ms;
    totalInputTokens += res.input_tokens;
    totalOutputTokens += res.output_tokens;

    if (res.success && res.rawJson) {
      const validation = validateSemanticOutput(res.rawJson, item.machine_id);
      if (validation.isValid && validation.sanitizedOutput) {
        successfulCalls++;
        enrichedItems.push(mergeDeterministicWithSemantic(item, candidate, validation.sanitizedOutput));
      } else {
        failedCalls++;
        enrichedItems.push(mergeDeterministicWithSemantic(item, candidate));
      }
    } else {
      failedCalls++;
      enrichedItems.push(mergeDeterministicWithSemantic(item, candidate));
    }
  }

  return {
    ...deterministicOutput,
    schedule_items: enrichedItems,
    semantic_audit: {
      total_calls: totalCalls,
      successful_calls: successfulCalls,
      failed_calls: failedCalls,
      total_input_tokens: totalInputTokens,
      total_output_tokens: totalOutputTokens,
      average_latency_ms: totalCalls > 0 ? Number((totalLatency / totalCalls).toFixed(0)) : 0,
      ai_cost_usd: 0 // Will be audited when real provider rates are calculated
    }
  };
}
