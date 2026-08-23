// supabase/functions/agents-orchestrator/agents/ag012/tests/run_ag012_2_deno_runtime_eval.ts
// Deno 2.9.5 Edge Runtime Evaluation Suite for AG-012 (224 Cases)
// Invariant: DENO_EDGE_RUNTIME_TEST = PASS (§172-174 PRD-AG-012.2)

import { AG012DecisionEngine } from '../core/ag012-decision-engine.ts';
import { AG012DecisionConfigRegistry } from '../config/ag012-decision-config-registry.ts';

async function runDenoEvaluation() {
  console.log('================================================================================');
  console.log('🦕  PRD-AG-012.2 — DENO 2.9.5 EDGE RUNTIME EVALUATION (224 CASES)');
  console.log('================================================================================\n');

  const datasetUrl = new URL('./fixtures/ag012-det-eval-001.json', import.meta.url);
  const text = await Deno.readTextFile(datasetUrl);
  const cases = JSON.parse(text);

  console.log(`Cargados ${cases.length} casos determinísticos en Deno.\n`);

  const expectedFingerprint = 'c07710378546100616f1394fe558be2d18fb29c9e20d8ceeac710cc472b3a1b8';
  const runtimeFingerprint = AG012DecisionConfigRegistry.getCompositeDecisionModelEvidence().ag012_decision_model_sha256;

  if (runtimeFingerprint !== expectedFingerprint) {
    console.error(`❌ Mismatch de fingerprint en Deno: esperado ${expectedFingerprint}, obtenido ${runtimeFingerprint}`);
    Deno.exit(1);
  }

  let passedCases = 0;
  const latencies: number[] = [];

  for (const c of cases) {
    const t0 = performance.now();
    let response = null;
    let caughtError = null;

    try {
      response = AG012DecisionEngine.execute(c.request);
    } catch (err) {
      caughtError = err;
    }
    const t1 = performance.now();
    latencies.push(t1 - t0);

    let caseSuccess = false;

    if (c.expected.success) {
      const okResp = response !== null && response.success === true;
      const okAsset = response && response.asset_id === c.expected.asset_id;
      const okRec = response && response.package.recommendation === c.expected.recommendation;
      const okAppr = response && response.package.requires_human_approval === true;
      const okZeroAI = response && response.telemetry.llm_calls === 0 && response.telemetry.tokens === 0 && response.telemetry.cost_usd === 0;

      caseSuccess = okResp && okAsset && okRec && okAppr && okZeroAI;
    } else {
      const okError = caughtError !== null;
      let okMessage = true;
      if (c.expected.error_contains && caughtError) {
        okMessage = (caughtError as any).message.includes(c.expected.error_contains);
      }
      caseSuccess = okError && okMessage;
    }

    if (caseSuccess) {
      passedCases++;
    } else {
      console.error(`❌ Falló caso ${c.case_id} (${c.group}) en Deno Runtime`);
    }
  }

  latencies.sort((a, b) => a - b);
  const avgLatency = (latencies.reduce((acc, v) => acc + v, 0) / latencies.length).toFixed(3);
  const medianLatency = latencies[Math.floor(latencies.length / 2)].toFixed(3);
  const p95Latency = latencies[Math.floor(latencies.length * 0.95)].toFixed(3);

  console.log('================================================================================');
  console.log('📊 RESUMEN DE CERTIFICACIÓN DENO EDGE RUNTIME AG-012.2:');
  console.log(`   - Casos Evaluados:          ${cases.length} / 224`);
  console.log(`   - Casos Aprobados (PASS):   ${passedCases} / ${cases.length} (${((passedCases/cases.length)*100).toFixed(2)}%)`);
  console.log(`   - Latencia Promedio Deno:   ${avgLatency} ms/caso`);
  console.log(`   - Latencia Mediana Deno:    ${medianLatency} ms`);
  console.log(`   - Latencia P95 Deno:        ${p95Latency} ms`);
  console.log(`   - Composite Fingerprint:    ${runtimeFingerprint}`);
  console.log('================================================================================');

  if (passedCases === cases.length) {
    console.log('🏆 VEREDICTO DENO EDGE RUNTIME: DENO_EDGE_RUNTIME_TEST = PASS ✅\n');
  } else {
    console.error('❌ VEREDICTO DENO EDGE RUNTIME: FAILED\n');
    Deno.exit(1);
  }
}

runDenoEvaluation().catch(err => {
  console.error('Error fatal en Deno Runtime:', err);
  Deno.exit(1);
});
