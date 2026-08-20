// supabase/functions/agents-orchestrator/agents/ag008/tests/run_ag008_4_deno_runtime_eval.ts
// Deno Edge Functions Final E2E Runtime Verification for AG-008.4
// Tests the full E2E orchestrator event handling pipeline in Edge Runtime

import { handleAG008OrchestratorEvent } from '../router/ag008-orchestrator-router.ts';

async function runDenoFinalE2EVerification() {
  console.log('================================================================================');
  console.log('🦕 VERIFICACIÓN FINAL DE RUNTIME DENO / EDGE FUNCTIONS — AG-008.4');
  console.log('================================================================================\n');

  const correlationId = 'CORR-DENO-E2E-FINAL-001';

  const response = await handleAG008OrchestratorEvent({
    event_type: 'FAILURE_ANALYSIS_REQUESTED',
    correlation_id: correlationId,
    scope: 'MACHINE',
    target_id: 'TELAR-202',
    granularity: 'WEEKLY',
    user_intent: '¿Qué fallas recurrentes presenta el Telar 202?',
    raw_records: [
      {
        id: 'OT-DENO-E2E-1',
        folio: 'OT-101',
        source_type: 'OT',
        source_table: 'ordenes_trabajo',
        maquina_id: 'TELAR-202',
        depto: 'PF',
        descripcion: 'falla de trama recurrente',
        fecha: '2026-08-01',
        tipo_mantenimiento: 'CORRECTIVO'
      },
      {
        id: 'OT-DENO-E2E-2',
        folio: 'OT-102',
        source_type: 'OT',
        source_table: 'ordenes_trabajo',
        maquina_id: 'TELAR-202',
        depto: 'PF',
        descripcion: 'falla de trama',
        fecha: '2026-08-08',
        tipo_mantenimiento: 'CORRECTIVO'
      },
      {
        id: 'OT-DENO-E2E-3',
        folio: 'OT-103',
        source_type: 'OT',
        source_table: 'ordenes_trabajo',
        maquina_id: 'TELAR-202',
        depto: 'PF',
        descripcion: 'falla de trama',
        fecha: '2026-08-15',
        tipo_mantenimiento: 'CORRECTIVO'
      }
    ],
    valid_machines: ['TELAR-201', 'TELAR-202', 'TELAR-203']
  });

  console.log('Correlation ID:', response.correlation_id);
  console.log('Agent ID:', response.agent_id);
  console.log('Version:', response.version);
  console.log('Snapshot ID:', response.snapshot_id);
  console.log('Eventos Deduplicados:', response.deterministic_analysis.deduped_events_count);
  console.log('Alertas Emitidas:', response.deterministic_analysis.deterministic_alerts.length);
  console.log('Resumen Semántico:', response.semantic_explanation.executive_summary);
  console.log('Duración Total:', response.duration_ms, 'ms');

  if (
    response.success &&
    response.agent_id === 'AG-008' &&
    response.version === '1.0' &&
    response.deterministic_analysis.deduped_events_count === 3 &&
    response.deterministic_analysis.recurrence_groups[0]?.status === 'RECURRENT'
  ) {
    console.log('\n✅ DENO_EDGE_RUNTIME_TEST = PASS\n');
    return true;
  } else {
    throw new Error('Deno final E2E runtime verification failed');
  }
}

runDenoFinalE2EVerification();
