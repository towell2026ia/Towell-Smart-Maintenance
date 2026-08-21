// supabase/functions/agents-orchestrator/agents/ag010/tests/run_ag010_2_deno_runtime_eval.ts
// Real Deno Edge Runtime Evaluation Suite for AG-010.2 (v1.0)
// Target: DENO_EDGE_RUNTIME_TEST = PASS

import { AG010RetrievalEngine } from '../core/ag010-retrieval-engine.ts';
import { AG010RetrievalConfigRegistry } from '../config/ag010-retrieval-config-registry.ts';

const EXPECTED_RETRIEVAL_MODEL_SHA256 = 'cd98352d83be94a860bf6fe75a4cac1a2d700cb16d771e5c3890260b41fc43ee';

async function runDenoRetrievalEvaluation() {
  console.log('================================================================================');
  console.log(`🦕 DENO RUNTIME SUITE: AG-010.2 (Deno v${Deno.version.deno})`);
  console.log('================================================================================\n');

  // 1. Preflight Composite Model Hash
  const compositeModel = AG010RetrievalConfigRegistry.getCompositeModelEvidence();
  console.log(`1. Runtime Model Hash: ${compositeModel.ag010_retrieval_model_sha256}`);
  if (compositeModel.ag010_retrieval_model_sha256 !== EXPECTED_RETRIEVAL_MODEL_SHA256) {
    console.error('❌ Mismatch in Deno runtime retrieval model hash!');
    Deno.exit(1);
  }
  console.log('   ✅ Composite Model Hash Match = PASS\n');

  // 2. Load Dataset
  const datasetText = await Deno.readTextFile('supabase/functions/agents-orchestrator/agents/ag010/tests/fixtures/ag010-det-eval-001.json');
  const dataset = JSON.parse(datasetText);
  console.log(`2. Dataset cargado: ${dataset.total_cases} casos.\n`);

  // 3. Execute all cases in Deno
  console.log('3. Ejecutando 172 evaluaciones determinísticas en Deno...');
  let passedCount = 0;
  const startTime = Date.now();

  for (const testCase of dataset.cases) {
    const res = await AG010RetrievalEngine.execute({
      request_id: `DENO-${testCase.case_id}`,
      asset_id: testCase.asset_id,
      problem_statement: testCase.problem_statement,
      evaluation_at: testCase.evaluation_at,
      m010_context: testCase.m010_context,
      ag008_context: testCase.ag008_context,
      m011_context: testCase.m011_context
    });

    let pass = true;
    if (!res.success) pass = false;
    if (res.agent_id !== 'AG-010') pass = false;
    if (res.asset_id !== testCase.asset_id) pass = false;
    if (res.ag010_retrieval_model_sha256 !== EXPECTED_RETRIEVAL_MODEL_SHA256) pass = false;
    if (!Array.isArray(res.evidence_package.certified_facts)) pass = false;
    if (!Array.isArray(res.evidence_package.previous_cases)) pass = false;

    if (pass) passedCount++;
  }

  const elapsedMs = Date.now() - startTime;
  console.log(`   - Casos Evaluados: ${dataset.cases.length}`);
  console.log(`   - Casos Aprobados: ${passedCount} / ${dataset.cases.length} (${((passedCount/dataset.cases.length)*100).toFixed(2)}%)`);
  console.log(`   - Tiempo Total:    ${elapsedMs}ms (${(elapsedMs/dataset.cases.length).toFixed(2)}ms / caso)\n`);

  if (passedCount === 172) {
    console.log('🏆 VEREDICTO DENO RUNTIME: DENO_EDGE_RUNTIME_TEST = PASS ✅\n');
  } else {
    console.error('❌ VEREDICTO DENO RUNTIME: FAILED');
    Deno.exit(1);
  }
}

runDenoRetrievalEvaluation().catch(err => {
  console.error('Error fatal en Deno retrieval evaluation:', err);
  Deno.exit(1);
});
