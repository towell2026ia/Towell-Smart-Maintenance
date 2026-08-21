// supabase/functions/agents-orchestrator/agents/ag011/tests/run_ag011_3_real_openai_eval.js
// Real OpenAI Provider Verification Suite for AG-011.3 (12 Holdout Cases)
// Target: AG011_REAL_OPENAI_PROVIDER_PASS / AG011_REAL_PROVIDER_VERIFICATION_BLOCKED

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const { AG011SemanticLayer } = require('../core/ag011-semantic-layer.ts');

function getEnvVar(key) {
  if (typeof Deno !== 'undefined' && Deno.env) return Deno.env.get(key);
  if (typeof process !== 'undefined' && process.env) return process.env[key];
  return undefined;
}

async function runRealOpenAIEvaluation() {
  console.log('================================================================================');
  console.log('⚡ PRD-AG-011.3 — REAL OPENAI PROVIDER VERIFICATION (12 HOLDOUT CASES)');
  console.log('================================================================================\n');

  const datasetPath = path.join(__dirname, 'fixtures', 'ag011-sem-eval-001.json');
  const dataset = JSON.parse(fs.readFileSync(datasetPath, 'utf8'));
  const holdoutCases = dataset.cases.filter(c => c.split === 'HOLDOUT');

  console.log(`1. Extraídos ${holdoutCases.length} casos de Holdout para prueba con OpenAI (GPT-4.1 Mini).\n`);

  const apiKey = getEnvVar('OPENAI_API_KEY');
  let realApiCalls = 0;
  let successfulCalls = 0;
  let fastPathCalls = 0;
  let authFailedCalls = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalCostUsd = 0;
  const latencies = [];

  for (const testCase of holdoutCases) {
    const isNoMatch = testCase.flags.is_no_match;

    try {
      const res = await AG011SemanticLayer.synthesize({
        request_id: `REAL-REQ-${testCase.case_id}`,
        retrieval_output: testCase.retrieval_output,
        problem_statement: testCase.problem_statement,
        component: testCase.component_id,
        memory_model_sha256: 'ce6ab889c09a2a721d3aedeaeb8c27b7d9881c66c212d0f62f7a9e0bf25096f7',
        api_key: apiKey
      });

      if (res.execution_mode === 'FAST_PATH') {
        fastPathCalls++;
      } else {
        realApiCalls++;
        successfulCalls++;
        totalInputTokens += res.tokens.input_tokens;
        totalOutputTokens += res.tokens.output_tokens;
        totalCostUsd += res.cost_usd;
        latencies.push(res.latency_ms);
      }
    } catch (err) {
      if (err.message.includes('401') || err.message.includes('OPENAI_API_KEY')) {
        authFailedCalls++;
        realApiCalls++;
      } else {
        console.error(`Error en caso ${testCase.case_id}:`, err.message);
      }
    }
  }

  const avgLatency = latencies.length > 0
    ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
    : 0;

  console.log('================================================================================');
  console.log('📊 RESUMEN DE VERIFICACIÓN DE PROVEEDOR REAL (AG-011.3):');
  console.log(`   Casos Holdout Totales:      ${holdoutCases.length}`);
  console.log(`   Casos Fast Path (0 Tokens): ${fastPathCalls}`);
  console.log(`   Llamadas a OpenAI Reales:   ${realApiCalls}`);
  console.log(`   Llamadas Exitosas:          ${successfulCalls}`);
  console.log(`   Fallos de Autenticación:    ${authFailedCalls}`);
  console.log(`   Tokens de Entrada:          ${totalInputTokens}`);
  console.log(`   Tokens de Salida:           ${totalOutputTokens}`);
  console.log(`   Tokens Totales:             ${totalInputTokens + totalOutputTokens}`);
  console.log(`   Costo Total IA Estimado:    $${totalCostUsd.toFixed(6)} USD`);
  console.log(`   Latencia Promedio:          ${avgLatency} ms`);
  console.log('================================================================================');

  let gateResult = 'AG011_REAL_OPENAI_PROVIDER_PASS';
  if (authFailedCalls > 0 || (!apiKey && successfulCalls === 0)) {
    gateResult = 'AG011_REAL_PROVIDER_VERIFICATION_BLOCKED';
    console.log(`⚠️ VEREDICTO DE PROVEEDOR: ${gateResult} (Requiere OPENAI_API_KEY configurada para llamadas live)\n`);
  } else {
    console.log(`🏆 VEREDICTO DE PROVEEDOR: ${gateResult} ✅\n`);
  }

  return {
    gateResult,
    holdoutCases: holdoutCases.length,
    fastPathCalls,
    realApiCalls,
    successfulCalls,
    authFailedCalls,
    totalTokens: totalInputTokens + totalOutputTokens,
    totalCostUsd,
    avgLatency
  };
}

runRealOpenAIEvaluation().catch(err => {
  console.error('Error fatal en evaluación de proveedor real:', err);
  process.exit(1);
});
