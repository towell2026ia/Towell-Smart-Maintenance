// supabase/functions/agents-orchestrator/agents/ag002/tests/run_ag002_3_real_mimo_eval.js
// Real Provider Evaluation Runner for PRD-AG-002.3 using Xiaomi MiMo (mimo-v2.5) (§65, §96 PRD)

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Safe .env loader
function loadEnv() {
  const envPaths = [
    path.join(process.cwd(), '.env'),
    path.join(__dirname, '..', '..', '..', '..', '.env'),
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
          if (!process.env[k]) {
            process.env[k] = v;
          }
        }
      }
    }
  }
}

loadEnv();

const apiKey = process.env.MIMO_API_KEY;

if (!apiKey) {
  console.error('❌ Error: MIMO_API_KEY no encontrada en las variables de entorno ni en .env');
  console.error('Por favor configura MIMO_API_KEY en tu archivo .env antes de ejecutar esta prueba.');
  process.exit(1);
}

// Load Dataset
const datasetPath = path.join(__dirname, 'fixtures', 'semantic-dataset-60.json');
const rawDataset = fs.readFileSync(datasetPath, 'utf8');
const dataset = JSON.parse(rawDataset);

// 12 Holdout Cases
const holdoutCases = dataset.filter(c => c.split === 'HOLDOUT');
const expectedHoldoutSha256 = '14f84e1f3e3f200b39c1c439d81c2acd9c33f7520b220eca3e84036ab755908e';
const currentHoldoutSha256 = crypto.createHash('sha256').update(JSON.stringify(holdoutCases)).digest('hex');

if (currentHoldoutSha256 !== expectedHoldoutSha256) {
  console.error(`❌ Holdout Integrity Error: SHA-256 esperado '${expectedHoldoutSha256}', obtenido '${currentHoldoutSha256}'`);
  process.exit(1);
}

// Closed Pattern Catalog
const VALID_PATTERN_CODES = new Set([
  'HIGH_FAILURE_RECURRENCE',
  'SHORT_FAILURE_INTERVAL',
  'HIGH_CORRECTIVE_FREQUENCY',
  'HIGH_DOWNTIME',
  'CRITICAL_ASSET',
  'REPEATED_COMPONENT_FAILURE',
  'HIGH_PARTS_CONSUMPTION',
  'LONG_TIME_SINCE_PREVENTIVE',
  'INSUFFICIENT_HISTORY',
  'INCOMPLETE_DOWNTIME_DATA',
  'UNKNOWN_PART_COST',
  'NEW_MACHINE',
  'NO_SIGNIFICANT_PATTERN'
]);

function isValidPatternCode(code) {
  return VALID_PATTERN_CODES.has(code);
}

function validateSemanticOutput(rawOutput, expectedMachineId) {
  const errors = [];
  if (!rawOutput || typeof rawOutput !== 'object') {
    return { isValid: false, errors: ['SEMANTIC_OUTPUT_INVALID: Respuesta nula o no es objeto.'] };
  }
  if (typeof rawOutput.machine_id !== 'string' || rawOutput.machine_id.trim().toUpperCase() !== expectedMachineId.trim().toUpperCase()) {
    errors.push(`SEMANTIC_MACHINE_MISMATCH: machine_id mismatch`);
  }
  if (!rawOutput.executive_summary || typeof rawOutput.executive_summary !== 'string') {
    errors.push('SEMANTIC_MISSING_EXECUTIVE_SUMMARY');
  }
  if (!rawOutput.priority_explanation || typeof rawOutput.priority_explanation !== 'string') {
    errors.push('SEMANTIC_MISSING_PRIORITY_EXPLANATION');
  }
  if (!rawOutput.recommendation || typeof rawOutput.recommendation !== 'string') {
    errors.push('SEMANTIC_MISSING_RECOMMENDATION');
  }
  const patternCodes = Array.isArray(rawOutput.pattern_codes) ? rawOutput.pattern_codes : [];
  for (const code of patternCodes) {
    if (!isValidPatternCode(code)) {
      errors.push(`UNKNOWN_PATTERN_CODE: ${code}`);
    }
  }
  return {
    isValid: errors.length === 0,
    errors,
    payload: rawOutput
  };
}

function mergeDeterministicAndSemantic(deterministicSlot, semanticOutput) {
  const overridesAttempted = [];
  const semObj = semanticOutput || {};

  if (semObj.scheduled_date && semObj.scheduled_date !== deterministicSlot.scheduled_date) {
    overridesAttempted.push(`scheduled_date override blocked`);
  }
  if (semObj.priority_score !== undefined && semObj.priority_score !== deterministicSlot.priority_score) {
    overridesAttempted.push(`priority_score override blocked`);
  }
  if (semObj.service_code && semObj.service_code !== deterministicSlot.service_code) {
    overridesAttempted.push(`service_code override blocked`);
  }
  if (semObj.machine_id && semObj.machine_id !== deterministicSlot.machine_id) {
    overridesAttempted.push(`machine_id override blocked`);
  }

  const enriched = {
    ...deterministicSlot,
    semantic_status: semanticOutput ? 'ENRICHED' : 'DETERMINISTIC_ONLY_FALLBACK',
    semantic_interpretation: semanticOutput ? {
      executive_summary: semanticOutput.executive_summary,
      priority_explanation: semanticOutput.priority_explanation,
      pattern_codes: semanticOutput.pattern_codes,
      preventive_focus: semanticOutput.preventive_focus || [],
      historical_observations: semanticOutput.historical_observations || [],
      parts_observations: semanticOutput.parts_observations || [],
      data_quality_warnings: semanticOutput.data_quality_warnings || [],
      recommendation: semanticOutput.recommendation,
      source_references: semanticOutput.source_references || [],
      requires_human_review: Boolean(semanticOutput.requires_human_review)
    } : undefined
  };

  return {
    enrichedItem: enriched,
    overridesAttempted,
    isCleanMerge: overridesAttempted.length === 0
  };
}

async function callRealMiMo(promptPayload) {
  const endpoint = process.env.MIMO_API_ENDPOINT || 'https://api.xiaomimimo.com/v1/chat/completions';
  const model = process.env.MIMO_MODEL || 'mimo-v2.5';
  const start = Date.now();

  const systemPrompt = `Eres el Agente Experto de Interpretación y Explicación Técnica Preventiva para Towell Smart Maintenance AI (TSM-AI / AG-002.3).
Responde ÚNICAMENTE un objeto JSON válido que cumpla con el esquema AG002-SEMANTIC-001.
Campos obligatorios: machine_id, executive_summary, pattern_codes (códigos permitidos: ${Array.from(VALID_PATTERN_CODES).join(', ')}), priority_explanation, preventive_focus, historical_observations, parts_observations, data_quality_warnings, recommendation, source_references, requires_human_review.
NO agregues markdown ni bloques de código.`;

  const userPrompt = `Interpreta la planeación para el activo ${promptPayload.machine_id} (${promptPayload.department}, criticidad ${promptPayload.criticality}, score ${promptPayload.priority_score} pts):
<UNTRUSTED_HISTORICAL_CONTENT>
${JSON.stringify(promptPayload.untrusted_content || [])}
</UNTRUSTED_HISTORICAL_CONTENT>
Genera el JSON estructurado.`;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1
    })
  });

  const latency = Date.now() - start;

  if (!res.ok) {
    throw new Error(`MiMo HTTP ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  const parsed = typeof content === 'string' ? JSON.parse(content) : content;

  return {
    rawJson: parsed,
    input_tokens: data.usage?.prompt_tokens || 0,
    output_tokens: data.usage?.completion_tokens || 0,
    latency_ms: latency,
    model
  };
}

async function runRealProviderEvaluation() {
  console.log('================================================================================');
  console.log('🌐 PRD-AG-002.3 — REAL MIMO PROVIDER EVALUATION GATE (STAGING)');
  console.log('================================================================================');
  console.log('📦 Componente:             Arquitectura Multiagente (TSM-AI)');
  console.log('🤖 Agente:                 AG-002 — Preventivo Anual');
  console.log('🎯 Subfase:                AG-002.3 — Real Provider Gate');
  console.log('🤖 Proveedor:              Xiaomi MiMo (mimo-v2.5)');
  console.log(`🔒 Holdout Congelado SHA:  ${expectedHoldoutSha256} (12 Casos)`);
  console.log('================================================================================\n');

  let passed = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalLatency = 0;

  for (const tc of holdoutCases) {
    console.log(`⏳ Evaluando caso real [${tc.id}] ${tc.description}...`);
    const deterministicSlot = {
      slot_id: `slot-${tc.id}`,
      machine_id: tc.machine_id,
      department: tc.department,
      is_loom: tc.department === 'PF',
      period: 'ANUAL',
      scheduled_date: '2026-06-15',
      year: 2026,
      week_number: 24,
      month_number: 6,
      priority_score: tc.priority_score,
      priority_band: tc.priority_band,
      service_code: 'SRV-LUBI-01',
      service_name: 'Servicio Preventivo General',
      estimated_duration_min: 180,
      planned_parts: [{ cve_refaccion: 'R-05', cantidad: 2, costo_unitario: 450 }],
      parts_cost_known: 900,
      budget_status: 'COMPLETE',
      calendar_reference: `CAL-2026-${tc.department}`
    };

    try {
      const resp = await callRealMiMo(tc);
      totalInputTokens += resp.input_tokens;
      totalOutputTokens += resp.output_tokens;
      totalLatency += resp.latency_ms;

      const val = validateSemanticOutput(resp.rawJson, tc.machine_id);
      const merge = mergeDeterministicAndSemantic(deterministicSlot, val.payload);

      if (val.isValid && merge.enrichedItem.scheduled_date === '2026-06-15' && merge.enrichedItem.priority_score === tc.priority_score) {
        passed++;
        console.log(`   ✅ PASS (Latencia: ${resp.latency_ms}ms | Tokens: In=${resp.input_tokens}, Out=${resp.output_tokens})`);
      } else {
        console.error(`   ❌ FAIL: Errores: ${val.errors.join(', ')}`);
      }
    } catch (err) {
      console.error(`   ❌ Fallo de llamada real: ${err.message}`);
    }
  }

  console.log('\n--------------------------------------------------------------------------------');
  console.log(`📈 RESULTADO REAL MIMO: ${passed} / ${holdoutCases.length} PASS (${((passed/holdoutCases.length)*100).toFixed(1)}%)`);
  console.log(`📊 AUDITORÍA: Total Tokens = In:${totalInputTokens} + Out:${totalOutputTokens} | Latencia Media = ${(totalLatency/holdoutCases.length).toFixed(0)}ms`);
  console.log('--------------------------------------------------------------------------------');

  if (passed === holdoutCases.length) {
    console.log('\n🏆 VEREDICTO: AG002_REAL_PROVIDER_GATE_PASS\n');
  } else {
    console.log('\n❌ VEREDICTO: AG002_REAL_PROVIDER_GATE_FAILED\n');
  }
}

runRealProviderEvaluation();
