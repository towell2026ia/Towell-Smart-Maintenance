// supabase/functions/agents-orchestrator/modules/m013/tests/run_m013_2_config_integrity_audit.js
// Configuration Integrity Audit for M-013 Safety Control Engine (v1.0)
// Gate Target: M013_CONFIG_INTEGRITY_PASS

const { M013SafetyConfigRegistry } = require('../config/m013-safety-config-registry.ts');

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
  console.log('🔍 PRD-M-013.2 — CONFIGURATION INTEGRITY AUDIT');
  console.log('================================================================================\n');

  const manifests = M013SafetyConfigRegistry.getManifests();
  assertAudit(manifests.length === 14, `Registro contiene 14 manifests canónicos (actual: ${manifests.length})`);

  const manifestHashes = M013SafetyConfigRegistry.getManifestHashes();
  assertAudit(Object.keys(manifestHashes).length === 14, 'Todos los manifests generaron un hash SHA-256');

  const compositeEvidence = M013SafetyConfigRegistry.getCompositeSafetyModelEvidence();
  assertAudit(compositeEvidence.model_id === 'M013-SAFETY-ENGINE', 'model_id coincide con M013-SAFETY-ENGINE');
  assertAudit(compositeEvidence.model_version === '1.0', 'model_version es 1.0');
  assertAudit(typeof compositeEvidence.m013_safety_model_sha256 === 'string', 'Composite SHA-256 generado correctamente');
  assertAudit(compositeEvidence.m013_safety_model_sha256.length === 64, 'Composite SHA-256 tiene longitud de 64 caracteres');

  for (const m of manifests) {
    assertAudit(m.manifest_id && m.manifest_id.startsWith('M013-'), `Manifest ${m.manifest_id} tiene prefijo canónico`);
    assertAudit(m.version === '1.0', `Manifest ${m.manifest_id} es versión 1.0`);
    assertAudit(typeof manifestHashes[m.manifest_id] === 'string', `Hash SHA-256 verificado para ${m.manifest_id}`);
    assertAudit(manifestHashes[m.manifest_id].length === 64, `Hash SHA-256 de ${m.manifest_id} es válido`);
  }

  console.log('\n================================================================================');
  console.log('📊 RESUMEN DE AUDITORÍA DE INTEGRIDAD DE CONFIGURACIÓN M-013.2:');
  console.log(`   - Aserciones Evaluadas:     ${totalAuditAssertions}`);
  console.log(`   - Aprobadas (PASS):         ${passedAuditAssertions} (${((passedAuditAssertions/totalAuditAssertions)*100).toFixed(2)}%)`);
  console.log(`   - Composite Model SHA-256:  ${compositeEvidence.m013_safety_model_sha256}`);
  console.log('================================================================================');

  if (passedAuditAssertions === totalAuditAssertions) {
    console.log('🏆 VEREDICTO DE AUDITORÍA: M013_CONFIG_INTEGRITY_PASS ✅\n');
    return { success: true, sha256: compositeEvidence.m013_safety_model_sha256 };
  } else {
    console.error('❌ VEREDICTO DE AUDITORÍA: FAILED\n');
    process.exit(1);
  }
}

runConfigIntegrityAudit().catch(err => {
  console.error('Error fatal en auditoría de configuración M-013.2:', err);
  process.exit(1);
});
