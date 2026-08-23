// supabase/functions/agents-orchestrator/agents/ag011/tests/run_ag011_4_deno_runtime_eval.ts
// Real Deno Edge Runtime Evaluation Suite for AG-011 (170 Cases)
// Target: DENO_EDGE_RUNTIME_TEST = PASS | Freeze: AG011-1.0-FROZEN

import { executeAG011 } from '../ag011-executor.ts';
import { AG011MemoryConfigRegistry } from '../config/ag011-memory-config-registry.ts';
import { AG011SemanticConfigRegistry } from '../config/ag011-semantic-config-registry.ts';

const EXPECTED_MEMORY_MODEL_SHA256 = 'ce6ab889c09a2a721d3aedeaeb8c27b7d9881c66c212d0f62f7a9e0bf25096f7';
const EXPECTED_SEMANTIC_MODEL_SHA256 = '5b0af7622d40c63ba5a8201f36248113b08468139d7b5f11cef2cf423e6dd6db';

async function runDenoFinalEvaluation() {
  console.log('================================================================================');
  console.log(`🦕 DENO RUNTIME FINAL SUITE: AG-011 (Deno v${Deno.version.deno})`);
  console.log('================================================================================\n');

  // 1. Preflight Criptográfico Deno
  const memoryEvidence = AG011MemoryConfigRegistry.getCompositeMemoryModelEvidence();
  const semanticEvidence = AG011SemanticConfigRegistry.getCompositeSemanticModelEvidence();

  console.log(`1. Preflight Criptográfico Deno:`);
  console.log(`   - Memory Model SHA-256:   ${memoryEvidence.ag011_memory_model_sha256}`);
  console.log(`   - Semantic Model SHA-256: ${semanticEvidence.ag011_semantic_model_sha256}\n`);

  if (memoryEvidence.ag011_memory_model_sha256 !== EXPECTED_MEMORY_MODEL_SHA256) {
    console.error('❌ Mismatch en Memory Model SHA-256 en Deno.');
    Deno.exit(1);
  }
  if (semanticEvidence.ag011_semantic_model_sha256 !== EXPECTED_SEMANTIC_MODEL_SHA256) {
    console.error('❌ Mismatch en Semantic Model SHA-256 en Deno.');
    Deno.exit(1);
  }

  // 2. Load Dataset
  const datasetText = await Deno.readTextFile('supabase/functions/agents-orchestrator/agents/ag011/tests/fixtures/ag011-final-eval-170.json');
  const dataset = JSON.parse(datasetText);
  console.log(`2. Dataset cargado: ${dataset.total_cases} casos.\n`);

  // 3. Execute 170 cases in Deno
  console.log('3. Ejecutando 170 evaluaciones E2E en Deno...');
  let passedCount = 0;
  const startTime = Date.now();

  for (const testCase of dataset.cases) {
    const isNoMatch = testCase.flags.is_no_match;
    const isCandidateFlow = testCase.flags.is_candidate_flow;
    const isApprovalFlow = testCase.flags.is_approval_flow;
    const isVersionFlow = testCase.flags.is_version_flow;

    let candidatePayload = undefined;
    let approvalPayload = undefined;
    let versionPayload = undefined;
    let mockResponse = undefined;

    if (isCandidateFlow) {
      candidatePayload = {
        title: `Candidato de Reparación para ${testCase.asset_id}`,
        memory_type: 'VALIDATED_REPAIR',
        asset_id: testCase.asset_id,
        machine_model: testCase.machine_model,
        machine_family: testCase.machine_family,
        component_id: testCase.component_id,
        department: testCase.department,
        condition_description: 'Vibración en rodamiento',
        validated_observations: ['Ruido de rodamiento'],
        confirmed_root_cause: 'Fatiga de material',
        validated_procedure: 'Reemplazar rodamiento 6205',
        expected_outcome: 'Vibración normalizada',
        evidence_items: [{
          evidence_id: `EV-${testCase.case_id}`,
          evidence_class: 'CERTIFIED_FACT',
          source_type: 'FINDING',
          source_id: `FIND-${testCase.case_id}`,
          fact_statement: 'Pitting detectado',
          occurred_at: '2026-08-10T10:00:00Z'
        }],
        origin_case_ids: [`CASE-${testCase.case_id}`]
      };
    } else if (isApprovalFlow) {
      approvalPayload = {
        reviewer_email: 'jefe.mantenimiento@towell.com',
        reviewer_role: 'SUPER_ADMIN',
        decision: 'APPROVED',
        notes: 'Aprobación formal E2E',
        evidence_snapshot_sha256: 'a'.repeat(64)
      };
    } else if (isVersionFlow) {
      versionPayload = {
        memory_id: `MEM-${testCase.case_id}`,
        title: `Nueva versión v2 para ${testCase.asset_id}`,
        memory_type: 'VALIDATED_REPAIR',
        status: 'REVIEW_REQUIRED',
        version: '2.0',
        scope: {
          scope_level: 'MACHINE_MODEL',
          machine_model: testCase.machine_model,
          component_id: testCase.component_id,
          department: testCase.department
        },
        technical_content: {
          condition_description: 'Nueva versión v2',
          validated_observations: ['Obs v2'],
          validated_procedure: 'Procedimiento mejorado v2',
          expected_outcome: 'Resultado v2'
        },
        evidence: [{
          evidence_id: `EV-V2-${testCase.case_id}`,
          evidence_class: 'CERTIFIED_FACT',
          source_type: 'FINDING',
          source_id: `FIND-V2-${testCase.case_id}`,
          fact_statement: 'Mejora validada en v2',
          occurred_at: '2026-08-20T10:00:00Z'
        }],
        origin_case_ids: [`CASE-${testCase.case_id}`]
      };
    } else {
      const memItem = testCase.retrieval_output.memories[0]?.memory;
      if (!isNoMatch && memItem) {
        mockResponse = {
          technical_summary: `Procedimiento de mantenimiento validado para ${testCase.asset_id}.`,
          applicable_memories: [{
            memory_id: memItem.memory_id,
            version: memItem.version,
            applicability_status: 'DIRECTLY_APPLICABLE',
            applicability_rationale: 'Coincidencia exacta de modelo de telar.',
            key_procedure_steps: ['Paso 1: Bloqueo LOTO', 'Paso 2: Reemplazo rodamiento 6205-2RS'],
            critical_precautions: ['Bloqueo LOTO obligatorio', 'Verificar holgura diametral < 0.03 mm']
          }],
          memory_comparisons: [],
          applicability_explanation: [`La memoria ${memItem.memory_id} aplica directamente por coincidencia de modelo.`],
          limitations_summary: memItem.limitations || [],
          reusable_lessons: [{
            lesson_id: `LES-${testCase.case_id}`,
            lesson_title: 'Mantenimiento Preventivo de Rodamientos',
            core_recommendation: 'Usar rodamientos 2RS sellados.',
            status: 'DRAFT',
            referenced_memory_ids: [memItem.memory_id]
          }],
          technical_context: ['Falla recurrente por polvillo textil.'],
          data_gaps: [],
          requires_human_review: false
        };
      }
    }

    const res = await executeAG011({
      request_id: `DENO-E2E-${testCase.case_id}`,
      event_id: `EVT-${testCase.case_id}`,
      correlation_id: `CORR-${testCase.case_id}`,
      operation: testCase.operation,
      asset_id: testCase.asset_id,
      problem_statement: testCase.problem_statement,
      component: testCase.component_id,
      machine_model: testCase.machine_model,
      machine_family: testCase.machine_family,
      department: testCase.department,
      evaluation_at: testCase.evaluation_at,
      memory_store: testCase.retrieval_output?.memories ? testCase.retrieval_output.memories.map((m: any) => m.memory) : undefined,
      candidate_payload: candidatePayload,
      approval_payload: approvalPayload,
      version_payload: versionPayload,
      mock_response: mockResponse
    });

    let pass = true;
    if (!res.success) pass = false;
    if (res.agent_id !== 'AG-011') pass = false;
    if (res.version !== '1.0') pass = false;
    if (res.fingerprints.memory_model_sha256 !== EXPECTED_MEMORY_MODEL_SHA256) pass = false;
    if (res.fingerprints.semantic_model_sha256 !== EXPECTED_SEMANTIC_MODEL_SHA256) pass = false;

    if (pass) passedCount++;
  }

  const elapsedMs = Date.now() - startTime;
  console.log(`   - Casos Evaluados: ${dataset.cases.length}`);
  console.log(`   - Casos Aprobados: ${passedCount} / ${dataset.cases.length} (${((passedCount/dataset.cases.length)*100).toFixed(2)}%)`);
  console.log(`   - Tiempo Total:    ${elapsedMs}ms (${(elapsedMs/dataset.cases.length).toFixed(2)}ms / caso)\n`);

  if (passedCount === 170) {
    console.log('🏆 VEREDICTO DENO RUNTIME: DENO_EDGE_RUNTIME_TEST = PASS ✅\n');
  } else {
    console.error('❌ VEREDICTO DENO RUNTIME: FAILED');
    Deno.exit(1);
  }
}

runDenoFinalEvaluation().catch(err => {
  console.error('Error fatal en Deno E2E evaluation:', err);
  Deno.exit(1);
});
