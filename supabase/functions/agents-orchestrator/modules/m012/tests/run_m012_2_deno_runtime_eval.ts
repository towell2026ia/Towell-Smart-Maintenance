// supabase/functions/agents-orchestrator/modules/m012/tests/run_m012_2_deno_runtime_eval.ts
// Deno 2.9.5 Edge Runtime Evaluation Suite for M-012 (196 Cases)
// Invariant: DENO_EDGE_RUNTIME_TEST = PASS (§144-147 PRD-M-012.2)

import { M012PreparationEngine } from '../core/m012-preparation-engine.ts';
import { M012PreparationConfigRegistry } from '../config/m012-preparation-config-registry.ts';

async function runDenoRuntimeEvaluation() {
  console.log('================================================================================');
  console.log('🦕  PRD-M-012.2 — DENO 2.9.5 EDGE RUNTIME EVALUATION (196 CASES)');
  console.log('================================================================================\n');

  const datasetUrl = new URL('./fixtures/m012-det-eval-001.json', import.meta.url);
  const text = await Deno.readTextFile(datasetUrl);
  const cases = JSON.parse(text);

  console.log(`Cargados ${cases.length} casos determinísticos en Deno.\n`);

  let passCount = 0;
  let failCount = 0;
  const latencies: number[] = [];

  const expectedFingerprint = '82cc5a9f75c80442f2f11d32d2aa194f864ec407a28859d61f9255d34be492a1';
  const runtimeFingerprint = M012PreparationConfigRegistry.getCompositePreparationModelEvidence().m012_preparation_model_sha256;

  if (runtimeFingerprint !== expectedFingerprint) {
    console.error(`❌ Mismatch de fingerprint: esperado ${expectedFingerprint}, obtenido ${runtimeFingerprint}`);
    Deno.exit(1);
  }

  for (const c of cases) {
    const t0 = performance.now();
    let response = null;
    let caughtError = null;

    try {
      response = M012PreparationEngine.execute(c.request);
    } catch (err) {
      caughtError = err;
    }
    const t1 = performance.now();
    latencies.push(t1 - t0);

    if (c.expected.success) {
      if (
        response &&
        response.success === true &&
        response.work_order_id === c.expected.work_order_id &&
        response.package.readiness.status === c.expected.readiness_status &&
        response.telemetry.llm_calls === 0
      ) {
        passCount++;
      } else {
        failCount++;
        console.error(`❌ Falló caso ${c.case_id} en Deno Runtime`);
      }
    } else {
      if (caughtError !== null) {
        passCount++;
      } else {
        failCount++;
        console.error(`❌ Caso ${c.case_id} debió fallar pero no capturó error`);
      }
    }
  }

  latencies.sort((a, b) => a - b);
  const avgLatency = (latencies.reduce((acc, v) => acc + v, 0) / latencies.length).toFixed(3);
  const medianLatency = latencies[Math.floor(latencies.length / 2)].toFixed(3);
  const p95Latency = latencies[Math.floor(latencies.length * 0.95)].toFixed(3);

  console.log('================================================================================');
  console.log('📊 RESUMEN DE EJECUCIÓN EN DENO EDGE RUNTIME:');
  console.log(`   - Casos Evaluados:            ${cases.length} / 196`);
  console.log(`   - Aprobados (PASS):           ${passCount} (${((passCount/cases.length)*100).toFixed(2)}%)`);
  console.log(`   - Fallidos  (FAIL):           ${failCount}`);
  console.log(`   - Latencia Promedio Deno:     ${avgLatency} ms/caso`);
  console.log(`   - Latencia Mediana Deno:      ${medianLatency} ms`);
  console.log(`   - Latencia P95 Deno:          ${p95Latency} ms`);
  console.log(`   - Fingerprint Compuesto Deno: ${runtimeFingerprint}`);
  console.log('================================================================================');

  if (cases.length >= 196 && passCount === cases.length && failCount === 0) {
    console.log('🏆 VEREDICTO DENO EDGE RUNTIME: DENO_EDGE_RUNTIME_TEST = PASS ✅\n');
  } else {
    console.error('❌ VEREDICTO DENO EDGE RUNTIME: FAILED\n');
    Deno.exit(1);
  }
}

runDenoRuntimeEvaluation().catch(err => {
  console.error('Error fatal en Deno Runtime Evaluation:', err);
  Deno.exit(1);
});
