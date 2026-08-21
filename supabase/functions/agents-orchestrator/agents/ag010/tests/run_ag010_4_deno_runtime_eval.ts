// supabase/functions/agents-orchestrator/agents/ag010/tests/run_ag010_4_deno_runtime_eval.ts
// Real Deno Edge Runtime Evaluation Suite for AG-010.4 (170 Cases)
// Target: DENO_EDGE_RUNTIME_TEST = PASS

import { executeAG010 } from '../ag010-executor.ts';

const EXPECTED_RETRIEVAL_SHA = 'cd98352d83be94a860bf6fe75a4cac1a2d700cb16d771e5c3890260b41fc43ee';
const EXPECTED_SEMANTIC_SHA = 'f982ae8f0595caa2fd98c999ad75262472183b33773b46f6d6bd91ddeac26998';

async function runDenoFinalE2EEvaluation() {
  console.log('================================================================================');
  console.log(`🦕 DENO RUNTIME FINAL E2E SUITE: AG-010 (Deno v${Deno.version.deno})`);
  console.log('================================================================================\n');

  // 1. Load Dataset
  const datasetText = await Deno.readTextFile('supabase/functions/agents-orchestrator/agents/ag010/tests/fixtures/ag010-final-eval-170.json');
  const dataset = JSON.parse(datasetText);
  console.log(`1. Dataset cargado: ${dataset.total_cases} casos.\n`);

  // 2. Execute all 170 cases in Deno
  console.log('2. Ejecutando 170 evaluaciones E2E en Deno...');
  let passedCount = 0;
  const startTime = Date.now();

  for (const testCase of dataset.cases) {
    const res = await executeAG010({
      request_id: `DENO-E2E-${testCase.case_id}`,
      asset_id: testCase.asset_id,
      problem_statement: testCase.problem_statement,
      evaluation_at: testCase.evaluation_at,
      m010_context: testCase.m010_context,
      ag008_context: testCase.ag008_context,
      m011_context: testCase.m011_context,
      mock_response: testCase.mock_response
    });

    let pass = true;
    if (!res.success) pass = false;
    if (res.agent_id !== 'AG-010') pass = false;
    if (res.version !== '1.0') pass = false;
    if (res.asset_id !== testCase.asset_id) pass = false;
    if (res.fingerprints.retrieval_model_sha256 !== EXPECTED_RETRIEVAL_SHA) pass = false;
    if (res.fingerprints.semantic_model_sha256 !== EXPECTED_SEMANTIC_SHA) pass = false;
    if (res.output.five_whys.length > 5) pass = false;
    if (res.output.requires_human_validation !== true) pass = false;

    // Check zero AI confirmed root causes
    for (const cand of res.output.root_cause_candidates) {
      if (cand.status === 'CONFIRMED') pass = false;
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
  console.error('Error fatal en Deno final evaluation:', err);
  Deno.exit(1);
});
