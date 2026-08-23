// supabase/functions/agents-orchestrator/agents/ag013/tests/run_ag013_2_deno_runtime_eval.ts
// Deno 2.9.5 Edge Runtime Deterministic Evaluation Suite for AG-013 Analista de Malos Actores v1.0
// Target Gate: DENO_EDGE_RUNTIME_TEST = PASS (§164-165 PRD-AG-013.2)

import { AG013BadActorEngine } from '../core/ag013-bad-actor-engine.ts';
import { AG013BadActorConfigRegistry } from '../config/ag013-bad-actor-config-registry.ts';

let totalCases = 0;
let passedCases = 0;
let failedCases = 0;

async function runDenoRuntimeEvaluation() {
  console.log('================================================================================');
  console.log('🦕 PRD-AG-013.2 — DENO 2.9.5 EDGE RUNTIME DETERMINISTIC EVALUATION');
  console.log('================================================================================\n');

  const datasetRaw = await Deno.readTextFile(new URL('./fixtures/ag013-det-eval-260.json', import.meta.url));
  const dataset = JSON.parse(datasetRaw);

  const evidence = AG013BadActorConfigRegistry.getCompositeDecisionModelEvidence();
  const CERTIFIED_MODEL_SHA256 = evidence.ag013_bad_actor_model_sha256;

  console.log(`📦 Casos Cargados en Deno: ${dataset.length}`);
  console.log(`🔒 Composite Model SHA-256 en Deno: ${CERTIFIED_MODEL_SHA256}\n`);

  const latencies: number[] = [];

  for (const c of dataset) {
    totalCases++;
    const start = performance.now();

    if (c.expected.success === false) {
      let rejected = false;
      try {
        AG013BadActorEngine.execute(c.request);
      } catch (err: any) {
        if (err.message && err.message.includes(c.expected.error_contains)) {
          rejected = true;
        }
      }
      if (rejected) {
        passedCases++;
      } else {
        failedCases++;
        console.error(`  ❌ [FAIL] [${c.case_id}] No fue rechazado por seguridad como se esperaba`);
      }
      continue;
    }

    try {
      const res = AG013BadActorEngine.execute(c.request);
      const elapsed = performance.now() - start;
      latencies.push(elapsed);

      const r = res.package.results[0];
      const matchesClass = r.classification === c.expected.classification;
      const matchesRank = r.rank === c.expected.rank;
      const zeroAI = res.telemetry.ai_calls === 0 && res.telemetry.tokens_used === 0;

      if (res.success && matchesClass && matchesRank && zeroAI) {
        passedCases++;
      } else {
        failedCases++;
        console.error(`  ❌ [FAIL] [${c.case_id}] Deno execution mismatch: class=${r.classification} (exp: ${c.expected.classification})`);
      }
    } catch (err: any) {
      failedCases++;
      console.error(`  ❌ [FAIL] [${c.case_id}] Deno runtime error: ${err.message}`);
    }
  }

  const avgLat = latencies.length > 0 ? (latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(3) : '0';

  console.log('================================================================================');
  console.log('📊 RESUMEN DE EVALUACIÓN DENO 2.9.5 EDGE RUNTIME:');
  console.log(`   - Total Casos Evaluados:        ${totalCases}`);
  console.log(`   - Casos Aprobados (PASS):       ${passedCases} (${((passedCases/totalCases)*100).toFixed(2)}%)`);
  console.log(`   - Casos Fallidos:               ${failedCases}`);
  console.log(`   - Latencia Promedio Deno:       ${avgLat} ms`);
  console.log('================================================================================');

  if (passedCases === totalCases && failedCases === 0) {
    console.log('🏆 VEREDICTO DENO EDGE RUNTIME: DENO_EDGE_RUNTIME_TEST = PASS ✅\n');
  } else {
    console.error('❌ VEREDICTO DENO EDGE RUNTIME: FAILED\n');
    Deno.exit(1);
  }
}

runDenoRuntimeEvaluation().catch(err => {
  console.error('Error fatal en suite Deno AG-013.2:', err);
  Deno.exit(1);
});
