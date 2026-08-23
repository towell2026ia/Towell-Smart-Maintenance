// supabase/functions/agents-orchestrator/modules/m013/tests/run_m013_3_deno_runtime_eval.ts
// Final Deno 2.9.5 Edge Runtime Evaluation Suite for M-013 (170 Cases)
// Invariant: DENO_EDGE_RUNTIME_TEST = PASS (§86-88 PRD-M-013.3)

import { M013SafetyEngine } from '../core/m013-safety-engine.ts';
import { M013SafetyConfigRegistry } from '../config/m013-safety-config-registry.ts';

async function runFinalDenoEvaluation() {
  console.log('================================================================================');
  console.log('🦕  PRD-M-013.3 — FINAL DENO 2.9.5 EDGE RUNTIME EVALUATION (170 CASES)');
  console.log('================================================================================\n');

  const datasetUrl = new URL('./fixtures/m013-final-eval-170.json', import.meta.url);
  const text = await Deno.readTextFile(datasetUrl);
  const cases = JSON.parse(text);

  console.log(`Cargados ${cases.length} casos finales en Deno.\n`);

  const expectedFingerprint = '53c7fe14e0534d387fa90fb34d19e797847770eeab1acc5e6eedc0dde8af92fa';
  const runtimeFingerprint = M013SafetyConfigRegistry.getCompositeSafetyModelEvidence().m013_safety_model_sha256;

  if (runtimeFingerprint !== expectedFingerprint) {
    console.error(`❌ Mismatch de fingerprint en Deno: esperado ${expectedFingerprint}, obtenido ${runtimeFingerprint}`);
    Deno.exit(1);
  }

  const splits: Record<string, { total: number; passed: number }> = {
    TRAINING: { total: 0, passed: 0 },
    VALIDATION: { total: 0, passed: 0 },
    FINAL_HOLDOUT: { total: 0, passed: 0 }
  };

  const latencies: number[] = [];

  for (const c of cases) {
    splits[c.split].total++;
    const t0 = performance.now();
    let response = null;
    let caughtError = null;

    try {
      response = M013SafetyEngine.execute(c.request);
    } catch (err) {
      caughtError = err;
    }
    const t1 = performance.now();
    latencies.push(t1 - t0);

    let caseSuccess = false;

    if (c.expected.success) {
      const okResp = response !== null && response.success === true;
      const okWo = response && response.work_order_id === c.expected.work_order_id;
      const okAsset = response && response.asset_id === c.expected.asset_id;
      const okStatus = response && response.package.status === c.expected.safety_status;
      const okBlocked = response && response.package.is_blocked === c.expected.is_blocked;
      const okComplete = response && response.package.controls_complete === c.expected.controls_complete;
      const okZeroAI = response && response.telemetry.llm_calls === 0 && response.telemetry.tokens === 0 && response.telemetry.cost_usd === 0;

      caseSuccess = okResp && okWo && okAsset && okStatus && okBlocked && okComplete && okZeroAI;
    } else {
      const okError = caughtError !== null;
      let okMessage = true;
      if (c.expected.error_contains && caughtError) {
        okMessage = (caughtError as any).message.includes(c.expected.error_contains);
      }
      caseSuccess = okError && okMessage;
    }

    if (caseSuccess) {
      splits[c.split].passed++;
    } else {
      console.error(`❌ Falló caso ${c.case_id} (${c.split}) en Deno Runtime`);
    }
  }

  latencies.sort((a, b) => a - b);
  const avgLatency = (latencies.reduce((acc, v) => acc + v, 0) / latencies.length).toFixed(3);
  const medianLatency = latencies[Math.floor(latencies.length / 2)].toFixed(3);
  const p95Latency = latencies[Math.floor(latencies.length * 0.95)].toFixed(3);

  console.log('================================================================================');
  console.log('📊 RESUMEN FINAL DE CERTIFICACIÓN DENO EDGE RUNTIME M-013.3:');
  console.log(`   - Training Split   (102 casos): ${splits.TRAINING.passed} / ${splits.TRAINING.total} PASS (${((splits.TRAINING.passed/splits.TRAINING.total)*100).toFixed(2)}%)`);
  console.log(`   - Validation Split  (34 casos):  ${splits.VALIDATION.passed} / ${splits.VALIDATION.total} PASS (${((splits.VALIDATION.passed/splits.VALIDATION.total)*100).toFixed(2)}%)`);
  console.log(`   - Final Holdout     (34 casos):  ${splits.FINAL_HOLDOUT.passed} / ${splits.FINAL_HOLDOUT.total} PASS (${((splits.FINAL_HOLDOUT.passed/splits.FINAL_HOLDOUT.total)*100).toFixed(2)}%)`);
  console.log(`   - Total Casos Evaluados:        ${cases.length} / 170`);
  console.log(`   - Latencia Promedio Deno:       ${avgLatency} ms/caso`);
  console.log(`   - Latencia Mediana Deno:        ${medianLatency} ms`);
  console.log(`   - Latencia P95 Deno:            ${p95Latency} ms`);
  console.log(`   - Composite Fingerprint Deno:   ${runtimeFingerprint}`);
  console.log('================================================================================');

  const allPass =
    splits.TRAINING.passed === 102 &&
    splits.VALIDATION.passed === 34 &&
    splits.FINAL_HOLDOUT.passed === 34;

  if (allPass) {
    console.log('🏆 VEREDICTO DENO EDGE RUNTIME: DENO_EDGE_RUNTIME_TEST = PASS ✅\n');
  } else {
    console.error('❌ VEREDICTO DENO EDGE RUNTIME: FAILED\n');
    Deno.exit(1);
  }
}

runFinalDenoEvaluation().catch(err => {
  console.error('Error fatal en Deno Runtime Final:', err);
  Deno.exit(1);
});
