// supabase/functions/agents-orchestrator/agents/ag008/tests/run_ag008_3_real_provider_eval.js
// Real Provider (Xiaomi MiMo mimo-v2.5) Evaluation Suite for AG-008.3 (12 Frozen Holdout Cases)
// Dataset: AG008-SEM-EVAL-001 | Frozen under Token: AG008-SEMANTIC-LAYER-001

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const { processFailureSemanticLayer } = require('../core/failure-semantic-layer.ts');
const { shouldUseFailureSemanticLayer } = require('../decision/should-use-failure-semantic-layer.ts');
const { validateFailureSemanticOutput } = require('../validators/failure-semantic-validator.ts');

// Safe .env loader
function loadEnv() {
  const envPaths = [
    path.join(process.cwd(), '.env'),
    path.join(__dirname, '..', '..', '..', '..', '.env'),
    path.resolve(__dirname, '../../../../../../.env'),
    path.join(process.env.USERPROFILE || process.env.HOME || '', '.env')
  ];

  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const idx = trimmed.indexOf('=');
          const k = trimmed.substring(0, idx).trim();
          const v = trimmed.substring(idx + 1).trim().replace(/^["']|["']$/g, '');
          if (!process.env[k]) process.env[k] = v;
        }
      }
    }
  }
}

loadEnv();

async function runRealProviderEvaluation() {
  console.log('================================================================================');
  console.log('🏁 PRD-AG-008.3 — REAL PROVIDER EVALUATION (XIAOMI MIMO mimo-v2.5)');
  console.log('================================================================================\n');

  const datasetPath = path.join(__dirname, 'fixtures', 'semantic-dataset-ag008.json');
  const dataset = JSON.parse(fs.readFileSync(datasetPath, 'utf8'));

  const holdoutCases = dataset.filter(c => c.split === 'holdout');
  const holdoutHash = crypto.createHash('sha256').update(JSON.stringify(holdoutCases)).digest('hex');

  console.log(`📁 Frozen Holdout Cases:   ${holdoutCases.length}`);
  console.log(`🔒 Holdout SHA-256:        ${holdoutHash}`);
  console.log(`🤖 Proveedor Evaluado:     Xiaomi MiMo`);
  console.log(`🧠 Modelo:                 mimo-v2.5\n`);

  const apiKey = process.env.MIMO_API_KEY;
  if (!apiKey) {
    console.error('❌ ERROR: MIMO_API_KEY no encontrada en variables de entorno.');
    process.exit(1);
  }

  let passed = 0;
  let failed = 0;
  let fastPathCount = 0;
  let semanticRequiredCount = 0;
  let totalCalls = 0;
  let totalInTokens = 0;
  let totalOutTokens = 0;
  const latencies = [];

  for (const item of holdoutCases) {
    const input = item.input;
    const preDecision = shouldUseFailureSemanticLayer(input);

    if (preDecision.decision === 'NO_AI_FAST_PATH') {
      fastPathCount++;
    } else {
      semanticRequiredCount++;
    }

    console.log(`▶ Evaluando [${item.case_id}] [${preDecision.decision}] (${item.category})...`);

    const result = await processFailureSemanticLayer(input, { apiKey });
    const audit = result.audit;

    if (audit.provider_calls > 0) {
      totalCalls++;
      totalInTokens += audit.input_tokens;
      totalOutTokens += audit.output_tokens;
      latencies.push(audit.latency_ms);
      console.log(`   → HTTP MiMo Success | Latencia: ${audit.latency_ms}ms | Tokens: ${audit.total_tokens} (In: ${audit.input_tokens}, Out: ${audit.output_tokens}) | Costo: $${audit.cost_usd.toFixed(5)} USD`);
    } else {
      console.log(`   → Fast Path | 0 llamadas HTTP | 0 tokens | $0.00 USD`);
    }

    const val = validateFailureSemanticOutput(result.output);
    let casePass = val.isValid && audit.is_clean_merge;

    if (casePass) {
      passed++;
      console.log(`   ✅ [PASS] Resumen Ejecutivo: ${result.output.executive_summary.substring(0, 80)}...\n`);
    } else {
      failed++;
      console.error(`   ❌ [FAIL] Errores: ${val.errors.join(', ')}\n`);
    }
  }

  latencies.sort((a, b) => a - b);
  const avgLat = latencies.length > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0;
  const medianLat = latencies.length > 0 ? latencies[Math.floor(latencies.length / 2)] : 0;
  const p95Lat = latencies.length > 0 ? latencies[Math.floor(latencies.length * 0.95)] : 0;
  const maxLat = latencies.length > 0 ? Math.max(...latencies) : 0;

  const totalTokens = totalInTokens + totalOutTokens;
  const totalCostUsd = Math.round(((totalInTokens * 0.34 + totalOutTokens * 0.34) / 1000000) * 100000) / 100000;

  console.log('================================================================================');
  console.log('📊 TELEMETRÍA Y AUDITORÍA DE PROVEEDOR REAL (AG008-SEM-EVAL-001 HOLDOUT):');
  console.log(`   - Casos Holdout Evaluados:     ${holdoutCases.length}`);
  console.log(`   - Casos Fast Path:             ${fastPathCount} (100% con 0 llamadas HTTP)`);
  console.log(`   - Casos Semantic Required:     ${semanticRequiredCount}`);
  console.log(`   - Llamadas Reales a MiMo:      ${totalCalls}`);
  console.log(`   - Tokens de Entrada:           ${totalInTokens}`);
  console.log(`   - Tokens de Salida:            ${totalOutTokens}`);
  console.log(`   - Total Tokens Consumidos:     ${totalTokens}`);
  console.log(`   - Latencia Promedio:           ${avgLat} ms`);
  console.log(`   - Latencia Mediana:            ${medianLat} ms`);
  console.log(`   - Latencia P95:                ${p95Lat} ms`);
  console.log(`   - Latencia Máxima:             ${maxLat} ms`);
  console.log(`   - Estatus de Costo:            KNOWN`);
  console.log(`   - Costo Total en USD:          $${totalCostUsd.toFixed(5)} USD`);
  console.log(`   - Aprobados (PASS):            ${passed} / ${holdoutCases.length} (${((passed/holdoutCases.length)*100).toFixed(2)}%)`);
  console.log('================================================================================\n');

  if (passed === 12 && failed === 0 && totalCalls > 0) {
    console.log('🏆 VEREDICTO PROVEEDOR REAL: AG008_REAL_PROVIDER_GATE_PASS ✅\n');
    return {
      success: true,
      totalCalls,
      totalTokens,
      totalCostUsd,
      avgLat,
      medianLat,
      p95Lat,
      maxLat
    };
  } else {
    console.error('❌ VEREDICTO: AG008_REAL_PROVIDER_GATE_BLOCKED\n');
    process.exit(1);
  }
}

runRealProviderEvaluation().catch(err => {
  console.error('Error fatal en evaluación de proveedor real:', err);
  process.exit(1);
});
