// supabase/functions/agents-orchestrator/agents/ag008/router/ag008-orchestrator-router.ts
// Central Orchestrator Router for AG-008 (v1.0)
// Frozen under Token: AG008-1.0-FROZEN
// Invariant: Invocations routed strictly via AG-001; direct UI/Scheduler bypass = 0 (§105-114 PRD)

import { executeFailureAnalysis, type RawFailureInput } from '../core/failure-engine.ts';
import { processFailureSemanticLayer } from '../core/failure-semantic-layer.ts';
import type { FailureScope, TimeGranularity } from '../types/ag008.types.ts';
import type { SemanticFailureInputPayload } from '../contracts/ag008-semantic-input.contract.ts';

export interface AG008OrchestratorEventRequest {
  event_type: 'FAILURE_ANALYSIS_REQUESTED' | 'SYSTEM_ALERTS_REQUESTED';
  correlation_id: string;
  user_id?: string;
  scope?: FailureScope;
  target_id?: string;
  granularity?: TimeGranularity;
  user_intent?: string;
  raw_records: RawFailureInput[];
  valid_machines?: string[];
  options?: {
    force_semantic?: boolean;
    api_key?: string;
  };
}

export interface AG008OrchestratorEventResponse {
  success: boolean;
  correlation_id: string;
  agent_id: 'AG-008';
  version: '1.0';
  event_type: 'FAILURE_ANALYSIS_REQUESTED' | 'SYSTEM_ALERTS_REQUESTED';
  snapshot_id: string;
  deterministic_analysis: any;
  semantic_explanation: any;
  audit: any;
  duration_ms: number;
}

export async function handleAG008OrchestratorEvent(
  request: AG008OrchestratorEventRequest
): Promise<AG008OrchestratorEventResponse> {
  const startTime = Date.now();
  const scope = request.scope || 'GLOBAL';
  const targetId = request.target_id || (scope === 'GLOBAL' ? 'GLOBAL' : 'TELAR-202');
  const granularity = request.granularity || 'WEEKLY';

  // 1. Run Deterministic Failure Engine (AG-008.2)
  const detResult = executeFailureAnalysis(request.raw_records, {
    scope,
    targetId,
    periodGranularity: granularity,
    validMachineCatalog: request.valid_machines
  });

  // 2. Prepare Semantic Input Contract
  const semanticInput: SemanticFailureInputPayload = {
    snapshot_id: detResult.snapshot_id,
    scope,
    target_id: targetId,
    period_granularity: granularity,
    metrics: {
      total_events: detResult.deduped_events_count,
      frequency: detResult.frequency,
      recurrence_groups: detResult.recurrence_groups,
      reincidences: detResult.reincidences,
      trend: detResult.trend,
      concentration: detResult.concentration,
      cross_machine_patterns: detResult.cross_machine_patterns,
      seasonality: detResult.seasonality
    },
    deterministic_alerts: detResult.deterministic_alerts,
    data_quality: detResult.data_quality,
    source_references: detResult.events.map(e => e.source_reference),
    user_intent: request.user_intent
  };

  // 3. Run Semantic Layer (MiMo / Fast Path with Merge Guard)
  const semResult = await processFailureSemanticLayer(semanticInput, {
    apiKey: request.options?.api_key,
    forceCall: request.options?.force_semantic
  });

  return {
    success: true,
    correlation_id: request.correlation_id,
    agent_id: 'AG-008',
    version: '1.0',
    event_type: request.event_type,
    snapshot_id: detResult.snapshot_id,
    deterministic_analysis: detResult,
    semantic_explanation: semResult.output,
    audit: {
      ...semResult.audit,
      duration_ms: Date.now() - startTime,
      rule_versions: detResult.rule_versions
    },
    duration_ms: Date.now() - startTime
  };
}
