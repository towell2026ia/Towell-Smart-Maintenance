// supabase/functions/agents-orchestrator/agents/ag012/tests/run_ag012_2_config_integrity_audit.js
// Configuration Integrity Audit for AG-012 (v1.0)
// Gate Target: AG012_DECISION_CONFIG_INTEGRITY_PASS

const { AG012DecisionConfigRegistry } = require('../config/ag012-decision-config-registry.ts');

let totalAuditAssertions = 0;
let passedAuditAssertions = 0;

function assertAudit(condition, message) {
  totalAuditAssertions++;
  if (condition) {
    passedAuditAssertions++;
    console.log(`  ✅ [PASS] ${message}`);
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
  }
}

async function runConfigIntegrityAudit() {
  console.log('================================================================================');
  console.log('🔍 PRD-AG-012.2 — CONFIGURATION INTEGRITY AUDIT');
  console.log('================================================================================\n');

  const manifests = AG012DecisionConfigRegistry.getManifests();
  assertAudit(manifests.length === 14, `Registro contiene 14 manifests canónicos (actual: ${manifests.length})`);

  const manifestHashes = AG012DecisionConfigRegistry.getManifestHashes();
  assertAudit(Object.keys(manifestHashes).length === 14, 'Todos los manifests generaron un hash SHA-256');

  const compositeEvidence = AG012DecisionConfigRegistry.getCompositeDecisionModelEvidence();
  assertAudit(compositeEvidence.model_id === 'AG012-DECISION-ENGINE', 'model_id coincide con AG012-DECISION-ENGINE');
  assertAudit(compositeEvidence.model_version === '1.0', 'model_version es 1.0');
  assertAudit(typeof compositeEvidence.ag012_decision_model_sha256 === 'string', 'Composite SHA-256 generado correctamente');
  assertAudit(compositeEvidence.ag012_decision_model_sha256.length === 64, 'Composite SHA-256 tiene longitud de 64 caracteres');

  for (const m of manifests) {
    assertAudit(m.manifest_id && m.manifest_id.startsWith('AG012-'), `Manifest ${m.manifest_id} tiene prefijo canónico`);
    assertAudit(m.version === '1.0', `Manifest ${m.manifest_id} es versión 1.0`);
    assertAudit(typeof manifestHashes[m.manifest_id] === 'string', `Hash SHA-256 verificado para ${m.manifest_id}`);
    assertAudit(manifestHashes[m.manifest_id].length === 64, `Hash SHA-256 de ${m.manifest_id} es válido`);
  }

  console.log('\n================================================================================');
  console.log('📊 RESUMEN DE AUDITORÍA DE INTEGRIDAD DE CONFIGURACIÓN AG-012.2:');
  console.log(`   - Aserciones Evaluadas:     ${totalAuditAssertions}`);
  console.log(`   - Aprobadas (PASS):         ${passedAuditAssertions} (${((passedAuditAssertions/totalAuditAssertions)*100).toFixed(2)}%)`);
  console.log(`   - Composite Model SHA-256:  ${compositeEvidence.ag012_decision_model_sha256}`);
  console.log('================================================================================');

  if (passedAuditAssertions === totalAuditAssertions) {
    console.log('🏆 VEREDICTO DE AUDITORÍA: AG012_DECISION_CONFIG_INTEGRITY_PASS ✅\n');
    return { success: true, sha256: compositeEvidence.ag012_decision_model_sha256 };
  } else {
    console.error('❌ VEREDICTO DE AUDITORÍA: FAILED\n');
    process.exit(1);
  }
}

runConfigIntegrityAudit().catch(err => {
  console.error('Error fatal en auditoría de configuración AG-012.2:', err);
  process.exit(1);
});
