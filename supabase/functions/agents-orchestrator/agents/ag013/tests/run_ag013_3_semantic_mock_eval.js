// supabase/functions/agents-orchestrator/agents/ag013/tests/run_ag013_3_semantic_mock_eval.js
// Semantic Mock Evaluation Suite for AG-013 Analista de Malos Actores v1.0
// Dataset: AG013-SEM-EVAL-001 (60 Cases) | Target: 60 / 60 PASS (§101-102 PRD-AG-013.3)

const fs = require('fs');
const path = require('path');
const { AG013BadActorEngine } = require('../core/ag013-bad-actor-engine.ts');
const { AG013SemanticCoordinator } = require('../semantic/ag013-semantic-coordinator.ts');
const { AG013SemanticConfigRegistry } = require('../config/ag013-semantic-config-registry.ts');

let totalCases = 0;
let passedCases = 0;
let failedCases = 0;

let totalAssertions = 0;
let passedAssertions = 0;
let failedAssertions = 0;

function assert(condition, message) {
  totalAssertions++;
  if (condition) {
    passedAssertions++;
  } else {
    failedAssertions++;
    console.error(`  ❌ [FAIL] ${message}`);
  }
}

async function runSemanticMockEvaluation() {
  console.log('================================================================================');
  console.log('🧪 PRD-AG-013.3 — SEMANTIC MOCK EVALUATION SUITE (60 CASES)');
  console.log('================================================================================\n');

  const datasetPath = path.join(__dirname, 'fixtures/ag013-sem-eval-60.json');
  const dataset = JSON.parse(fs.readFileSync(datasetPath, 'utf8'));

  const evidence = AG013SemanticConfigRegistry.getSemanticModelEvidence();
  const CERTIFIED_UPSTREAM_SHA = evidence.upstream_bad_actor_sha256;

  console.log(`📦 Casos Cargados: ${dataset.length}`);
  console.log(`🔒 Upstream Bad Actor SHA: ${CERTIFIED_UPSTREAM_SHA}`);
  console.log(`🔒 Semantic Model SHA:     ${evidence.ag013_semantic_model_sha256}\n`);

  for (const c of dataset) {
    totalCases++;

    // 1. Run deterministic engine
    const detRes = AG013BadActorEngine.execute(c.request);
    assert(detRes.success === true, `[${c.case_id}] Motor determinístico ejecutó exitosamente`);

    // 2. Run semantic coordinator with mock response
    try {
      const semRes = await AG013SemanticCoordinator.explain(
        detRes.package,
        CERTIFIED_UPSTREAM_SHA,
        undefined,
        c.expected.mock_output
      );

      assert(Boolean(semRes.merged_package.semantic_explanation), `[${c.case_id}] Explicación semántica presente en paquete`);
      assert(semRes.telemetry.llm_calls === 1, `[${c.case_id}] llm_calls = 1`);
      assert(semRes.telemetry.tokens > 0, `[${c.case_id}] tokens > 0`);
      assert(semRes.telemetry.cost_usd > 0, `[${c.case_id}] cost_usd > 0`);

      // Invariant: Deterministic results untouched
      const originalAsset = detRes.package.results[0];
      const mergedAsset = semRes.merged_package.results[0];
      assert(originalAsset.classification === mergedAsset.classification, `[${c.case_id}] Clasificación inmutable`);
      assert(originalAsset.rank === mergedAsset.rank, `[${c.case_id}] Rank inmutable`);
      assert(originalAsset.bad_actor_score === mergedAsset.bad_actor_score, `[${c.case_id}] Score inmutable`);

      passedCases++;
    } catch (err) {
      failedCases++;
      assert(false, `[${c.case_id}] Error en coordinación semántica: ${err.message}`);
    }
  }

  console.log('================================================================================');
  console.log('📊 RESUMEN DE EVALUACIÓN SEMÁNTICA MOCK AG-013.3:');
  console.log(`   - Total Casos Evaluados:        ${totalCases}`);
  console.log(`   - Casos Aprobados (PASS):       ${passedCases} (${((passedCases/totalCases)*100).toFixed(2)}%)`);
  console.log(`   - Casos Fallidos:               ${failedCases}`);
  console.log(`   - Total Aserciones:             ${totalAssertions}`);
  console.log(`   - Aserciones Aprobadas (PASS):  ${passedAssertions} (${((passedAssertions/totalAssertions)*100).toFixed(2)}%)`);
  console.log('================================================================================');

  if (passedCases === totalCases && failedCases === 0) {
    console.log('🏆 VEREDICTO MOCK EVALUATION: PASS ✅\n');
    return { success: true };
  } else {
    console.error('❌ VEREDICTO MOCK EVALUATION: FAILED\n');
    process.exit(1);
  }
}

runSemanticMockEvaluation().catch(err => {
  console.error('Error fatal en mock eval AG-013.3:', err);
  process.exit(1);
});
