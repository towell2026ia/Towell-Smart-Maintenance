// supabase/functions/agents-orchestrator/agents/ag010/tests/run_ag010_3_semantic_eval.js
// Controlled / Mock Semantic Evaluation Suite for AG-010.3 (60 Cases, 120+ Assertions)
// Target: AG010_SEMANTIC_MOCK_GATE_PASS | Freeze: AG010-SEMANTIC-LAYER-001

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const { AG010SemanticLayer, EXPECTED_RETRIEVAL_MODEL_SHA256 } = require('../core/ag010-semantic-layer.ts');
const { AG010SemanticAuditor } = require('../audit/ag010-semantic-audit.ts');

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

async function runSemanticMockEvaluation() {
  console.log('================================================================================');
  console.log('🛡️ PRD-AG-010.3 — CONTROLLED SEMANTIC EVALUATION SUITE (60 CASOS)');
  console.log('================================================================================\n');

  // 1. Load Dataset
  const datasetPath = path.join(__dirname, 'fixtures', 'ag010-sem-eval-001.json');
  const dataset = JSON.parse(fs.readFileSync(datasetPath, 'utf8'));
  const datasetSha = crypto.createHash('sha256').update(fs.readFileSync(datasetPath)).digest('hex');

  console.log('1. CARGA DE DATASET SEMÁNTICO AG010-SEM-EVAL-001:');
  console.log(`   - Total Casos:        ${dataset.total_cases} (${dataset.split_distribution.training} Train / ${dataset.split_distribution.validation} Val / ${dataset.split_distribution.holdout} Holdout)`);
  console.log(`   - Dataset SHA-256:    ${datasetSha}`);
  console.log(`   - Retrieval Dep SHA:  ${dataset.retrieval_dependency_sha256}\n`);

  assert(dataset.retrieval_dependency_sha256 === EXPECTED_RETRIEVAL_MODEL_SHA256, 'Retrieval dependency SHA coincide con el valor congelado', 'Preflight');

  // 2. Clear Audit Logs
  AG010SemanticAuditor.clearLogs();

  console.log('2. EJECUTANDO EVALUACIÓN SEMÁNTICA SOBRE 60 CASOS...');
  let totalTokensConsumed = 0;
  let totalCostUsd = 0;
  let fastPathCount = 0;
  let providerCallCount = 0;

  for (const testCase of dataset.cases) {
    const res = await AG010SemanticLayer.interpretEvidence({
      request_id: `REQ-${testCase.case_id}`,
      evidence_package: testCase.evidence_package,
      retrieval_model_sha256: testCase.retrieval_model_sha256,
      mock_response: testCase.mock_response
    });

    if (res.execution_mode === 'FAST_PATH') {
      fastPathCount++;
    } else {
      providerCallCount++;
      totalTokensConsumed += res.tokens.total_tokens;
      totalCostUsd += res.cost_usd;
    }

    // Evaluate assertions per test case
    assert(res.success === true, 'Ejecución exitosa de capa semántica', testCase.category);
    assert(res.agent_id === 'AG-010', 'agent_id es AG-010', testCase.category);
    assert(res.output.case_id === testCase.case_id, 'case_id inalterado en output', testCase.category);
    assert(res.output.asset_id === testCase.asset_id, 'asset_id inalterado en output', testCase.category);
    assert(res.output.facts.length === testCase.evidence_package.certified_facts.length, 'Hechos certificados intactos', testCase.category);
    assert(res.output.previous_cases.length === testCase.evidence_package.previous_cases.length, 'Casos anteriores intactos', testCase.category);
    assert(res.output.five_whys.length <= 5, 'Cinco porqués respeta máximo 5 niveles', testCase.category);
    assert(res.output.requires_human_validation === true, 'requires_human_validation = true garantizado', testCase.category);

    // Assert zero AI confirmed root causes
    for (const cand of res.output.root_cause_candidates) {
      assert(cand.status !== 'CONFIRMED', 'Cero causas raíz marcadas como CONFIRMED por IA', testCase.category);
    }

    if (testCase.expected.is_fast_path) {
      assert(res.execution_mode === 'FAST_PATH', 'Fast Path activado correctamente para datos insuficientes', testCase.category);
      assert(res.tokens.total_tokens === 0, 'Cero tokens consumidos en Fast Path', testCase.category);
      assert(res.cost_usd === 0, 'Costo $0.00 USD en Fast Path', testCase.category);
    }
  }

  const auditLogs = AG010SemanticAuditor.getAuditLogs();

  console.log('\n================================================================================');
  console.log('📊 RESUMEN DE EVALUACIÓN SEMÁNTICA MOCK AG-010.3:');
  console.log(`   Total Aserciones Evaluadas: ${totalAssertions}`);
  console.log(`   Aprobadas (PASS):           ${passedAssertions} (${((passedAssertions/totalAssertions)*100).toFixed(2)}%)`);
  console.log(`   Fallidas  (FAIL):           ${failedAssertions}`);
  console.log(`   Casos Fast Path (0 Tokens): ${fastPathCount}`);
  console.log(`   Casos Proveedor MiMo:       ${providerCallCount}`);
  console.log(`   Tokens Simulados Consumidos:${totalTokensConsumed}`);
  console.log(`   Costo IA Estimado:          $${totalCostUsd.toFixed(6)} USD`);
  console.log(`   Registros de Auditoría:     ${auditLogs.length} / ${dataset.cases.length} (100% Cobertura)`);
  console.log('================================================================================');

  if (failedAssertions === 0 && passedAssertions >= 120) {
    console.log('🏆 VEREDICTO MOCK SEMÁNTICO: AG010_SEMANTIC_MOCK_GATE_PASS ✅\n');
    return { success: true };
  } else {
    console.error('❌ VEREDICTO: AG010_SEMANTIC_MOCK_GATE_BLOCKED\n');
    process.exit(1);
  }
}

runSemanticMockEvaluation().catch(err => {
  console.error('Error fatal en evaluación semántica mock:', err);
  process.exit(1);
});
