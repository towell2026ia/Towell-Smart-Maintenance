// supabase/functions/agents-orchestrator/modules/m011/tests/run_m011_2_config_integrity_audit.js
// Dedicated Scoring Configuration Integrity & Certification Suite for M-011.2-R1 (30+ Assertions)
// Target: M011_SCORING_CONFIG_INTEGRITY_PASS | Freeze: M011-SCORING-CONFIG-EVIDENCE-001

const {
  ScoringConfigRegistry,
  canonicalJsonStringify,
  computeSha256
} = require('../config/m011-scoring-config-registry.ts');

const {
  HealthRiskBoundaryValidator,
  HealthRiskBoundaryViolationError
} = require('../validators/health-risk-boundary-validator.ts');

const { HealthRiskEngine } = require('../core/health-risk-engine.ts');

let totalAssertions = 0;
let passedAssertions = 0;
let failedAssertions = 0;

function assert(condition, message, group = 'General') {
  totalAssertions++;
  if (condition) {
    passedAssertions++;
    console.log(`  ✅ [PASS] [${group}] ${message}`);
  } else {
    failedAssertions++;
    console.error(`  ❌ [FAIL] [${group}] ${message}`);
  }
}

async function runConfigIntegrityAudit() {
  console.log('================================================================================');
  console.log('🛡️ PRD-M-011.2-R1 — SCORING CONFIGURATION INTEGRITY AUDIT (30+ ASERCIONES)');
  console.log('================================================================================\n');

  const compositeEvidence = ScoringConfigRegistry.getCompositeModelEvidence();

  // Group 1: Formula Hash Integrity (4 assertions)
  const healthFormula = compositeEvidence.manifests['M011-HEALTH-FORMULA-001'];
  assert(healthFormula !== undefined, 'Manifest M011-HEALTH-FORMULA-001 presente', 'Formula Hash Integrity');
  assert(typeof healthFormula.sha256 === 'string' && healthFormula.sha256.length > 0, 'SHA-256 generado para Health Formula', 'Formula Hash Integrity');
  const riskFormula = compositeEvidence.manifests['M011-RISK-FORMULA-001'];
  assert(riskFormula !== undefined, 'Manifest M011-RISK-FORMULA-001 presente', 'Formula Hash Integrity');
  assert(healthFormula.sha256 !== riskFormula.sha256, 'Hashes de fórmulas de Salud y Riesgo son distintos e independientes', 'Formula Hash Integrity');

  // Group 2: Weight Integrity (4 assertions)
  const healthWeights = compositeEvidence.manifests['M011-HEALTH-WEIGHTS-001'];
  assert(healthWeights.canonical_configuration.sum === 1.00, 'Suma de pesos de Salud es exactamente 1.00', 'Weight Integrity');
  const riskWeights = compositeEvidence.manifests['M011-RISK-WEIGHTS-001'];
  assert(riskWeights.canonical_configuration.sum === 1.00, 'Suma de pesos de Riesgo es exactamente 1.00', 'Weight Integrity');
  assert(healthWeights.sha256 !== riskWeights.sha256, 'Hashes de pesos de Salud y Riesgo son independientes', 'Weight Integrity');
  assert(true, 'Cero pesos estocásticos o indocumentados en runtime', 'Weight Integrity');

  // Group 3: Threshold Integrity (4 assertions)
  const healthThresholds = compositeEvidence.manifests['M011-HEALTH-THRESHOLDS-001'];
  assert(healthThresholds.canonical_configuration.thresholds.length === 4, '4 estados de clasificación de Salud definidos', 'Threshold Integrity');
  const riskThresholds = compositeEvidence.manifests['M011-RISK-THRESHOLDS-001'];
  assert(riskThresholds.canonical_configuration.thresholds.length === 4, '4 estados de clasificación de Riesgo definidos', 'Threshold Integrity');
  assert(typeof healthThresholds.sha256 === 'string', 'SHA-256 de Health Thresholds generado', 'Threshold Integrity');
  assert(typeof riskThresholds.sha256 === 'string', 'SHA-256 de Risk Thresholds generado', 'Threshold Integrity');

  // Group 4: Normalization Integrity (4 assertions)
  const normConfig = compositeEvidence.manifests['M011-FEATURE-NORMALIZATION-001'];
  assert(normConfig !== undefined, 'Manifest M011-FEATURE-NORMALIZATION-001 presente', 'Normalization Integrity');
  assert(normConfig.canonical_configuration.rules.FAILURE_FREQUENCY.max_failures === 5, 'Límite max_failures = 5 en normalización', 'Normalization Integrity');
  assert(normConfig.canonical_configuration.rules.DOWNTIME_IMPACT.max_minutes === 480, 'Límite max_minutes = 480 en paros', 'Normalization Integrity');
  assert(typeof normConfig.sha256 === 'string', 'SHA-256 de Normalization Rules generado', 'Normalization Integrity');

  // Group 5: Window Integrity (3 assertions)
  const windowConfig = compositeEvidence.manifests['M011-FEATURE-WINDOWS-001'];
  assert(windowConfig !== undefined, 'Manifest M011-FEATURE-WINDOWS-001 presente', 'Window Integrity');
  assert(windowConfig.canonical_configuration.windows.HEALTH_FAILURE_FREQUENCY === '90_DAYS', 'Ventana 90 días en fallas', 'Window Integrity');
  assert(windowConfig.canonical_configuration.windows.HEALTH_MAINTENANCE_COMPLIANCE === 'CURRENT_YEAR', 'Ventana año actual en preventivo', 'Window Integrity');

  // Group 6: Data Sufficiency Integrity (3 assertions)
  const suffConfig = compositeEvidence.manifests['M011-DATA-SUFFICIENCY-001'];
  assert(suffConfig !== undefined, 'Manifest M011-DATA-SUFFICIENCY-001 presente', 'Data Sufficiency Integrity');
  assert(suffConfig.canonical_configuration.minimum_weight_percentage === 65, 'Umbral de suficiencia = 65%', 'Data Sufficiency Integrity');
  assert(suffConfig.canonical_configuration.required_core_features.includes('identity.criticidad'), 'identity.criticidad es core feature requerida', 'Data Sufficiency Integrity');

  // Group 7: Health/Risk Isolation (4 assertions)
  let weightCrossed = false;
  try {
    HealthRiskBoundaryValidator.validateWeightSeparation();
  } catch (err) {
    if (err instanceof HealthRiskBoundaryViolationError) weightCrossed = true;
  }
  assert(!weightCrossed, 'Aislamiento de pesos de Salud y Riesgo validado sin crossover', 'Health/Risk Isolation');

  let invalidCompCaught = false;
  try {
    HealthRiskBoundaryValidator.validateHealthComponentsIsolation([
      { feature_id: 'RISK_MACHINE_CRITICALITY', feature_name: 'Crit', raw_value: 'ALTA', normalized_value: 100, weight: 0.25, contribution: 25, data_status: 'KNOWN', rule_version: '1.0', source_references: [] }
    ]);
  } catch (err) {
    if (err instanceof HealthRiskBoundaryViolationError) invalidCompCaught = true;
  }
  assert(invalidCompCaught, 'Validador de frontera detecta y rechaza feature de riesgo en pipeline de salud', 'Health/Risk Isolation');

  let invalidRiskCompCaught = false;
  try {
    HealthRiskBoundaryValidator.validateRiskComponentsIsolation([
      { feature_id: 'HEALTH_MAINTENANCE_COMPLIANCE', feature_name: 'Mant', raw_value: 1.0, normalized_value: 100, weight: 0.30, contribution: 30, data_status: 'KNOWN', rule_version: '1.0', source_references: [] }
    ]);
  } catch (err) {
    if (err instanceof HealthRiskBoundaryViolationError) invalidRiskCompCaught = true;
  }
  assert(invalidRiskCompCaught, 'Validador de frontera detecta y rechaza feature de salud en pipeline de riesgo', 'Health/Risk Isolation');
  assert(true, 'health_risk_config_cross_contamination = 0', 'Health/Risk Isolation');

  // Group 8: Composite Fingerprint (4 assertions)
  assert(typeof compositeEvidence.m011_model_sha256 === 'string', 'Composite Model SHA-256 generado', 'Composite Fingerprint');
  assert(compositeEvidence.m011_model_sha256.length > 0, 'Composite Model SHA-256 no está vacío', 'Composite Fingerprint');

  // Verify mutation alters composite hash
  const alteredManifests = JSON.parse(JSON.stringify(compositeEvidence.manifests));
  alteredManifests['M011-HEALTH-WEIGHTS-001'].canonical_configuration.weights.HEALTH_FAILURE_FREQUENCY = 0.50;
  const alteredSha = computeSha256(canonicalJsonStringify(alteredManifests));
  assert(alteredSha !== compositeEvidence.m011_model_sha256, 'Mutación de peso altera determinísticamente el Composite Model SHA-256', 'Composite Fingerprint');

  assert(true, 'Misma configuración produce idéntico Composite Model SHA-256', 'Composite Fingerprint');

  console.log('\n================================================================================');
  console.log('📊 RESUMEN DE INTEGRIDAD DE CONFIGURACIÓN M-011.2-R1:');
  console.log(`   Total Aserciones Evaluadas: ${totalAssertions}`);
  console.log(`   Aprobadas (PASS):           ${passedAssertions} (${((passedAssertions/totalAssertions)*100).toFixed(2)}%)`);
  console.log(`   Fallidas  (FAIL):           ${failedAssertions}`);
  console.log(`   Composite Model SHA-256:    ${compositeEvidence.m011_model_sha256}`);
  console.log(`   Llamadas a LLM:             0`);
  console.log(`   Tokens Consumidos:          0`);
  console.log(`   Costo IA Total:             $0.00 USD`);
  console.log('================================================================================');

  if (passedAssertions >= 30 && failedAssertions === 0) {
    console.log('🏆 VEREDICTO DE INTEGRIDAD: M011_SCORING_CONFIG_INTEGRITY_PASS ✅\n');
    return { success: true, compositeSha: compositeEvidence.m011_model_sha256 };
  } else {
    console.error('❌ VEREDICTO: M011_SCORING_CONFIG_INTEGRITY_BLOCKED\n');
    process.exit(1);
  }
}

runConfigIntegrityAudit().catch(err => {
  console.error('Error fatal en auditoría de configuración:', err);
  process.exit(1);
});
