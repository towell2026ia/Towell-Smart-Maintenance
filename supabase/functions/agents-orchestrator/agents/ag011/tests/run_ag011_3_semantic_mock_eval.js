// supabase/functions/agents-orchestrator/agents/ag011/tests/run_ag011_3_semantic_mock_eval.js
// Master Semantic Mock Evaluation Suite for AG-011.3 (60 Cases)
// Target: AG011_SEMANTIC_MOCK_GATE_PASS | Freeze: AG011-SEMANTIC-LAYER-001

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const { AG011SemanticLayer } = require('../core/ag011-semantic-layer.ts');
const { AG011SemanticConfigRegistry } = require('../config/ag011-semantic-config-registry.ts');

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
  console.log('🧠 PRD-AG-011.3 — OPENAI TECHNICAL MEMORY SEMANTIC SYNTHESIS MOCK EVALUATION (60 CASOS)');
  console.log('================================================================================\n');

  // 1. Preflight Fingerprints
  const semanticEvidence = AG011SemanticConfigRegistry.getCompositeSemanticModelEvidence();
  console.log('1. PREFLIGHT CRIPTOGRÁFICO:');
  console.log(`   - Composite Semantic Model SHA-256: ${semanticEvidence.ag011_semantic_model_sha256}`);
  console.log(`   - Total Manifests Semánticos:       ${Object.keys(semanticEvidence.manifests).length}\n`);

  // 2. Load Dataset
  const datasetPath = path.join(__dirname, 'fixtures', 'ag011-sem-eval-001.json');
  const dataset = JSON.parse(fs.readFileSync(datasetPath, 'utf8'));
  const datasetSha = crypto.createHash('sha256').update(fs.readFileSync(datasetPath)).digest('hex');

  console.log('2. CARGA DE DATASET AG011-SEM-EVAL-001:');
  console.log(`   - Total Casos: ${dataset.total_cases} (36 Train / 12 Val / 12 Holdout)`);
  console.log(`   - Dataset SHA-256: ${datasetSha}\n`);

  let fastPathCount = 0;
  let mockProviderCount = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalCostUsd = 0;

  console.log('3. EJECUTANDO EVALUACIÓN MOCK DE LOS 60 CASOS...');

  for (const testCase of dataset.cases) {
    const isNoMatch = testCase.flags.is_no_match;
    const memItem = testCase.retrieval_output.memories[0]?.memory;

    let mockResponse = null;
    if (!isNoMatch && memItem) {
      mockResponse = {
        technical_summary: `Se identificó procedimiento aprobado de reemplazo de rodamiento 6205 para el telar ${testCase.asset_id}, efectivo para mitigar sobrecarga térmica y vibración.`,
        applicable_memories: [
          {
            memory_id: memItem.memory_id,
            version: memItem.version,
            applicability_status: 'DIRECTLY_APPLICABLE',
            applicability_rationale: `El procedimiento aplica exactamente al modelo ${testCase.machine_model} y componente ${testCase.component_id}.`,
            key_procedure_steps: [
              'Desmontar motor principal',
              'Extraer rodamiento 6205 con extractor mecánico',
              'Montar rodamiento nuevo 6205-2RS',
              'Lubricar con grasa sintética NLGI 2'
            ],
            critical_precautions: [
              'Bloqueo LOTO obligatorio antes de intervenir',
              'No aplicar si el eje presenta desgaste diametral > 0.03 mm'
            ]
          }
        ],
        memory_comparisons: [],
        applicability_explanation: [
          `La memoria ${memItem.memory_id} (v${memItem.version}) aplica directamente por coincidencia de modelo y síntoma de sobrecalentamiento.`
        ],
        limitations_summary: [
          'No aplica si el eje presenta desgaste diametral > 0.03 mm'
        ],
        reusable_lessons: [
          {
            lesson_id: `LES-${testCase.case_id}`,
            lesson_title: 'Mantenimiento Preventivo de Rodamientos 6205',
            core_recommendation: 'Estandarizar el uso de rodamientos sellados 2RS para evitar contaminación por polvillo textil.',
            status: 'DRAFT',
            referenced_memory_ids: [memItem.memory_id]
          }
        ],
        technical_context: [
          'Falla térmica recurrente en telares de alta velocidad debida a lubricación degradada.'
        ],
        data_gaps: [],
        requires_human_review: false
      };
    }

    const res = await AG011SemanticLayer.synthesize({
      request_id: `REQ-${testCase.case_id}`,
      retrieval_output: testCase.retrieval_output,
      problem_statement: testCase.problem_statement,
      component: testCase.component_id,
      memory_model_sha256: 'ce6ab889c09a2a721d3aedeaeb8c27b7d9881c66c212d0f62f7a9e0bf25096f7',
      mock_response: mockResponse
    });

    assert(res.success === true, 'Ejecución semántica exitosa', testCase.split);
    assert(res.semantic_model_sha256 === semanticEvidence.ag011_semantic_model_sha256, 'Semantic model hash coincide en runtime', testCase.split);

    if (isNoMatch) {
      fastPathCount++;
      assert(res.execution_mode === 'FAST_PATH', 'Fast Path activado correctamente ante ausencia de memorias', testCase.split);
      assert(res.tokens.total_tokens === 0, 'Tokens = 0 en Fast Path', testCase.split);
      assert(res.cost_usd === 0, 'Costo = $0.00 en Fast Path', testCase.split);
      assert(res.output.semantic_synthesis.applicable_memories.length === 0, 'applicable_memories vacío en Fast Path', testCase.split);
    } else {
      mockProviderCount++;
      assert(res.execution_mode === 'OPENAI_GPT41_MINI', 'Modo OPENAI_GPT41_MINI activado', testCase.split);
      assert(res.tokens.total_tokens > 0, 'Tokens registrados para caso semántico', testCase.split);
      assert(res.output.semantic_synthesis.applicable_memories.length === 1, 'Memoria aplicable sintetizada', testCase.split);
      assert(res.output.semantic_synthesis.applicable_memories[0].memory_id === memItem.memory_id, 'memory_id referenciado coincide exactamente con input', testCase.split);
      assert(res.output.semantic_synthesis.applicable_memories[0].version === memItem.version, 'version referenciada coincide exactamente con input', testCase.split);
      assert(res.output.semantic_synthesis.limitations_summary.length > 0, 'limitations_summary preserva limitaciones de entrada', testCase.split);

      totalInputTokens += res.tokens.input_tokens;
      totalOutputTokens += res.tokens.output_tokens;
      totalCostUsd += res.cost_usd;
    }

    // Invariant verifications across all cases
    assert(res.output.semantic_synthesis.requires_human_review !== undefined, 'requires_human_review definido', testCase.split);
    assert(Array.isArray(res.output.semantic_synthesis.data_gaps), 'data_gaps es un array', testCase.split);
  }

  console.log('\n================================================================================');
  console.log('📊 RESUMEN DE EVALUACIÓN MOCK AG-011.3 (60 CASOS):');
  console.log(`   Total Casos Evaluados:      ${dataset.cases.length}`);
  console.log(`   Casos Fast Path (0 Tokens): ${fastPathCount}`);
  console.log(`   Casos Mock Provider:        ${mockProviderCount}`);
  console.log(`   Tokens Totales Simulados:   ${totalInputTokens + totalOutputTokens}`);
  console.log(`   Costo IA Total Estimado:    $${totalCostUsd.toFixed(6)} USD`);
  console.log(`   Total Aserciones:           ${totalAssertions}`);
  console.log(`   Aprobadas (PASS):           ${passedAssertions} (${((passedAssertions/totalAssertions)*100).toFixed(2)}%)`);
  console.log(`   Fallidas  (FAIL):           ${failedAssertions}`);
  console.log('================================================================================');

  if (passedAssertions >= 400 && failedAssertions === 0) {
    console.log('🏆 VEREDICTO MOCK: AG011_SEMANTIC_MOCK_GATE_PASS ✅\n');
    return { success: true, sha: semanticEvidence.ag011_semantic_model_sha256 };
  } else {
    console.error('❌ VEREDICTO MOCK: BLOCKED\n');
    process.exit(1);
  }
}

runSemanticMockEvaluation().catch(err => {
  console.error('Error fatal en evaluación mock semántica:', err);
  process.exit(1);
});
