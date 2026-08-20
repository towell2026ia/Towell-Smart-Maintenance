// supabase/functions/agents-orchestrator/agents/ag008/tests/run_ag008_2_deno_runtime_eval.ts
// Deno Edge Functions Runtime Verification for AG-008.2
// Run: deno test or direct execution in Edge Runtime

import { executeFailureAnalysis, type RawFailureInput } from '../core/failure-engine.ts';

function runDenoVerification() {
  console.log('================================================================================');
  console.log('🦕 VERIFICACIÓN DE RUNTIME DENO / EDGE FUNCTIONS — AG-008.2');
  console.log('================================================================================\n');

  const sampleInputs: RawFailureInput[] = [
    {
      id: 'OT-DENO-01',
      source_type: 'OT',
      source_table: 'ordenes_trabajo',
      maquina_id: 'TELAR-202',
      depto: 'PF',
      descripcion: 'falla de trama recurrente',
      fecha: '2026-08-01',
      tipo_mantenimiento: 'CORRECTIVO'
    },
    {
      id: 'OT-DENO-02',
      source_type: 'OT',
      source_table: 'ordenes_trabajo',
      maquina_id: 'TELAR-202',
      depto: 'PF',
      descripcion: 'falla de trama',
      fecha: '2026-08-08',
      tipo_mantenimiento: 'CORRECTIVO'
    },
    {
      id: 'OT-DENO-03',
      source_type: 'OT',
      source_table: 'ordenes_trabajo',
      maquina_id: 'TELAR-202',
      depto: 'PF',
      descripcion: 'falla de trama',
      fecha: '2026-08-15',
      tipo_mantenimiento: 'CORRECTIVO'
    }
  ];

  const result = executeFailureAnalysis(sampleInputs, {
    scope: 'MACHINE',
    targetId: 'TELAR-202',
    periodGranularity: 'WEEKLY',
    validMachineCatalog: ['TELAR-201', 'TELAR-202', 'TELAR-203']
  });

  console.log('Snapshot Generado:', result.snapshot_id);
  console.log('Eventos Deduplicados:', result.deduped_events_count);
  console.log('Grupos de Recurrencia:', result.recurrence_groups.length);
  console.log('Alertas Determinísticas:', result.deterministic_alerts.length);

  if (result.deduped_events_count === 3 && result.recurrence_groups[0]?.status === 'RECURRENT') {
    console.log('\n✅ DENO_EDGE_RUNTIME_TEST = PASS\n');
    return true;
  } else {
    throw new Error('Deno runtime verification failed');
  }
}

runDenoVerification();
