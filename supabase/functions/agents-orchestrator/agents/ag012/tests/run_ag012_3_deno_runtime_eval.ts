// supabase/functions/agents-orchestrator/agents/ag012/tests/run_ag012_3_deno_runtime_eval.ts
// Deno 2.9.5 Edge Runtime Evaluation Suite for AG-012 Semantic Layer (v1.0)
// Invariant: DENO_EDGE_RUNTIME_TEST = PASS (§105-106 PRD-AG-012.3)

import { AG012SemanticCoordinator } from '../semantic/ag012-semantic-coordinator.ts';
import { AG012SemanticConfigRegistry } from '../config/ag012-semantic-config-registry.ts';

async function runDenoSemanticEvaluation() {
  console.log('================================================================================');
  console.log('🦕  PRD-AG-012.3 — DENO 2.9.5 EDGE RUNTIME SEMANTIC EVALUATION (60 CASES)');
  console.log('================================================================================\n');

  const datasetUrl = new URL('./fixtures/ag012-sem-eval-001.json', import.meta.url);
  const text = await Deno.readTextFile(datasetUrl);
  const cases = JSON.parse(text);

  console.log(`Cargados ${cases.length} casos semánticos en Deno.\n`);

  const semEvidence = AG012SemanticConfigRegistry.getSemanticModelEvidence();
  const expectedSha = 'dec63905dbe96e42f8b48ace9be6fc183321073e1a3f23890009dc820e938c42';

  if (semEvidence.ag012_semantic_model_sha256 !== expectedSha) {
    console.error(`❌ Mismatch de hash semántico en Deno: esperado ${expectedSha}, obtenido ${semEvidence.ag012_semantic_model_sha256}`);
    Deno.exit(1);
  }

  let passedCases = 0;
  const latencies: number[] = [];

  for (const c of cases) {
    const t0 = performance.now();
    let result = null;
    let caughtError = null;

    try {
      result = await AG012SemanticCoordinator.explain(
        c.deterministic_package,
        c.upstream_sha256,
        'DOCK_KEY',
        c.mock_response
      );
    } catch (err) {
      caughtError = err;
    }
    const t1 = performance.now();
    latencies.push(t1 - t0);

    let caseSuccess = false;

    if (c.expected.success) {
      const okRes = result !== null && result.merged_package !== undefined;
      const okEcho = result && result.merged_package.recommendation === c.expected.recommendation;
      const okProtected = result && result.merged_package.decision_scores.length === c.deterministic_package.decision_scores.length;

      caseSuccess = okRes && okEcho && okProtected;
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
      console.error(`❌ Falló caso ${c.case_id} (${c.split}) en Deno Semantic Runtime`);
    }
  }

  latencies.sort((a, b) => a - b);
  const avgLatency = (latencies.reduce((acc, v) => acc + v, 0) / latencies.length).toFixed(3);
  const medianLatency = latencies[Math.floor(latencies.length / 2)].toFixed(3);
  const p95Latency = latencies[Math.floor(latencies.length * 0.95)].toFixed(3);

  console.log('================================================================================');
  console.log('📊 RESUMEN DE CERTIFICACIÓN SEMÁNTICA DENO EDGE RUNTIME AG-012.3:');
  console.log(`   - Casos Evaluados:          ${cases.length} / 60`);
  console.log(`   - Casos Aprobados (PASS):   ${passedCases} / ${cases.length} (${((passedCases/cases.length)*100).toFixed(2)}%)`);
  console.log(`   - Latencia Promedio Deno:   ${avgLatency} ms/caso`);
  console.log(`   - Latencia Mediana Deno:    ${medianLatency} ms`);
  console.log(`   - Latencia P95 Deno:        ${p95Latency} ms`);
  console.log(`   - Semantic Model SHA-256:   ${semEvidence.ag012_semantic_model_sha256}`);
  console.log('================================================================================');

  if (passedCases === cases.length) {
    console.log('🏆 VEREDICTO DENO SEMÁNTICO: DENO_EDGE_RUNTIME_TEST = PASS ✅\n');
  } else {
    console.error('❌ VEREDICTO DENO SEMÁNTICO: FAILED\n');
    Deno.exit(1);
  }
}

runDenoSemanticEvaluation().catch(err => {
  console.error('Error fatal en Deno Semantic Runtime:', err);
  Deno.exit(1);
});
