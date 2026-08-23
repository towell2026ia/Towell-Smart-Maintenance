// supabase/functions/agents-orchestrator/agents/ag013/tests/run_ag013_3_deno_runtime_eval.ts
// Deno 2.9.5 Edge Runtime Semantic Evaluation Suite for AG-013 Analista de Malos Actores v1.0
// Target: DENO_EDGE_RUNTIME_TEST = PASS (§117-118, §160 PRD-AG-013.3)

import { AG013BadActorEngine } from '../core/ag013-bad-actor-engine.ts';
import { AG013SemanticCoordinator } from '../semantic/ag013-semantic-coordinator.ts';
import { AG013SemanticConfigRegistry } from '../config/ag013-semantic-config-registry.ts';

let totalCases = 0;
let passedCases = 0;
let failedCases = 0;

async function runDenoSemanticEvaluation() {
  console.log('================================================================================');
  console.log('🦕 PRD-AG-013.3 — DENO 2.9.5 EDGE RUNTIME SEMANTIC EVALUATION (60 CASOS)');
  console.log('================================================================================\n');

  const datasetRaw = await Deno.readTextFile(new URL('./fixtures/ag013-sem-eval-60.json', import.meta.url));
  const dataset = JSON.parse(datasetRaw);

  const evidence = AG013SemanticConfigRegistry.getSemanticModelEvidence();
  const CERTIFIED_UPSTREAM_SHA = evidence.upstream_bad_actor_sha256;

  console.log(`📦 Casos Cargados en Deno: ${dataset.length}`);
  console.log(`🔒 Upstream Bad Actor SHA: ${CERTIFIED_UPSTREAM_SHA}`);
  console.log(`🔒 Semantic Model SHA:     ${evidence.ag013_semantic_model_sha256}\n`);

  for (const c of dataset) {
    totalCases++;
    try {
      const detRes = AG013BadActorEngine.execute(c.request);
      const semRes = await AG013SemanticCoordinator.explain(
        detRes.package,
        CERTIFIED_UPSTREAM_SHA,
        undefined,
        c.expected.mock_output
      );

      const orig = detRes.package.results[0];
      const merged = semRes.merged_package.results[0];

      if (
        semRes.merged_package.semantic_explanation &&
        merged.classification === orig.classification &&
        merged.rank === orig.rank &&
        merged.bad_actor_score === orig.bad_actor_score
      ) {
        passedCases++;
      } else {
        failedCases++;
        console.error(`  ❌ [FAIL] [${c.case_id}] Deno semantic verification mismatch`);
      }
    } catch (err: any) {
      failedCases++;
      console.error(`  ❌ [FAIL] [${c.case_id}] Deno semantic runtime error: ${err.message}`);
    }
  }

  console.log('================================================================================');
  console.log('📊 RESUMEN DE EVALUACIÓN DENO 2.9.5 EDGE RUNTIME:');
  console.log(`   - Total Casos Evaluados:        ${totalCases}`);
  console.log(`   - Casos Aprobados (PASS):       ${passedCases} (${((passedCases/totalCases)*100).toFixed(2)}%)`);
  console.log(`   - Casos Fallidos:               ${failedCases}`);
  console.log('================================================================================');

  if (passedCases === totalCases && failedCases === 0) {
    console.log('🏆 VEREDICTO DENO EDGE RUNTIME: DENO_EDGE_RUNTIME_TEST = PASS ✅\n');
  } else {
    console.error('❌ VEREDICTO DENO EDGE RUNTIME: FAILED\n');
    Deno.exit(1);
  }
}

runDenoSemanticEvaluation().catch(err => {
  console.error('Error fatal en Deno semantic evaluation AG-013.3:', err);
  Deno.exit(1);
});
