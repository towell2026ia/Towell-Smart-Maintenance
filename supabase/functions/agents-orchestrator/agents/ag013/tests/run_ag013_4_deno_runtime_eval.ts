// supabase/functions/agents-orchestrator/agents/ag013/tests/run_ag013_4_deno_runtime_eval.ts
// Deno 2.9.5 Edge Runtime Master Evaluation Suite for AG-013 Analista de Malos Actores v1.0
// Dataset: AG013-EVAL-001 (170 Cases) | Target: DENO_EDGE_RUNTIME_TEST = PASS (§109-110, §129 PRD-AG-013.4)

import { executeAG013 } from '../ag013-executor.ts';
import { AG013BadActorConfigRegistry } from '../config/ag013-bad-actor-config-registry.ts';
import { AG013SemanticConfigRegistry } from '../config/ag013-semantic-config-registry.ts';

let totalCases = 0;
let passedCases = 0;
let failedCases = 0;

async function runDenoMasterEvaluation() {
  console.log('================================================================================');
  console.log('🦕 PRD-AG-013.4 — DENO 2.9.5 EDGE RUNTIME MASTER EVALUATION (170 CASOS)');
  console.log('================================================================================\n');

  const datasetRaw = await Deno.readTextFile(new URL('./fixtures/ag013-eval-170.json', import.meta.url));
  const dataset = JSON.parse(datasetRaw);

  const detEvidence = AG013BadActorConfigRegistry.getCompositeDecisionModelEvidence();
  const semEvidence = AG013SemanticConfigRegistry.getSemanticModelEvidence();

  const CERTIFIED_DET_SHA = detEvidence.ag013_bad_actor_model_sha256;
  const CERTIFIED_SEM_SHA = semEvidence.ag013_semantic_model_sha256;

  console.log(`📦 Casos Cargados en Deno: ${dataset.length}`);
  console.log(`🔒 Deterministic Model SHA: ${CERTIFIED_DET_SHA}`);
  console.log(`🔒 Semantic Model SHA:     ${CERTIFIED_SEM_SHA}\n`);

  for (const c of dataset) {
    totalCases++;
    try {
      const resp = await executeAG013({
        ...c.request,
        mock_semantic_response: c.expected.mock_output
      });

      const orig = c.expected;
      const targetAsset = resp.package.results[0];

      if (
        resp.fingerprints.bad_actor_model_sha256 === CERTIFIED_DET_SHA &&
        resp.fingerprints.semantic_model_sha256 === CERTIFIED_SEM_SHA &&
        targetAsset.classification === orig.classification &&
        targetAsset.rank === orig.rank
      ) {
        passedCases++;
      } else {
        failedCases++;
        console.error(`  ❌ [FAIL] [${c.case_id}] Deno master verification mismatch`);
      }
    } catch (err: any) {
      failedCases++;
      console.error(`  ❌ [FAIL] [${c.case_id}] Deno master runtime error: ${err.message}`);
    }
  }

  console.log('================================================================================');
  console.log('📊 RESUMEN DE EVALUACIÓN MAESTRA DENO 2.9.5 EDGE RUNTIME:');
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

runDenoMasterEvaluation().catch(err => {
  console.error('Error fatal en Deno master evaluation AG-013.4:', err);
  Deno.exit(1);
});
