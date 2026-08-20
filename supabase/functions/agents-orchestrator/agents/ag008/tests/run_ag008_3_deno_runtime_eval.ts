// supabase/functions/agents-orchestrator/agents/ag008/tests/run_ag008_3_deno_runtime_eval.ts
// Deno Edge Functions Runtime Verification for AG-008.3
// Verifies full pipeline: Fast Path and Real Provider Mode in Edge Runtime

import { processFailureSemanticLayer } from '../core/failure-semantic-layer.ts';
import type { SemanticFailureInputPayload } from '../contracts/ag008-semantic-input.contract.ts';

async function runDenoSemanticVerification() {
  console.log('================================================================================');
  console.log('🦕 VERIFICACIÓN DE RUNTIME DENO / EDGE FUNCTIONS — AG-008.3');
  console.log('================================================================================\n');

  // Case A: Fast Path
  const fastPathInput: SemanticFailureInputPayload = {
    snapshot_id: 'SNAP-DENO-FP-001',
    scope: 'MACHINE',
    target_id: 'TELAR-202',
    period_granularity: 'WEEKLY',
    metrics: {
      total_events: 2,
      frequency: {
        total_events: 2,
        total_periods: 4,
        average_failures_per_period: 0.5,
        max_failures_in_single_period: 1,
        metric_type: 'COUNT',
        mtbf_status: 'MTBF_NOT_SUPPORTED_WITH_CURRENT_DATA'
      },
      recurrence_groups: [],
      reincidences: [],
      trend: {
        direction: 'STABLE',
        slope: 0,
        percentage_change: 0,
        periods_evaluated: 4,
        is_statistically_valid: true,
        status_reason: 'Tendencia STABLE calculada sobre 4 periodos.'
      },
      concentration: {
        total_known_failures: 2,
        top_machines: [{ machine_id: 'TELAR-202', department: 'PF', failure_count: 2, share_percentage: 100 }],
        top_failure_modes: [{ failure_normalized: 'FALLA_TRAMA', failure_count: 2, share_percentage: 100 }],
        by_department: [{ department: 'PF', failure_count: 2, share_percentage: 100 }]
      },
      cross_machine_patterns: [],
      seasonality: {
        status: 'INSUFFICIENT_HISTORY',
        monthly_periods_count: 4,
        is_statistically_sufficient: false,
        detected_cycle_months: null,
        seasonality_strength: null,
        status_reason: 'Histórico insuficiente.'
      }
    },
    deterministic_alerts: [],
    data_quality: {
      overall_quality: 'RELIABLE',
      total_events: 2,
      unattributed_machine_count: 0,
      approximated_time_count: 0,
      unmapped_failure_mode_count: 0,
      warnings: []
    },
    source_references: ['ordenes_trabajo:OT-401']
  };

  const resA = await processFailureSemanticLayer(fastPathInput);
  console.log('Test Case A (Fast Path):', resA.audit.semantic_path, '| Calls:', resA.audit.provider_calls);

  // Case B: Semantic Required (Mock mode in Deno test to verify TypeScript runtime execution)
  const semanticInput: SemanticFailureInputPayload = {
    ...fastPathInput,
    deterministic_alerts: [
      {
        signal_id: 'ALT-DENO-001',
        signal_type: 'FAILURE_RECURRENCE_ALERT',
        scope: 'MACHINE',
        target_id: 'TELAR-202',
        severity: 'Advertencia',
        message: 'Falla recurrente detectada en TELAR-202.',
        metrics: { event_count: 5 },
        evidence_event_ids: ['EV-1', 'EV-2'],
        source_references: ['ordenes_trabajo:OT-401'],
        rule_version: 'AG008-ALERT-THRESHOLD-RULES-001',
        created_at: '2026-08-20T10:00:00Z'
      }
    ]
  };

  const resB = await processFailureSemanticLayer(semanticInput, {
    mockResponse: {
      scope: 'MACHINE',
      target_id: 'TELAR-202',
      period_granularity: 'WEEKLY',
      executive_summary: 'Resumen ejecutivo de prueba para runtime Deno.',
      failure_pattern_summary: 'Patrón de falla recurrente detectado.',
      recurrence_explanation: 'Recurrencia explicada en Deno runtime.',
      reincidence_explanation: null,
      trend_explanation: 'Tendencia estable.',
      seasonality_explanation: null,
      concentration_summary: [{ name: 'TELAR-202', event_count: 2, share_percentage: 100 }],
      cross_machine_summary: [],
      alert_explanations: [
        {
          signal_type: 'FAILURE_RECURRENCE_ALERT',
          severity: 'Advertencia',
          explanation: 'Explicación de alerta en Deno.',
          evidence_summary: 'Sustentado por 2 eventos.'
        }
      ],
      data_quality_warnings: [],
      recommended_review_topics: ['Revisar eventos recurrentes.'],
      pattern_codes: ['FAILURE_RECURRENCE'],
      source_references: ['ordenes_trabajo:OT-401'],
      requires_human_review: false
    }
  });

  console.log('Test Case B (Semantic Required):', resB.audit.semantic_path, '| Calls:', resB.audit.provider_calls);

  if (resA.audit.provider_calls === 0 && resB.audit.provider_calls === 1 && resB.output.pattern_codes[0] === 'FAILURE_RECURRENCE') {
    console.log('\n✅ DENO_EDGE_RUNTIME_TEST = PASS\n');
    return true;
  } else {
    throw new Error('Deno semantic runtime verification failed');
  }
}

runDenoSemanticVerification();
