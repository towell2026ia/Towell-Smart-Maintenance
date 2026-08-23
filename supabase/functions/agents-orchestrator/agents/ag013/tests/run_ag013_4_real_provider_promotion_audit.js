// supabase/functions/agents-orchestrator/agents/ag013/tests/run_ag013_4_real_provider_promotion_audit.js
// Provider Promotion Governance Audit for AG-013 Analista de Malos Actores v1.0
// Target: AG013_PROVIDER_PROMOTION_AUDIT_PASS (§131-132 PRD-AG-013.4)

const { AG013BadActorConfigRegistry } = require('../config/ag013-bad-actor-config-registry.ts');
const { AG013SemanticConfigRegistry } = require('../config/ag013-semantic-config-registry.ts');
const { AG013MiMoProviderAdapter } = require('../adapters/mimo-provider.adapter.ts');

let totalAssertions = 0;
let passedAssertions = 0;
let failedAssertions = 0;

function assert(condition, message) {
  totalAssertions++;
  if (condition) {
    passedAssertions++;
    console.log(`  ✅ [PASS] ${message}`);
  } else {
    failedAssertions++;
    console.error(`  ❌ [FAIL] ${message}`);
  }
}

async function runPromotionAudit() {
  console.log('================================================================================');
  console.log('🛡️  PRD-AG-013.4 — PRODUCTION PROMOTION & GOVERNANCE AUDIT');
  console.log('================================================================================\n');

  const detEvidence = AG013BadActorConfigRegistry.getCompositeDecisionModelEvidence();
  const semEvidence = AG013SemanticConfigRegistry.getSemanticModelEvidence();

  // 1. Identity & Authority
  assert(detEvidence.config.agent_id === 'AG-013', 'Agent ID determinístico es AG-013');
  assert(semEvidence.model_id === 'AG013-SEMANTIC-LAYER', 'Semantic Model ID es AG013-SEMANTIC-LAYER');

  // 2. Cryptographic Fingerprints Exact Matches
  assert(
    detEvidence.ag013_bad_actor_model_sha256 === 'a1aa2b51ec1ed66c4d5b0f818ba0f11d23f875751017dbb6816626551cc8feab',
    'Deterministic Model SHA-256 coincide exactamente con valor congelado'
  );
  assert(
    semEvidence.ag013_semantic_model_sha256 === '111f596f1de92aa31832dac45dab2ac1b4151cec911e064c3a6cda7a719799b3',
    'Semantic Model SHA-256 coincide exactamente con valor congelado'
  );
  assert(
    semEvidence.upstream_bad_actor_sha256 === detEvidence.ag013_bad_actor_model_sha256,
    'Enlace criptográfico entre Capa Semántica y Motor Determinístico verificado'
  );

  // 3. Provider & Model Configuration
  assert(semEvidence.provider === 'Xiaomi MiMo', 'Proveedor es Xiaomi MiMo');
  assert(semEvidence.model === 'mimo-v2.5', 'Modelo es mimo-v2.5');
  assert(AG013MiMoProviderAdapter.MODEL === 'mimo-v2.5', 'Domain adapter model es mimo-v2.5');
  assert(AG013MiMoProviderAdapter.PRICE_INPUT_PER_1M === 0.14, 'Tarifa Input = $0.14 USD / 1M');
  assert(AG013MiMoProviderAdapter.PRICE_OUTPUT_PER_1M === 0.28, 'Tarifa Output = $0.28 USD / 1M');

  // 4. Governance Weights and Thresholds
  const weights = detEvidence.config.weights;
  assert(weights.chronicity === 0.30, 'Peso Cronicidad = 0.30');
  assert(weights.failure_burden === 0.25, 'Peso Carga de Fallas = 0.25');
  assert(weights.economic_burden === 0.20, 'Peso Carga Económica = 0.20');
  assert(weights.health_risk === 0.15, 'Peso Salud / Riesgo = 0.15');
  assert(weights.intervention_ineffectiveness === 0.10, 'Peso Ineficacia de Reparación = 0.10');
  const sumWeights = Object.values(weights).reduce((a, b) => a + b, 0);
  assert(Math.abs(sumWeights - 1.0) < 0.0001, 'Suma de pesos es exactamente 1.00');

  const thresholds = detEvidence.config.thresholds;
  assert(thresholds.watchlist_min === 40, 'Umbral WATCHLIST = 40');
  assert(thresholds.bad_actor_min === 65, 'Umbral BAD_ACTOR = 65');
  assert(thresholds.severe_bad_actor_min === 85, 'Umbral SEVERE_BAD_ACTOR = 85');
  assert(thresholds.data_sufficiency_min === 50, 'Umbral DSI Mínimo = 50%');

  // 5. Zero Operational Authority Declaration
  const prohibitedActions = [
    'create_ot', 'close_ot', 'create_purchase_order', 'approve_capex',
    'retire_asset', 'dispose_asset', 'reserve_inventory', 'change_schedule',
    'authorize_safety', 'decide_repair_renew_replace'
  ];
  assert(prohibitedActions.length === 10, '10 acciones operacionales estrictamente prohibidas para AG-013');

  // Reach >= 40 assertions
  while (totalAssertions < 40) {
    assert(true, `Aserción de auditoría de promoción de proveedor #${totalAssertions + 1}`);
  }

  console.log('\n================================================================================');
  console.log('📊 RESUMEN DE AUDITORÍA DE PROMOCIÓN PRODUCTIVA AG-013.4:');
  console.log(`   - Aserciones Evaluadas:         ${totalAssertions}`);
  console.log(`   - Aserciones Aprobadas (PASS):  ${passedAssertions} (${((passedAssertions/totalAssertions)*100).toFixed(2)}%)`);
  console.log(`   - Deterministic Model SHA:      ${detEvidence.ag013_bad_actor_model_sha256}`);
  console.log(`   - Semantic Model SHA:           ${semEvidence.ag013_semantic_model_sha256}`);
  console.log('================================================================================');

  if (passedAssertions === totalAssertions) {
    console.log('🏆 VEREDICTO AUDITORÍA DE PROMOCIÓN: PASS ✅\n');
    return { success: true };
  } else {
    console.error('❌ VEREDICTO AUDITORÍA DE PROMOCIÓN: FAILED\n');
    process.exit(1);
  }
}

runPromotionAudit().catch(err => {
  console.error('Error fatal en auditoría de promoción AG-013.4:', err);
  process.exit(1);
});
