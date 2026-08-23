// supabase/functions/agents-orchestrator/agents/ag012/tests/run_ag012_4_deno_runtime_eval.ts
// Deno 2.9.5 Edge Runtime Master E2E Evaluation Suite for AG-012 (170 Cases)
// Invariant: DENO_EDGE_RUNTIME_TEST = PASS (§98-99 PRD-AG-012.4)

import { executeAG012 } from '../ag012-executor.ts';
import { AG012DecisionConfigRegistry } from '../config/ag012-decision-config-registry.ts';
import { AG012SemanticConfigRegistry } from '../config/ag012-semantic-config-registry.ts';

async function runDenoMasterE2EEvaluation() {
  console.log('================================================================================');
  console.log('🦕  PRD-AG-012.4 — DENO 2.9.5 EDGE RUNTIME MASTER E2E EVALUATION (170 CASES)');
  console.log('================================================================================\n');

  const datasetUrl = new URL('./fixtures/ag012-final-eval-170.json', import.meta.url);
  const text = await Deno.readTextFile(datasetUrl);
  const allCases = JSON.parse(text);

  console.log(`Cargados ${allCases.length} casos finales E2E en Deno.\n`);

  const decisionSha = AG012DecisionConfigRegistry.getCompositeDecisionModelEvidence().ag012_decision_model_sha256;
  const semanticSha = AG012SemanticConfigRegistry.getSemanticModelEvidence().ag012_semantic_model_sha256;

  const expectedDecisionSha = 'c07710378546100616f1394fe558be2d18fb29c9e20d8ceeac710cc472b3a1b8';
  const expectedSemanticSha = 'dec63905dbe96e42f8b48ace9be6fc183321073e1a3f23890009dc820e938c42';

  if (decisionSha !== expectedDecisionSha || semanticSha !== expectedSemanticSha) {
    console.error('❌ Mismatch de hashes en Deno Runtime');
    Deno.exit(1);
  }

  let passedCases = 0;
  const latencies: number[] = [];

  for (const c of allCases) {
    const t0 = performance.now();
    let response = null;
    let caughtError = null;

    try {
      response = await executeAG012({
        ...c.request,
        mock_semantic_response: c.mock_semantic_response
      });
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
      const okProtected = response && response.package.decision_scores.length === 5;

      caseSuccess = okResp && okAsset && okRec && okAppr && okProtected;
    } else {
      const okError = caughtError !== null;
      let okMsg = true;
      if (c.expected.error_contains && caughtError) {
        okMsg = (caughtError as any).message.includes(c.expected.error_contains);
      }
      caseSuccess = okError && okMsg;
    }

    if (caseSuccess) {
      passedCases++;
    } else {
      console.error(`❌ Falló caso ${c.case_id} (${c.group}) en Deno Master Runtime`);
    }
  }

  latencies.sort((a, b) => a - b);
  const avgLatency = (latencies.reduce((acc, v) => acc + v, 0) / latencies.length).toFixed(3);
  const medianLatency = latencies[Math.floor(latencies.length / 2)].toFixed(3);
  const p95Latency = latencies[Math.floor(latencies.length * 0.95)].toFixed(3);

  console.log('================================================================================');
  console.log('📊 RESUMEN DE CERTIFICACIÓN DENO EDGE RUNTIME MASTER E2E AG-012.4:');
  console.log(`   - Casos Evaluados:          ${allCases.length} / 170`);
  console.log(`   - Casos Aprobados (PASS):   ${passedCases} / ${allCases.length} (${((passedCases/allCases.length)*100).toFixed(2)}%)`);
  console.log(`   - Latencia Promedio Deno:   ${avgLatency} ms/caso`);
  console.log(`   - Latencia Mediana Deno:    ${medianLatency} ms`);
  console.log(`   - Latencia P95 Deno:        ${p95Latency} ms`);
  console.log(`   - Decision Model SHA-256:   ${decisionSha}`);
  console.log(`   - Semantic Model SHA-256:   ${semanticSha}`);
  console.log('================================================================================');

  if (passedCases === allCases.length) {
    console.log('🏆 VEREDICTO DENO MASTER E2E: DENO_EDGE_RUNTIME_TEST = PASS ✅\n');
  } else {
    console.error('❌ VEREDICTO DENO MASTER E2E: FAILED\n');
    Deno.exit(1);
  }
}

runDenoMasterE2EEvaluation().catch(err => {
  console.error('Error fatal en Deno Master E2E Runtime:', err);
  Deno.exit(1);
});
