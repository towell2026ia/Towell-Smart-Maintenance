// supabase/functions/agents-orchestrator/agents/ag007/tests/run_ag007_3_correction_gate.js
// Consolidation Gate Runner for PRD-AG-007.3-R1 (§120-122 PRD)
// Frozen under Token: AG007-PROVIDER-VERIFICATION-001

const { execSync } = require('child_process');
const path = require('path');

function runGate() {
  console.log('================================================================================');
  console.log('🏁 PRD-AG-007.3-R1 — CONSOLIDATED CORRECTION GATE RUNNER');
  console.log('================================================================================\n');

  const testsDir = __dirname;

  // 1. Run Mock Gate (60 Casos)
  console.log('▶️ EJECUTANDO SUB-GATE 1/3: MOCK SEMANTIC EVALUATION (60 CASOS)...');
  try {
    const mockOutput = execSync(`node ${path.join(testsDir, 'run_ag007_3_semantic_eval.js')}`, { encoding: 'utf8' });
    console.log(mockOutput);
    console.log('✅ SUB-GATE 1/3: AG007_SEMANTIC_MOCK_GATE_PASS\n');
  } catch (err) {
    console.error('❌ SUB-GATE 1/3 FALLÓ:', err.stdout || err.message);
    process.exit(1);
  }

  // 2. Run Real MiMo Provider Gate (12 Casos Holdout)
  console.log('▶️ EJECUTANDO SUB-GATE 2/3: REAL XIAOMI MIMO PROVIDER EVALUATION (12 CASOS)...');
  try {
    const realOutput = execSync(`node ${path.join(testsDir, 'run_ag007_3_real_mimo_eval.js')}`, { encoding: 'utf8' });
    console.log(realOutput);
    console.log('✅ SUB-GATE 2/3: AG007_REAL_PROVIDER_GATE_PASS\n');
  } catch (err) {
    console.error('❌ SUB-GATE 2/3 FALLÓ:', err.stdout || err.message);
    process.exit(1);
  }

  // 3. Run Deno Runtime / Compatibility Check
  console.log('▶️ EJECUTANDO SUB-GATE 3/3: DENO EDGE FUNCTIONS COMPATIBILITY & RUNTIME...');
  try {
    const denoOutput = execSync(`node ${path.join(testsDir, 'run_ag007_deno_compat_check.js')}`, { encoding: 'utf8' });
    console.log(denoOutput);
    console.log('✅ SUB-GATE 3/3: DENO_EDGE_RUNTIME_TEST = PASS\n');
  } catch (err) {
    console.error('❌ SUB-GATE 3/3 FALLÓ:', err.stdout || err.message);
    process.exit(1);
  }

  console.log('================================================================================');
  console.log('🏆 VEREDICTO FINAL CONSOLIDADO: AG007_SEMANTIC_GATE_PASS ✅');
  console.log('🔒 FREEZE TOKEN CONCEDIDO: AG007-SEMANTIC-LAYER-001');
  console.log('🚀 ESTADO DE FASE: READY_FOR_FINAL_E2E (AG-007.4)');
  console.log('================================================================================');
}

runGate();
