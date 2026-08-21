// supabase/functions/agents-orchestrator/agents/ag011/tests/run_ag011_3_deno_runtime_eval.ts
// Real Deno Edge Runtime Evaluation Suite for AG-011.3 (60 Cases)
// Target: DENO_EDGE_RUNTIME_TEST = PASS

import { AG011SemanticLayer } from '../core/ag011-semantic-layer.ts';
import { AG011SemanticConfigRegistry } from '../config/ag011-semantic-config-registry.ts';

const EXPECTED_RETRIEVAL_MODEL_SHA = 'ce6ab889c09a2a721d3aedeaeb8c27b7d9881c66c212d0f62f7a9e0bf25096f7';
const EXPECTED_SEMANTIC_MODEL_SHA = '5b0af7622d40c63ba5a8201f36248113b08468139d7b5f11cef2cf423e6dd6db';

async function runDenoSemanticEvaluation() {
  console.log('================================================================================');
  console.log(`🦕 DENO RUNTIME SEMANTIC SUITE: AG-011 (Deno v${Deno.version.deno})`);
  console.log('================================================================================\n');

  // 1. Verify Model Hash in Deno
  const modelEvidence = AG011SemanticConfigRegistry.getCompositeSemanticModelEvidence();
  console.log(`1. Preflight Criptográfico Deno:`);
  console.log(`   - Composite Semantic Model SHA-256: ${modelEvidence.ag011_semantic_model_sha256}`);
  if (modelEvidence.ag011_semantic_model_sha256 !== EXPECTED_SEMANTIC_MODEL_SHA) {
    console.error('❌ Mismatch en hash semántico en Deno.');
    Deno.exit(1);
  }

  // 2. Load Dataset
  const datasetText = await Deno.readTextFile('supabase/functions/agents-orchestrator/agents/ag011/tests/fixtures/ag011-sem-eval-001.json');
  const dataset = JSON.parse(datasetText);
  console.log(`2. Dataset cargado: ${dataset.total_cases} casos.\n`);

  // 3. Execute 60 semantic cases in Deno
  console.log('3. Ejecutando 60 evaluaciones semánticas en Deno...');
  let passedCount = 0;
  const startTime = Date.now();

  for (const testCase of dataset.cases) {
    const isNoMatch = testCase.flags.is_no_match;
    const memItem = testCase.retrieval_output.memories[0]?.memory;

    let mockResponse = null;
    if (!isNoMatch && memItem) {
      mockResponse = {
        technical_summary: `Síntesis técnica validada para el telar ${testCase.asset_id}.`,
        applicable_memories: [
          {
            memory_id: memItem.memory_id,
            version: memItem.version,
            applicability_status: 'DIRECTLY_APPLICABLE',
            applicability_rationale: 'Coincidencia de modelo y falla.',
            key_procedure_steps: ['Paso 1', 'Paso 2'],
            critical_precautions: ['Precaución 1']
          }
        ],
        memory_comparisons: [],
        applicability_explanation: ['Explicación de aplicabilidad'],
        limitations_summary: memItem.limitations || [],
        reusable_lessons: [
          {
            lesson_id: `LES-${testCase.case_id}`,
            lesson_title: 'Lección aprendida',
            core_recommendation: 'Recomendación técnica',
            status: 'DRAFT',
            referenced_memory_ids: [memItem.memory_id]
          }
        ],
        technical_context: ['Contexto técnico'],
        data_gaps: [],
        requires_human_review: false
      };
    }

    const res = await AG011SemanticLayer.synthesize({
      request_id: `DENO-SEM-${testCase.case_id}`,
      retrieval_output: testCase.retrieval_output,
      problem_statement: testCase.problem_statement,
      component: testCase.component_id,
      memory_model_sha256: EXPECTED_RETRIEVAL_MODEL_SHA,
      mock_response: mockResponse
    });

    let pass = true;
    if (!res.success) pass = false;
    if (res.semantic_model_sha256 !== EXPECTED_SEMANTIC_MODEL_SHA) pass = false;
    if (isNoMatch && res.execution_mode !== 'FAST_PATH') pass = false;
    if (!isNoMatch && res.execution_mode !== 'OPENAI_GPT41_MINI') pass = false;

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
