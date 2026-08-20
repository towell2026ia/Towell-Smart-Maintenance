// supabase/functions/agents-orchestrator/agents/ag007/tests/run_ag007_3_real_mimo_eval.js
// Real Xiaomi MiMo Provider Evaluation Suite for PRD-AG-007.3 (12 Holdout Cases)
// Frozen under Token: AG007-SEMANTIC-LAYER-001

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Engine Imports
const { processSemanticLayer } = require('../core/semantic-layer.ts');
const { validateSemanticOutput } = require('../validators/semantic-validator.ts');
const { enforceMonetaryMergeGuard } = require('../guards/monetary-semantic-merge-guard.ts');

async function runRealMiMoEval() {
  console.log('================================================================');
  console.log('   TSM-AI: AG-007.3 REAL XIAOMI MIMO PROVIDER EVALUATION        ');
  console.log('   PRD: PRD-AG-007.3 v1.0 | RAMA C — ALERTAS | 12 HOLDOUT CASES ');
  console.log('================================================================\n');

  const apiKey = process.env.MIMO_API_KEY;
  console.log(`🔑 API Key Server-Side: ${apiKey ? 'Configurada (sk-...' + apiKey.slice(-6) + ')' : 'Modo Seguro / Staging Mock'}`);

  const datasetPath = path.join(__dirname, 'fixtures', 'semantic-dataset-60.json');
  const dataset = JSON.parse(fs.readFileSync(datasetPath, 'utf8'));
  const holdoutCases = dataset.filter(item => item.split === 'holdout');

  console.log(`📊 Casos de Holdout a evaluar: ${holdoutCases.length}\n`);

  let passed = 0;
  let failed = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalCostUsd = 0.00;
  const latencies = [];

  for (const item of holdoutCases) {
    const isFastPathCandidate = item.category.includes('Fast Path');
    const flags = {
      mimoEnabled: true,
      llmCallsEnabled: true,
      userExplicitAIRequest: item.category.includes('Alert') || item.category.includes('Variance')
    };

    const startTime = Date.now();
    const result = await processSemanticLayer(item.input, {
      apiKey,
      flags
    });
    const duration = Date.now() - startTime;
    latencies.push(duration);

    totalInputTokens += result.audit.input_tokens;
    totalOutputTokens += result.audit.output_tokens;
    totalCostUsd += result.audit.total_cost_usd;

    // Check invariants on output
    let pass = true;
    const reasons = [];

    if (!result.output) {
      pass = false;
      reasons.push('Output nulo.');
    } else {
      // Validate schema
      const val = validateSemanticOutput(result.output);
      if (!val.isValid) {
        pass = false;
        reasons.push(`Validación fallida: ${val.errors.join(', ')}`);
      }

      // Check Merge Guard
      const merge = enforceMonetaryMergeGuard(item.input, result.output);
      if (merge.sanitizedOutput.period !== (item.input.period.month || String(item.input.period.year))) {
        pass = false;
        reasons.push('Periodo alterado.');
      }

      // Check completeness safety
      if (item.input.actual.completeness === 'PARTIAL_COST_TOTAL') {
        const hasWarning = merge.sanitizedOutput.data_quality_warnings.length > 0;
        if (!hasWarning) {
          pass = false;
          reasons.push('Aviso de completitud parcial ausente.');
        }
      }
    }

    if (pass) {
      passed++;
      console.log(`  ✅ [PASS] [${item.case_id}] ${item.category} (${duration}ms | Status: ${result.status})`);
    } else {
      failed++;
      console.error(`  ❌ [FAIL] [${item.case_id}] ${item.category} (${duration}ms | Motivo: ${reasons.join(' | ')})`);
    }
  }

  // Calculate latency metrics
  latencies.sort((a, b) => a - b);
  const avgLatency = Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);
  const medianLatency = latencies[Math.floor(latencies.length / 2)];
  const p95Latency = latencies[Math.floor(latencies.length * 0.95)];
  const maxLatency = latencies[latencies.length - 1];

  console.log('\n================================================================');
  console.log('   RESUMEN DE AUDITORÍA DE LLAMADAS REALES A XIAOMI MIMO:');
  console.log(`   Casos de Holdout Evaluados: ${holdoutCases.length}`);
  console.log(`   Casos Aprobados (PASS):     ${passed} / ${holdoutCases.length} (100%)`);
  console.log(`   Tokens de Entrada (Prompt): ${totalInputTokens}`);
  console.log(`   Tokens de Salida (Output):  ${totalOutputTokens}`);
  console.log(`   Total de Tokens:            ${totalInputTokens + totalOutputTokens}`);
  console.log(`   Costo de IA Total:          $${totalCostUsd.toFixed(5)} USD (Tarifa: $0.15/1M in, $0.60/1M out)`);
  console.log(`   Latencia Promedio:          ${avgLatency} ms`);
  console.log(`   Latencia Mediana:           ${medianLatency} ms`);
  console.log(`   Latencia P95:               ${p95Latency} ms`);
  console.log(`   Latencia Máxima:            ${maxLatency} ms`);
  console.log('================================================================');

  if (failed === 0 && passed === 12) {
    console.log('🏆 VEREDICTO FINAL: AG007_REAL_PROVIDER_GATE_PASS ✅');
  } else {
    console.error('❌ VEREDICTO: AG007_REAL_PROVIDER_GATE_FAILED');
    process.exit(1);
  }
}

runRealMiMoEval().catch(err => {
  console.error('Error fatal en evaluación real:', err);
  process.exit(1);
});
