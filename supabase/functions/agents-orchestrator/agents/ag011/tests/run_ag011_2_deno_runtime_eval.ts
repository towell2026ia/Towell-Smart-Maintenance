// supabase/functions/agents-orchestrator/agents/ag011/tests/run_ag011_2_deno_runtime_eval.ts
// Real Deno Edge Runtime Evaluation Suite for AG-011.2 (196 Cases)
// Target: DENO_EDGE_RUNTIME_TEST = PASS

import { AG011MemoryEngine } from '../core/ag011-memory-engine.ts';
import { AG011MemoryBuilder } from '../core/ag011-memory-builder.ts';

const EXPECTED_MEMORY_SHA = 'ce6ab889c09a2a721d3aedeaeb8c27b7d9881c66c212d0f62f7a9e0bf25096f7';

async function runDenoDeterministicEvaluation() {
  console.log('================================================================================');
  console.log(`🦕 DENO RUNTIME DETERMINISTIC SUITE: AG-011 (Deno v${Deno.version.deno})`);
  console.log('================================================================================\n');

  // 1. Load Dataset
  const datasetText = await Deno.readTextFile('supabase/functions/agents-orchestrator/agents/ag011/tests/fixtures/ag011-det-eval-001.json');
  const dataset = JSON.parse(datasetText);
  console.log(`1. Dataset cargado: ${dataset.total_cases} casos.\n`);

  // 2. Setup Baseline Store
  const memoryStore = [
    AG011MemoryBuilder.build({
      memory_id: 'MEM-DENO-SEED-1',
      title: 'Procedimiento de Reemplazo de Rodamiento en Telar ZAX',
      memory_type: 'VALIDATED_REPAIR',
      status: 'APPROVED',
      version: '1.0',
      scope: {
        scope_level: 'MACHINE_MODEL',
        machine_model: 'TSUDAKOMA ZAX9100',
        component_id: 'MOTOR_PRINCIPAL'
      },
      technical_content: {
        condition_description: 'Sobrecalentamiento motor',
        validated_observations: ['Pitting'],
        validated_procedure: 'Reemplazo con 6205',
        expected_outcome: 'Normalización'
      },
      evidence: [
        {
          evidence_id: 'EV-DENO-1',
          evidence_class: 'CERTIFIED_FACT',
          source_type: 'FINDING',
          source_id: 'FIND-DENO-1',
          fact_statement: 'Pitting detectado',
          occurred_at: '2026-06-01T00:00:00Z'
        }
      ],
      origin_case_ids: ['CASE-SEED-DENO'],
      effective_from: '2026-06-01T00:00:00Z',
      approval: {
        reviewer_email: 'jefe@towell.com',
        reviewer_role: 'SUPER_ADMIN',
        decision: 'APPROVED',
        reviewed_at: '2026-06-01T01:00:00Z',
        approval_notes: 'Validado.',
        evidence_snapshot_sha256: 'd'.repeat(64)
      }
    })
  ];

  // 3. Execute 196 cases in Deno
  console.log('2. Ejecutando 196 evaluaciones determinísticas en Deno...');
  let passedCount = 0;
  const startTime = Date.now();

  for (const testCase of dataset.cases) {
    const isHypo = testCase.flags.is_hypothesis_only;

    // Operation 1: BUILD_CANDIDATE
    const buildRes = await AG011MemoryEngine.execute({
      request_id: `DENO-REQ-${testCase.case_id}`,
      operation: 'BUILD_CANDIDATE',
      candidate_params: {
        candidate_id: `CAND-${testCase.case_id}`,
        title: `Candidato para ${testCase.asset_id}`,
        memory_type: 'VALIDATED_REPAIR',
        asset_id: testCase.asset_id,
        machine_model: testCase.machine_model,
        condition_description: testCase.problem_statement,
        validated_observations: ['Zumbido'],
        validated_procedure: 'Procedimiento de prueba',
        expected_outcome: 'Resultado exitoso',
        evidence_items: testCase.evidence_items,
        origin_case_ids: testCase.origin_case_ids
      }
    });

    let pass = true;
    if (isHypo) {
      if (buildRes.success) pass = false;
    } else {
      if (!buildRes.success) pass = false;
      if (buildRes.result.status !== 'CANDIDATE') pass = false;
      if (buildRes.result.requires_human_review !== true) pass = false;
    }

    // Operation 2: RETRIEVE_MEMORIES
    const queryRes = await AG011MemoryEngine.execute({
      request_id: `DENO-QRY-${testCase.case_id}`,
      operation: 'RETRIEVE_MEMORIES',
      query_params: {
        asset_id: testCase.asset_id,
        evaluation_at: testCase.evaluation_at,
        problem_context: {
          statement: testCase.problem_statement,
          component: testCase.component_id
        },
        consumer: 'M-012',
        top_n_limit: 5
      },
      memory_store: memoryStore
    });

    if (!queryRes.success) pass = false;
    if (queryRes.ag011_memory_model_sha256 !== EXPECTED_MEMORY_SHA) pass = false;
    if (queryRes.result.memories.length > 5) pass = false;

    if (pass) passedCount++;
  }

  const elapsedMs = Date.now() - startTime;
  console.log(`   - Casos Evaluados: ${dataset.cases.length}`);
  console.log(`   - Casos Aprobados: ${passedCount} / ${dataset.cases.length} (${((passedCount/dataset.cases.length)*100).toFixed(2)}%)`);
  console.log(`   - Tiempo Total:    ${elapsedMs}ms (${(elapsedMs/dataset.cases.length).toFixed(2)}ms / caso)\n`);

  if (passedCount === 196) {
    console.log('🏆 VEREDICTO DENO RUNTIME: DENO_EDGE_RUNTIME_TEST = PASS ✅\n');
  } else {
    console.error('❌ VEREDICTO DENO RUNTIME: FAILED');
    Deno.exit(1);
  }
}

runDenoDeterministicEvaluation().catch(err => {
  console.error('Error fatal en Deno deterministic evaluation:', err);
  Deno.exit(1);
});
