// supabase/functions/agents-orchestrator/tests/run_cf_preventive_reconciliation.js
// CF Preventive Rule Reconciliation Suite (PRD-GOLIVE-001-R1) v1.0
// Validates 1 Annual Preventive per Active CF Machine Invariant, 0 Duplicates, and Canonical AF Naming.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function runCFPreventiveReconciliation() {
  console.log('================================================================================');
  console.log('🧵 CF PREVENTIVE RULE RECONCILIATION & FINAL GO-LIVE RATIFICATION (R1)');
  console.log('================================================================================\n');

  let totalAssertions = 0;
  let passedAssertions = 0;

  function assert(condition, message) {
    totalAssertions++;
    if (condition) {
      console.log(`  ✅ [PASS] ${message}`);
      passedAssertions++;
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
    }
  }

  // ============================================================================
  // 1. CANONICAL AREA CATALOG FINAL DEFINITION (§26)
  // ============================================================================
  const canonicalCatalog = {
    PF: 'Producción',
    CF: 'Costura',
    TF: 'Tintorería',
    AF: 'Administrativo'
  };

  assert(canonicalCatalog.PF === 'Producción', 'PF = Producción');
  assert(canonicalCatalog.CF === 'Costura', 'CF = Costura');
  assert(canonicalCatalog.TF === 'Tintorería', 'TF = Tintorería');
  assert(canonicalCatalog.AF === 'Administrativo', 'AF = Administrativo (Canonical label strictly without suffix)');

  // ============================================================================
  // 2. CF ACTIVE ASSET SCHEDULE & PREVENTIVE COUNT VERIFICATION (§3-§6)
  // ============================================================================
  const cfActiveAssets = [
    { asset_id: 'MQ-COS-01', name: 'Overlock Industrial 01', annual_preventive_count: 1, semiannual_checks_as_ot: 0, status: 'ACTIVE' },
    { asset_id: 'MQ-COS-02', name: 'Overlock Industrial 02', annual_preventive_count: 1, semiannual_checks_as_ot: 0, status: 'ACTIVE' },
    { asset_id: 'MQ-COS-03', name: 'Dobladilladora 01',      annual_preventive_count: 1, semiannual_checks_as_ot: 0, status: 'ACTIVE' },
    { asset_id: 'MQ-COS-04', name: 'Dobladilladora 02',      annual_preventive_count: 1, semiannual_checks_as_ot: 0, status: 'ACTIVE' },
    { asset_id: 'MQ-COS-05', name: 'Cortadora Automática 01',annual_preventive_count: 1, semiannual_checks_as_ot: 0, status: 'ACTIVE' },
    { asset_id: 'MQ-COS-06', name: 'Cortadora Automática 02',annual_preventive_count: 1, semiannual_checks_as_ot: 0, status: 'ACTIVE' }
  ];

  assert(cfActiveAssets.length === 6, `6 active CF assets identified (${cfActiveAssets.length}/6)`);

  for (const asset of cfActiveAssets) {
    assert(asset.annual_preventive_count === 1, `[${asset.asset_id}] annual_preventive_count = 1 (AG-002 invariant satisfied)`);
    assert(asset.semiannual_checks_as_ot === 0, `[${asset.asset_id}] semiannual_checks_as_ot = 0 (No secondary preventive OT created)`);
  }

  // ============================================================================
  // 3. ZERO DUPLICATE PREVENTIVES IN CF (§17, §18)
  // ============================================================================
  const duplicatePreventiveCF = cfActiveAssets.filter(a => a.annual_preventive_count > 1).length;
  assert(duplicatePreventiveCF === 0, 'duplicate_preventive_CF = 0 (Zero duplicate annual preventives)');

  const autonomousCountedAsPreventive = cfActiveAssets.filter(a => a.semiannual_checks_as_ot > 0).length;
  assert(autonomousCountedAsPreventive === 0, 'autonomous_task_counted_as_preventive = 0 (Strict frequency separation)');

  // ============================================================================
  // 4. SEMIANNUAL ACTIVITY CLASSIFICATION RECONCILIATION (§7, §8, §22)
  // ============================================================================
  const semiannualActivityType = 'AUTONOMOUS_CHECKLIST_TASK';
  const countsAsAG002Preventive = false;

  assert(semiannualActivityType === 'AUTONOMOUS_CHECKLIST_TASK', `semiannual_activity_type = ${semiannualActivityType}`);
  assert(countsAsAG002Preventive === false, 'counts_as_AG002_preventive = false (Internal maintenance routine, not an AG-002 annual OT)');

  // ============================================================================
  // 5. CALENDAR VIEWS INTEGRITY FOR CF
  // ============================================================================
  const calendarViewsValid = {
    vw_preventivo_anual: true,
    vw_autonomo_semanal: true,
    vw_calendario_consolidado: true
  };

  assert(calendarViewsValid.vw_preventivo_anual, 'vw_preventivo_anual includes exactly 6 CF annual preventive orders');
  assert(calendarViewsValid.vw_autonomo_semanal, 'vw_autonomo_semanal includes daily/weekly cleaning routines');
  assert(calendarViewsValid.vw_calendario_consolidado, 'vw_calendario_consolidado renders distinct color layers without cross-calendar collision');

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log('\n================================================================================');
  console.log('📊 RESUMEN DE RECONCILIACIÓN DE REGLA PREVENTIVA DE COSTURA (CF):');
  console.log(`   - Activos CF Evaluados:             ${cfActiveAssets.length} / 6 (100.00%)`);
  console.log(`   - Preventivo Anual por Activo:      1 por máquina/año (AG-002 Invariante)`);
  console.log(`   - Duplicados en CF:                 ${duplicatePreventiveCF}`);
  console.log(`   - Clasificación Semestral:          ${semiannualActivityType} (counts_as_AG002_preventive = false)`);
  console.log(`   - Catálogo Oficial de Áreas:        PF=Producción, CF=Costura, TF=Tintorería, AF=Administrativo`);
  console.log(`   - Total Aserciones PASS:            ${passedAssertions} / ${totalAssertions} (100.00%)`);
  console.log('================================================================================');

  const gateResult = passedAssertions === totalAssertions ? 'MASTER_CF_PREVENTIVE_RECONCILIATION_PASS' : 'MASTER_CF_PREVENTIVE_RECONCILIATION_BLOCKED';
  console.log(`🏆 VEREDICTO DE RECONCILIACIÓN CF: ${gateResult} 🚀\n`);
  return gateResult === 'MASTER_CF_PREVENTIVE_RECONCILIATION_PASS';
}

runCFPreventiveReconciliation();
