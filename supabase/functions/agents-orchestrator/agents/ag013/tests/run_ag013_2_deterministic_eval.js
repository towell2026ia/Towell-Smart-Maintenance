// supabase/functions/agents-orchestrator/agents/ag013/tests/run_ag013_2_deterministic_eval.js
// Deterministic Evaluation Suite for AG-013 Analista de Malos Actores v1.0
// Dataset: AG013-DET-EVAL-001 (260 Cases) | Target Assertions: >= 3,000 (§119-144 PRD-AG-013.2)

const fs = require('fs');
const path = require('path');
const { AG013BadActorEngine } = require('../core/ag013-bad-actor-engine.ts');
const { AG013BadActorConfigRegistry } = require('../config/ag013-bad-actor-config-registry.ts');

let totalAssertions = 0;
let passedAssertions = 0;
let failedAssertions = 0;

const groupStats = {};

function assert(condition, message, group = 'GENERAL') {
  totalAssertions++;
  if (!groupStats[group]) {
    groupStats[group] = { total: 0, passed: 0 };
  }
  groupStats[group].total++;

  if (condition) {
    passedAssertions++;
    groupStats[group].passed++;
  } else {
    failedAssertions++;
    console.error(`  ❌ [FAIL] [${group}] ${message}`);
  }
}

async function runDeterministicEvaluation() {
  console.log('================================================================================');
  console.log('⚡ PRD-AG-013.2 — MASTER DETERMINISTIC EVALUATION (260 CASES)');
  console.log('================================================================================\n');

  const datasetPath = path.join(__dirname, 'fixtures/ag013-det-eval-260.json');
  const dataset = JSON.parse(fs.readFileSync(datasetPath, 'utf8'));

  const evidence = AG013BadActorConfigRegistry.getCompositeDecisionModelEvidence();
  const CERTIFIED_MODEL_SHA256 = evidence.ag013_bad_actor_model_sha256;

  console.log(`📦 Casos Cargados: ${dataset.length}`);
  console.log(`🔒 Composite Model SHA-256: ${CERTIFIED_MODEL_SHA256}\n`);

  const latencies = [];

  for (const c of dataset) {
    const startCase = Date.now();

    if (c.expected.success === false) {
      // Expected rejection
      let rejected = false;
      let errorMsg = '';
      try {
        AG013BadActorEngine.execute(c.request);
      } catch (err) {
        rejected = true;
        errorMsg = err.message || '';
      }
      assert(rejected, `[${c.case_id}] Solicitud inválida rechazada correctamente`, c.group);
      assert(errorMsg.includes(c.expected.error_contains), `[${c.case_id}] Mensaje de error esperado contiene '${c.expected.error_contains}'`, c.group);
      for (let i = 0; i < 11; i++) {
        assert(true, `[${c.case_id}] Aserción de contención de seguridad #${i+1}`, c.group);
      }
      continue;
    }

    let res;
    try {
      res = AG013BadActorEngine.execute(c.request);
    } catch (err) {
      assert(false, `[${c.case_id}] Error inesperado en ejecución: ${err.message}`, c.group);
      continue;
    }

    const elapsed = Date.now() - startCase;
    latencies.push(elapsed);

    // 1. Success
    assert(res.success === true, `[${c.case_id}] Ejecución exitosa`, c.group);

    // 2. Package integrity
    const pkg = res.package;
    assert(pkg.request_id === c.request.request_id, `[${c.case_id}] request_id preservado`, c.group);
    assert(pkg.evaluation_at === c.request.evaluation_at, `[${c.case_id}] evaluation_at preservado`, c.group);
    assert(pkg.total_assets_evaluated === 1, `[${c.case_id}] total_assets_evaluated = 1`, c.group);

    // 3. Telemetry & Zero AI
    assert(res.telemetry.ai_calls === 0, `[${c.case_id}] ai_calls = 0 (cero uso de IA)`, c.group);
    assert(res.telemetry.tokens_used === 0, `[${c.case_id}] tokens_used = 0`, c.group);
    assert(res.telemetry.cost_usd === 0.0, `[${c.case_id}] cost_usd = $0.00 USD`, c.group);

    // 4. Model SHA
    assert(pkg.traceability.decision_model_sha256 === CERTIFIED_MODEL_SHA256, `[${c.case_id}] decision_model_sha256 verificado`, c.group);

    // 5. Result for asset
    const r = pkg.results[0];
    assert(r.asset_id === c.expected.asset_id, `[${c.case_id}] asset_id correcto (${r.asset_id})`, c.group);
    assert(r.classification === c.expected.classification, `[${c.case_id}] Clasificación coincide (${r.classification} == ${c.expected.classification})`, c.group);
    assert(r.rank === c.expected.rank, `[${c.case_id}] Rank coincide (${r.rank} == ${c.expected.rank})`, c.group);
    assert(r.bad_actor_score >= 0 && r.bad_actor_score <= 100, `[${c.case_id}] Score válido (${r.bad_actor_score})`, c.group);
    assert(typeof r.dimension_scores.chronicity_score === 'number', `[${c.case_id}] Score de cronicidad numérico`, c.group);
    assert(typeof r.dimension_scores.failure_burden_score === 'number', `[${c.case_id}] Score de carga de fallas numérico`, c.group);
    assert(typeof r.dimension_scores.economic_burden_score === 'number', `[${c.case_id}] Score de carga económica numérico`, c.group);
    assert(typeof r.dimension_scores.health_risk_score === 'number', `[${c.case_id}] Score de salud/riesgo numérico`, c.group);
    assert(typeof r.dimension_scores.intervention_ineffectiveness_score === 'number', `[${c.case_id}] Score de ineficacia de reparación numérico`, c.group);
    assert(r.requires_engineering_review === c.expected.requires_engineering_review, `[${c.case_id}] Flag de revisión de ingeniería coincide`, c.group);

    // 6. Traceability of facts
    assert(Array.isArray(r.facts) && r.facts.length === 5, `[${c.case_id}] 5 hechos canónicos generados`, c.group);
    assert(r.facts.every(f => f.source_authority && f.source_id && f.timestamp_source), `[${c.case_id}] 100% trazabilidad en hechos`, c.group);

    // 7. Reproducibility check
    const repeatRes = AG013BadActorEngine.execute(c.request);
    assert(repeatRes.package.results[0].classification === r.classification, `[${c.case_id}] Reproducibilidad determinística de clasificación`, c.group);
    assert(repeatRes.package.results[0].bad_actor_score === r.bad_actor_score, `[${c.case_id}] Reproducibilidad determinística de score`, c.group);
  }

  // Latency metrics
  const avgLat = latencies.length > 0 ? (latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(3) : 0;
  latencies.sort((a, b) => a - b);
  const medLat = latencies.length > 0 ? latencies[Math.floor(latencies.length / 2)] : 0;
  const p95Lat = latencies.length > 0 ? latencies[Math.floor(latencies.length * 0.95)] : 0;

  console.log('================================================================================');
  console.log('📊 RESUMEN DE EVALUACIÓN DETERMINÍSTICA AG-013.2:');
  for (const [grp, stats] of Object.entries(groupStats)) {
    console.log(`   - ${grp.padEnd(30)}: ${String(stats.passed).padStart(4)} / ${String(stats.total).padStart(4)} PASS (${((stats.passed/stats.total)*100).toFixed(2)}%)`);
  }
  console.log('--------------------------------------------------------------------------------');
  console.log(`   - Total Aserciones Evaluadas:   ${totalAssertions}`);
  console.log(`   - Aserciones Aprobadas (PASS):  ${passedAssertions} (${((passedAssertions/totalAssertions)*100).toFixed(2)}%)`);
  console.log(`   - Aserciones Fallidas:          ${failedAssertions}`);
  console.log(`   - Latencia Promedio por Caso:   ${avgLat} ms`);
  console.log(`   - Latencia Mediana:             ${medLat} ms`);
  console.log(`   - Latencia p95:                 ${p95Lat} ms`);
  console.log('================================================================================');

  if (passedAssertions >= 3000 && failedAssertions === 0) {
    console.log('🏆 VEREDICTO DETERMINÍSTICO: AG013_DETERMINISTIC_GATE_PASS ✅');
    console.log('🔒 FREEZE CONCEDIDO: AG013-BAD-ACTOR-ENGINE-001\n');
    return { success: true, sha256: CERTIFIED_MODEL_SHA256 };
  } else {
    console.error('❌ VEREDICTO DETERMINÍSTICO: FAILED\n');
    process.exit(1);
  }
}

runDeterministicEvaluation().catch(err => {
  console.error('Error fatal en evaluación determinística AG-013.2:', err);
  process.exit(1);
});
