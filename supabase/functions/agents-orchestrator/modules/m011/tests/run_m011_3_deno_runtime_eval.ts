// supabase/functions/agents-orchestrator/modules/m011/tests/run_m011_3_deno_runtime_eval.ts
// Real Deno Edge Runtime Final E2E Suite for M-011 (v1.0)
// Target: DENO_EDGE_RUNTIME_TEST = PASS

import { HealthRiskEngine } from '../core/health-risk-engine.ts';
import { ScoringConfigRegistry } from '../config/m011-scoring-config-registry.ts';

const EXPECTED_MODEL_SHA256 = '7bfff017f4564e8ab395ec612cb39a4c2274113be9f4555ece08bd25a6da4c40';

async function runDenoFinalE2EEvaluation() {
  console.log('================================================================================');
  console.log(`🦕 DENO RUNTIME FINAL E2E SUITE: M-011 (Deno v${Deno.version.deno})`);
  console.log('================================================================================\n');

  // 1. Preflight Hash
  const compositeEvidence = ScoringConfigRegistry.getCompositeModelEvidence();
  console.log(`1. Runtime Model Hash: ${compositeEvidence.m011_model_sha256}`);
  if (compositeEvidence.m011_model_sha256 !== EXPECTED_MODEL_SHA256) {
    console.error('❌ Mismatch in Deno runtime composite model hash!');
    Deno.exit(1);
  }
  console.log('   ✅ Composite Model Hash Match = PASS\n');

  // 2. Read Dataset
  const datasetText = await Deno.readTextFile('supabase/functions/agents-orchestrator/modules/m011/tests/fixtures/m011-final-eval-170.json');
  const dataset = JSON.parse(datasetText);
  console.log(`2. Dataset cargado: ${dataset.total_cases} casos.\n`);

  // 3. Evaluate 170 cases in Deno
  console.log('3. Ejecutando 170 evaluaciones determinísticas en Deno...');
  let passedCount = 0;
  const startTime = Date.now();

  for (const testCase of dataset.cases) {
    const res = await HealthRiskEngine.evaluateAssetHealthAndRisk({
      request_id: `DENO-${testCase.case_id}`,
      context: testCase.context,
      evaluation_at: testCase.evaluation_at
    });

    let pass = true;
    if (!res.success) pass = false;
    if (res.asset_id !== testCase.context.asset_id) pass = false;
    if (res.m011_model_sha256 !== EXPECTED_MODEL_SHA256) pass = false;

    if (testCase.expected.requires_null_score) {
      if (res.health.health_score !== null || res.health.health_state !== 'INSUFFICIENT_DATA') pass = false;
      if (res.risk.risk_score !== null || res.risk.risk_state !== 'INSUFFICIENT_DATA') pass = false;
    } else {
      if (res.health.health_score === null || res.health.health_state === 'INSUFFICIENT_DATA') pass = false;
      if (res.risk.risk_score === null || res.risk.risk_state === 'INSUFFICIENT_DATA') pass = false;
    }

    if (pass) passedCount++;
  }

  const elapsedMs = Date.now() - startTime;
  console.log(`   - Casos Evaluados: ${dataset.cases.length}`);
  console.log(`   - Casos Aprobados: ${passedCount} / ${dataset.cases.length} (${((passedCount/dataset.cases.length)*100).toFixed(2)}%)`);
  console.log(`   - Tiempo Total:    ${elapsedMs}ms (${(elapsedMs/dataset.cases.length).toFixed(2)}ms / caso)\n`);

  if (passedCount === 170) {
    console.log('🏆 VEREDICTO DENO RUNTIME: DENO_EDGE_RUNTIME_TEST = PASS ✅\n');
  } else {
    console.error('❌ VEREDICTO DENO RUNTIME: FAILED');
    Deno.exit(1);
  }
}

runDenoFinalE2EEvaluation().catch(err => {
  console.error('Error fatal en Deno runtime evaluation:', err);
  Deno.exit(1);
});
