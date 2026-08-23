// supabase/functions/agents-orchestrator/modules/m012/tests/run_m012_2_config_integrity_audit.js
// Configuration Integrity Audit Suite for M-012 (v1.0)
// Gate Target: M012_CONFIG_INTEGRITY_PASS | Token: M012-CONFIG-EVIDENCE-001

const { M012PreparationConfigRegistry } = require('../config/m012-preparation-config-registry.ts');

let total = 0;
let passed = 0;
let failed = 0;

function assert(condition, message) {
  total++;
  if (condition) {
    passed++;
    console.log(`  ✅ [PASS] ${message}`);
  } else {
    failed++;
    console.error(`  ❌ [FAIL] ${message}`);
  }
}

async function runConfigIntegrityAudit() {
  console.log('================================================================================');
  console.log('🔒  PRD-M-012.2 — CONFIGURATION INTEGRITY AUDIT (>= 32 ASSERTIONS)');
  console.log('================================================================================\n');

  const evidence = M012PreparationConfigRegistry.getCompositePreparationModelEvidence();

  // 1. Structure & Model ID
  assert(evidence.model_id === 'M012-PREPARATION-ENGINE', 'Model ID coincide con M012-PREPARATION-ENGINE');
  assert(evidence.composite_version === '1.0', 'Versión compuesta es 1.0');
  assert(typeof evidence.m012_preparation_model_sha256 === 'string', 'Composite SHA-256 generado');
  assert(evidence.m012_preparation_model_sha256.length === 64, 'Composite SHA-256 tiene 64 caracteres');

  // 2. Manifests Presence (13 Manifests)
  const expectedManifests = [
    'M012-OT-VALIDATION-001',
    'M012-ASSET-IDENTITY-001',
    'M012-SCOPE-PRESERVATION-001',
    'M012-MEMORY-CONSUMPTION-001',
    'M012-PARTS-RULES-001',
    'M012-TOOLS-RESOURCES-RULES-001',
    'M012-CHECKLIST-MAPPING-001',
    'M012-DEPENDENCY-RULES-001',
    'M012-SAFETY-DEPENDENCY-RULES-001',
    'M012-DATA-GAP-RULES-001',
    'M012-READINESS-RULES-001',
    'M012-TEMPORAL-RULES-001',
    'M012-TRACEABILITY-RULES-001'
  ];

  for (const mId of expectedManifests) {
    const m = evidence.manifests[mId];
    assert(!!m, `Manifest ${mId} registrado`);
    assert(m && m.version === '1.0', `Manifest ${mId} tiene version 1.0`);
    assert(m && typeof m.sha256 === 'string' && m.sha256.length === 64, `Manifest ${mId} cuenta con SHA-256 válido`);
  }

  // 3. Immutability & Reproducibility
  const secondCall = M012PreparationConfigRegistry.getCompositePreparationModelEvidence();
  assert(secondCall.m012_preparation_model_sha256 === evidence.m012_preparation_model_sha256, 'Composite SHA-256 es 100% reproducible');

  // 4. Material Rules Inspection
  const otCfg = M012PreparationConfigRegistry.getOTValidationConfig();
  assert(otCfg.blocked_states.includes('CANCELLED'), 'OT validation bloquea CANCELLED');
  assert(otCfg.blocked_states.includes('CLOSED'), 'OT validation bloquea CLOSED');

  const scopeCfg = M012PreparationConfigRegistry.getScopePreservationConfig();
  assert(scopeCfg.automatic_scope_expansion_allowed === false, 'Scope preservation prohíbe expansión automática');

  const memCfg = M012PreparationConfigRegistry.getMemoryConsumptionConfig();
  assert(memCfg.allow_candidate === false, 'Memory consumption prohíbe memorias candidatas');
  assert(memCfg.allow_superseded === false, 'Memory consumption prohíbe memorias superseded');
  assert(memCfg.reranking_allowed === false, 'Memory consumption prohíbe re-ranking');
  assert(memCfg.top_n_limit === 5, 'Memory consumption fija Top-N = 5');

  const partsCfg = M012PreparationConfigRegistry.getPartsRulesConfig();
  assert(partsCfg.allow_auto_reservation === false, 'Parts rules prohíbe auto-reserva');
  assert(partsCfg.allow_auto_purchase === false, 'Parts rules prohíbe auto-compra');
  assert(partsCfg.treat_unknown_as_zero === false, 'Parts rules no trata unknown como zero');

  const safetyCfg = M012PreparationConfigRegistry.getSafetyDependencyRulesConfig();
  assert(safetyCfg.allow_safety_clearance === false, 'Safety rules prohíbe emisión de safety clearance');
  assert(safetyCfg.handoff_target === 'M-013', 'Safety rules fija handoff hacia M-013');

  const readinessCfg = M012PreparationConfigRegistry.getReadinessRulesConfig();
  assert(readinessCfg.ready_implies_authorization === false, 'Readiness rules: READY no autoriza ejecución');
  assert(readinessCfg.ready_implies_safety_cleared === false, 'Readiness rules: READY no es safety clearance');

  console.log('\n================================================================================');
  console.log(`📊 TOTAL AUDIT ASSERTIONS: ${total} | PASS: ${passed} | FAIL: ${failed}`);
  console.log(`🔒 COMPOSITE FINGERPRINT:  ${evidence.m012_preparation_model_sha256}`);
  console.log('================================================================================\n');

  if (total >= 32 && passed === total && failed === 0) {
    console.log('🏆 VEREDICTO DE INTEGRIDAD: M012_CONFIG_INTEGRITY_PASS ✅\n');
    return { success: true, sha256: evidence.m012_preparation_model_sha256 };
  } else {
    console.error('❌ VEREDICTO DE INTEGRIDAD: BLOCKED\n');
    process.exit(1);
  }
}

runConfigIntegrityAudit().catch(err => {
  console.error('Error fatal en auditoría de configuración M-012.2:', err);
  process.exit(1);
});
