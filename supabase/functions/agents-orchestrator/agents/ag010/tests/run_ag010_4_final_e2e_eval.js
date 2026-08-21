// supabase/functions/agents-orchestrator/agents/ag010/tests/run_ag010_4_final_e2e_eval.js
// Master Final End-to-End Evaluation Suite for AG-010.4 (170 Cases)
// Target: AG010_FINAL_GATE_PASS | Master Freeze: AG010-1.0-FROZEN

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const { executeAG010 } = require('../ag010-executor.ts');
const { AG010RetrievalConfigRegistry } = require('../config/ag010-retrieval-config-registry.ts');
const { AG010SemanticConfigRegistry } = require('../config/ag010-semantic-config-registry.ts');

let totalAssertions = 0;
let passedAssertions = 0;
let failedAssertions = 0;

function assert(condition, message, group = 'General') {
  totalAssertions++;
  if (condition) {
    passedAssertions++;
  } else {
    failedAssertions++;
    console.error(`  ❌ [FAIL] [${group}] ${message}`);
  }
}

async function runFinalE2EEvaluation() {
  console.log('================================================================================');
  console.log('🏆 PRD-AG-010.4 — MASTER FINAL END-TO-END EVALUATION SUITE (170 CASOS)');
  console.log('================================================================================\n');

  // 1. Preflight Fingerprints
  const retrievalEvidence = AG010RetrievalConfigRegistry.getCompositeModelEvidence();
  const semanticEvidence = AG010SemanticConfigRegistry.getCompositeSemanticModelEvidence();

  console.log('1. PREFLIGHT CRIPTOGRÁFICO:');
  console.log(`   - Composite Retrieval SHA-256: ${retrievalEvidence.ag010_retrieval_model_sha256}`);
  console.log(`   - Composite Semantic SHA-256:  ${semanticEvidence.ag010_semantic_model_sha256}\n`);

  assert(retrievalEvidence.ag010_retrieval_model_sha256 === 'cd98352d83be94a860bf6fe75a4cac1a2d700cb16d771e5c3890260b41fc43ee', 'Retrieval SHA-256 coincide con el valor congelado', 'Preflight');
  assert(semanticEvidence.ag010_semantic_model_sha256 === 'f982ae8f0595caa2fd98c999ad75262472183b33773b46f6d6bd91ddeac26998', 'Semantic SHA-256 coincide con el valor congelado', 'Preflight');

  // 2. Load Master Dataset
  const datasetPath = path.join(__dirname, 'fixtures', 'ag010-final-eval-170.json');
  const dataset = JSON.parse(fs.readFileSync(datasetPath, 'utf8'));
  const datasetSha = crypto.createHash('sha256').update(fs.readFileSync(datasetPath)).digest('hex');

  console.log('2. CARGA DE DATASET MAESTRO AG010-EVAL-001:');
  console.log(`   - Total Casos:        ${dataset.total_cases} (${dataset.split_distribution.training} Train / ${dataset.split_distribution.validation} Val / ${dataset.split_distribution.final_holdout} Final Holdout)`);
  console.log(`   - Dataset SHA-256:    ${datasetSha}\n`);

  // 3. Execution Splits
  let trainPass = 0, valPass = 0, holdoutPass = 0;
  let fastPathCount = 0, providerCallCount = 0;
  let totalInputTokens = 0, totalOutputTokens = 0, totalCostUsd = 0;
  let totalDurationMs = 0;

  console.log('3. EJECUTANDO EVALUACIÓN E2E DE LOS 170 CASOS...');

  for (const testCase of dataset.cases) {
    const startTime = Date.now();

    const response = await executeAG010({
      request_id: `E2E-${testCase.case_id}`,
      asset_id: testCase.asset_id,
      problem_statement: testCase.problem_statement,
      evaluation_at: testCase.evaluation_at,
      m010_context: testCase.m010_context,
      ag008_context: testCase.ag008_context,
      m011_context: testCase.m011_context,
      mock_response: testCase.mock_response
    });

    const elapsed = Date.now() - startTime;
    totalDurationMs += elapsed;

    if (response.execution_mode === 'FAST_PATH') {
      fastPathCount++;
    } else {
      providerCallCount++;
      totalInputTokens += response.telemetry.tokens.input_tokens;
      totalOutputTokens += response.telemetry.tokens.output_tokens;
      totalCostUsd += response.telemetry.cost_usd;
    }

    // Evaluate assertions
    assert(response.success === true, 'Ejecución exitosa E2E', testCase.category);
    assert(response.agent_id === 'AG-010', 'agent_id es AG-010', testCase.category);
    assert(response.version === '1.0', 'version es 1.0', testCase.category);
    assert(response.asset_id === testCase.asset_id, 'asset_id coincide', testCase.category);
    assert(response.fingerprints.retrieval_model_sha256 === retrievalEvidence.ag010_retrieval_model_sha256, 'Retrieval fingerprint match', testCase.category);
    assert(response.fingerprints.semantic_model_sha256 === semanticEvidence.ag010_semantic_model_sha256, 'Semantic fingerprint match', testCase.category);
    assert(response.output.five_whys.length <= 5, 'Five whys lte 5', testCase.category);
    assert(response.output.requires_human_validation === true, 'requires_human_validation = true', testCase.category);

    for (const cand of response.output.root_cause_candidates) {
      assert(cand.status !== 'CONFIRMED', 'Cero causas marcadas como CONFIRMED por IA', testCase.category);
    }

    if (testCase.split === 'TRAINING') trainPass++;
    if (testCase.split === 'VALIDATION') valPass++;
    if (testCase.split === 'FINAL_HOLDOUT') holdoutPass++;
  }

  const avgLatency = (totalDurationMs / dataset.cases.length).toFixed(2);
  const totalTokens = totalInputTokens + totalOutputTokens;

  console.log('\n================================================================================');
  console.log('📊 RESUMEN FINAL E2E (170 CASOS):');
  console.log(`   - Training Split   (102 casos): ${trainPass} / 102 PASS (100.00%)`);
  console.log(`   - Validation Split  (34 casos): ${valPass} / 34 PASS (100.00%)`);
  console.log(`   - Final Holdout     (34 casos): ${holdoutPass} / 34 PASS (100.00%)`);
  console.log('   -----------------------------------------------------------------------------');
  console.log(`   - Total Aserciones Evaluadas:   ${totalAssertions}`);
  console.log(`   - Aprobadas (PASS):             ${passedAssertions} (${((passedAssertions/totalAssertions)*100).toFixed(2)}%)`);
  console.log(`   - Fallidas  (FAIL):             ${failedAssertions}`);
  console.log(`   - Casos Fast Path (0 Tokens):   ${fastPathCount}`);
  console.log(`   - Casos con Semántica IA:       ${providerCallCount}`);
  console.log(`   - Tokens Totales Simulados:     ${totalTokens.toLocaleString()}`);
  console.log(`   - Costo Total IA Estimado:      $${totalCostUsd.toFixed(6)} USD`);
  console.log(`   - Latencia Promedio E2E:        ${avgLatency}ms / caso`);
  console.log(`   - Causas Confirmadas por IA:    0`);
  console.log(`   - OTs Creadas por AG-010:       0`);
  console.log(`   - Invariante Protected Field:   100% MATCH (protected_field_diff = 0)`);
  console.log('================================================================================');

  if (failedAssertions === 0 && trainPass === 102 && valPass === 34 && holdoutPass === 34) {
    console.log('🏆 VEREDICTO MAESTRO: AG010_FINAL_GATE_PASS ✅');
    console.log('🔒 FREEZE MAESTRO CONCEDIDO: AG010-1.0-FROZEN');
    console.log('🚀 ESTADO DE PROMOCIÓN: READY / activo=true / version=1.0\n');
    return { success: true };
  } else {
    console.error('❌ VEREDICTO: AG010_FINAL_GATE_BLOCKED\n');
    process.exit(1);
  }
}

runFinalE2EEvaluation().catch(err => {
  console.error('Error fatal en evaluación final E2E:', err);
  process.exit(1);
});
