// supabase/functions/agents-orchestrator/modules/m010/tests/run_m010_2_deno_runtime_eval.ts
// Real Deno Edge Runtime Evaluation for M-010.2 (v1.0)
// Gate: DENO_EDGE_RUNTIME_TEST = PASS
// Invariant: Executed strictly under Deno runtime, testing the full aggregation pipeline (§32-45 PRD-M-010.2-R1)

import { Asset360Engine } from '../core/asset360-engine.ts';
import type { Asset360, AssetSummary } from '../types/m010.types.ts';

async function runDenoRuntimeEvaluation() {
  console.log('================================================================================');
  console.log('🦕 M-010.2 REAL DENO EDGE FUNCTIONS RUNTIME EVALUATION');
  console.log('================================================================================\n');

  console.log(`Deno Version: ${Deno.version.deno}`);
  console.log(`V8 Version:   ${Deno.version.v8}`);
  console.log(`TypeScript:   ${Deno.version.typescript}\n`);

  const mockRepos = {
    machines: [
      { id: 'MACH-DENO-01', codigo_maquina: 'TELAR-202', nombre: 'Telar Tsudakoma ZAX 202', depto: 'PF', tipo: 'TELAR DE AIRE', modelo: 'ZAX-9100', marca: 'TSUDAKOMA', serie: 'SN-DENO-202', criticidad: 'ALTA', estatus: 'OPERANDO', activo: true, created_at: '2025-01-10T08:00:00Z' }
    ],
    workOrders: [
      { id: 'WO-DENO-01', folio: 'OT-DENO-001', tipo_mantenimiento: 'CORRECTIVO', maquina_id: 'TELAR-202', estatus: 'CERRADA', fecha_creacion: '2026-08-01T08:00:00Z', fecha_cierre: '2026-08-01T10:00:00Z', descripcion: 'Falla de trama', trabajo_realizado: 'Ajuste de sensor' }
    ],
    maintenancePlans: [
      { id: 'MP-DENO-01', maquina_id: 'TELAR-202', tipo: 'PREVENTIVO_ANUAL' as const, anio: 2026, periodo_referencia: '06', fecha_programada: '2026-06-15', fecha_ejecutada: '2026-06-15', estado: 'EJECUTADO' }
    ],
    checklistDefinitions: [
      { id: 'CHK-DENO-01', nombre: 'Checklist Telar', tipo_mantenimiento: 'PREVENTIVO', depto: 'PF', preguntas_count: 10 }
    ],
    checklistExecutions: [
      { id: 'EXEC-DENO-01', orden_id: 'WO-DENO-01', maquina_id: 'TELAR-202', checklist_id: 'CHK-DENO-01', fecha_ejecucion: '2026-06-15T09:00:00Z', respuestas_aprobadas: 10, respuestas_fallidas: 0 }
    ],
    surveys: [
      { id: 'SRV-DENO-01', maquina_id: 'TELAR-202', tipo_levantamiento: 'LEVANTAMIENTO_PREDICTIVO' as const, fecha: '2026-08-05T10:00:00Z', tecnico_id: 'TECH-01', estado: 'COMPLETADO', observaciones: 'Inspección de vibraciones' }
    ],
    findings: [
      { id: 'FIND-DENO-01', levantamiento_id: 'SRV-DENO-01', maquina_id: 'TELAR-202', fecha: '2026-08-05T10:15:00Z', bloque_o_item: 'RODAMIENTO', hallazgo: 'Vibración leve', gravedad: 'LEVE' as const }
    ],
    failures: [
      { id: 'FAIL-DENO-01', maquina_id: 'TELAR-202', falla_normalizada: 'FALLA_TRAMA', falla_raw: 'paro de trama', fecha: '2026-08-01', depto: 'PF', source_type: 'OT', associated_ot_folio: 'OT-DENO-001' }
    ],
    parts: [
      { id: 'PART-DENO-01', maquina_id: 'TELAR-202', refaccion_id: 'REF-01', codigo_refaccion: 'SENSOR-TRAMA', nombre_refaccion: 'Sensor de trama óptico', cantidad: 1, unidad: 'PZA', fecha_uso: '2026-08-01', associated_ot_folio: 'OT-DENO-001', costo_unitario: 250 }
    ],
    downtime: [
      { id: 'DT-DENO-01', maquina_id: 'TELAR-202', fecha_inicio: '2026-08-01T08:00:00Z', fecha_fin: '2026-08-01T10:00:00Z', duracion_minutos: 120, causa_aparente: 'Paro por trama', associated_ot_folio: 'OT-DENO-001' }
    ],
    alerts: [
      { signal_id: 'ALT-DENO-01', signal_type: 'FAILURE_RECURRENCE_ALERT', target_id: 'TELAR-202', severity: 'Advertencia' as const, message: 'Alerta Deno', created_at: '2026-08-10T08:00:00Z', status: 'ACTIVE' as const, source_agent: 'AG-008' }
    ]
  };

  const engine = new Asset360Engine(mockRepos);

  // Test 1: Full Asset360 Detail Pipeline
  console.log('▶ [1/3] Ejecutando pipeline completo de detalle Asset360...');
  const detailRes = await engine.getAsset360({ asset_id: 'TELAR-202', mode: 'DETAIL' });
  const a360 = detailRes.data as Asset360;

  if (
    detailRes.success &&
    a360.asset_id === 'TELAR-202' &&
    a360.work_orders.length === 1 &&
    a360.failure_history.length === 1 &&
    a360.maintenance_plans.length === 1 &&
    a360.parts_history.length === 1 &&
    a360.timeline.length > 0 &&
    detailRes.record_version.startsWith('VER-M010-TELAR-202')
  ) {
    console.log('  ✅ [PASS] Pipeline de detalle Asset360 ejecutado en Deno con éxito');
  } else {
    throw new Error('Pipeline de detalle Asset360 falló en Deno');
  }

  // Test 2: Asset Summary Pipeline
  console.log('▶ [2/3] Ejecutando pipeline de resumen AssetSummary...');
  const summaryRes = await engine.getAsset360({ asset_id: 'TELAR-202', mode: 'SUMMARY' });
  const summary = summaryRes.data as AssetSummary;

  if (
    summaryRes.success &&
    summary.asset_id === 'TELAR-202' &&
    summary.total_work_orders === 1 &&
    summary.total_failures === 1 &&
    summary.total_maintenances === 1
  ) {
    console.log('  ✅ [PASS] Pipeline de resumen AssetSummary ejecutado en Deno con éxito');
  } else {
    throw new Error('Pipeline de resumen AssetSummary falló en Deno');
  }

  // Test 3: Consumer Context Filtering Pipeline
  console.log('▶ [3/3] Ejecutando pipeline de filtrado de contexto de consumidor (AG-010)...');
  const contextRes = await engine.getAsset360({
    asset_id: 'TELAR-202',
    mode: 'CONTEXT',
    consumer_request: {
      asset_id: 'TELAR-202',
      consumer_id: 'AG-010',
      requested_sections: ['IDENTITY', 'FAILURES']
    }
  });

  if (
    contextRes.success &&
    contextRes.data.sections_provided.length === 2 &&
    contextRes.data.data.identity !== undefined &&
    contextRes.data.data.failure_history !== undefined &&
    contextRes.data.data.parts_history === undefined
  ) {
    console.log('  ✅ [PASS] Pipeline de contexto de consumidor ejecutado en Deno con éxito');
  } else {
    throw new Error('Pipeline de contexto de consumidor falló en Deno');
  }

  console.log('\n================================================================================');
  console.log('🏆 VEREDICTO DENO RUNTIME: DENO_EDGE_RUNTIME_TEST = PASS ✅');
  console.log('================================================================================\n');
}

runDenoRuntimeEvaluation();
