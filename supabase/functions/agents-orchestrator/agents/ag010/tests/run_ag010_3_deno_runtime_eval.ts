// supabase/functions/agents-orchestrator/agents/ag010/tests/run_ag010_3_deno_runtime_eval.ts
// Real Deno Edge Runtime Evaluation Suite for AG-010.3 (v1.0)
// Target: DENO_EDGE_RUNTIME_TEST = PASS

import { AG010SemanticLayer, EXPECTED_RETRIEVAL_MODEL_SHA256 } from '../core/ag010-semantic-layer.ts';

async function runDenoSemanticEvaluation() {
  console.log('================================================================================');
  console.log(`🦕 DENO RUNTIME SUITE: AG-010.3 (Deno v${Deno.version.deno})`);
  console.log('================================================================================\n');

  // 1. Load Dataset
  const datasetText = await Deno.readTextFile('supabase/functions/agents-orchestrator/agents/ag010/tests/fixtures/ag010-sem-eval-001.json');
  const dataset = JSON.parse(datasetText);
  console.log(`1. Dataset cargado: ${dataset.total_cases} casos.\n`);

  // 2. Execute all 60 cases in Deno
  console.log('2. Ejecutando 60 evaluaciones semánticas en Deno...');
  let passedCount = 0;
  const startTime = Date.now();

  for (const testCase of dataset.cases) {
    const res = await AG010SemanticLayer.interpretEvidence({
      request_id: `DENO-${testCase.case_id}`,
      evidence_package: testCase.evidence_package,
      retrieval_model_sha256: testCase.retrieval_model_sha256,
      mock_response: testCase.mock_response
    });

    let pass = true;
    if (!res.success) pass = false;
    if (res.agent_id !== 'AG-010') pass = false;
    if (res.output.case_id !== testCase.case_id) pass = false;
    if (res.output.asset_id !== testCase.asset_id) pass = false;
    if (res.output.five_whys.length > 5) pass = false;
    if (res.output.requires_human_validation !== true) pass = false;

    // Check no AI confirmed root causes
    for (const cand of res.output.root_cause_candidates) {
      if (cand.status === 'CONFIRMED') pass = false;
    }

    if (pass) passedCount++;
  }

  const elapsedMs = Date.now() - startTime;
  console.log(`   - Casos Evaluados: ${dataset.cases.length}`);
  console.log(`   - Casos Aprobados: ${passedCount} / ${dataset.cases.length} (${((passedCount/dataset.cases.length)*100).toFixed(2)}%)`);
  console.log(`   - Tiempo Total:    ${elapsedMs}ms (${(elapsedMs/dataset.cases.length).toFixed(2)}ms / caso)\n`);

  if (passedCount === 60) {
    console.log('🏆 VEREDICTO DENO RUNTIME: DENO_EDGE_RUNTIME_TEST = PASS ✅\n');
  } else {
    console.error('❌ VEREDICTO DENO RUNTIME: FAILED');
    Deno.exit(1);
  }
}

runDenoSemanticEvaluation().catch(err => {
  console.error('Error fatal en Deno semantic evaluation:', err);
  Deno.exit(1);
});
