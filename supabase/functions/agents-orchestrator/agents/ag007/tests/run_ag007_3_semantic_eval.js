// supabase/functions/agents-orchestrator/agents/ag007/tests/run_ag007_3_semantic_eval.js
// Mock Semantic Evaluation Suite for PRD-AG-007.3 (60 Cases)
// Frozen under Token: AG007-SEMANTIC-LAYER-001

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Engine Imports
const { generateDeterministicFallbackOutput, processSemanticLayer } = require('../core/semantic-layer.ts');
const { validateSemanticOutput } = require('../validators/semantic-validator.ts');
const { enforceMonetaryMergeGuard } = require('../guards/monetary-semantic-merge-guard.ts');
const { shouldUseSemanticLayer } = require('../decision/should-use-semantic-layer.ts');

let totalCases = 0;
let passedCases = 0;
let failedCases = 0;

const splitMetrics = {
  train: { total: 0, pass: 0 },
  val: { total: 0, pass: 0 },
  holdout: { total: 0, pass: 0 }
};

async function runMockSemanticEval() {
  console.log('================================================================');
  console.log('   TSM-AI: AG-007.3 SEMANTIC LAYER MOCK EVALUATION SUITE       ');
  console.log('   PRD: PRD-AG-007.3 v1.0 | RAMA C — ALERTAS | AG-007 MIMO      ');
  console.log('================================================================\n');

  const datasetPath = path.join(__dirname, 'fixtures', 'semantic-dataset-60.json');
  const datasetRaw = fs.readFileSync(datasetPath, 'utf8');
  const datasetHash = crypto.createHash('sha256').update(datasetRaw).digest('hex');
  const dataset = JSON.parse(datasetRaw);

  console.log(`📁 Dataset cargado: AG007-SEM-EVAL-001 (${dataset.length} casos, SHA-256: ${datasetHash.substring(0, 16)}...)\n`);

  for (const item of dataset) {
    totalCases++;
    splitMetrics[item.split].total++;

    const input = item.input;
    const isOverrideTest = item.category.includes('Monetary Override');
    const isInjectionTest = item.category.includes('Prompt Injection');

    // 1. Generate semantic output (Mock fallback)
    let semanticOutput = generateDeterministicFallbackOutput(input);

    // Simulate override attempt if test case demands it
    if (isOverrideTest && input.simulated_override) {
      semanticOutput.period = '2099-12'; // Attempt override
      if (semanticOutput.cost_driver_summary[0]) {
        semanticOutput.cost_driver_summary[0].amount_mxn = 9999999.00;
      }
    }

    // 2. Validate schema & rules
    const validation = validateSemanticOutput(semanticOutput);

    // 3. Enforce Merge Guard
    const mergeReport = enforceMonetaryMergeGuard(input, semanticOutput);

    // 4. Evaluate Success Criteria
    let pass = true;
    const failureReasons = [];

    if (!validation.isValid) {
      pass = false;
      failureReasons.push(`Fallo de validación: ${validation.errors.join(', ')}`);
    }

    if (isOverrideTest) {
      // In override tests, merge guard MUST have rejected the override and sanitized it
      if (mergeReport.isClean || mergeReport.overridesRejectedCount === 0) {
        pass = false;
        failureReasons.push('El Merge Guard no detectó ni rechazó el intento de sobreescritura monetaria.');
      }
      if (mergeReport.sanitizedOutput.period !== (input.period.month || String(input.period.year))) {
        pass = false;
        failureReasons.push('El periodo sanitizado no coincide con el periodo determinístico.');
      }
    } else {
      if (mergeReport.sanitizedOutput.period !== (input.period.month || String(input.period.year))) {
        pass = false;
        failureReasons.push('Periodo no coincide con entrada determinística.');
      }
    }

    // Completeness test
    if (input.actual.completeness === 'PARTIAL_COST_TOTAL') {
      const hasWarning = mergeReport.sanitizedOutput.data_quality_warnings.length > 0;
      if (!hasWarning) {
        pass = false;
        failureReasons.push('Caso parcial sin advertencia de calidad de datos en el output.');
      }
    }

    if (pass) {
      passedCases++;
      splitMetrics[item.split].pass++;
      console.log(`  ✅ [PASS] [${item.case_id}] (${item.split.toUpperCase()}) ${item.category}`);
    } else {
      failedCases++;
      console.error(`  ❌ [FAIL] [${item.case_id}] (${item.split.toUpperCase()}) ${item.category}`);
      console.error(`     Motivo: ${failureReasons.join(' | ')}`);
    }
  }

  console.log('\n================================================================');
  console.log('   RESUMEN DE EVALUACIÓN SEMÁNTICA MOCK (AG-007.3):');
  console.log(`   Total Casos Evaluados: ${totalCases}`);
  console.log(`   Aprobados (PASS):      ${passedCases} (${((passedCases / totalCases) * 100).toFixed(2)}%)`);
  console.log(`   Fallidos  (FAIL):      ${failedCases}`);
  console.log(`   - Training Split:      ${splitMetrics.train.pass} / ${splitMetrics.train.total} PASS`);
  console.log(`   - Validation Split:    ${splitMetrics.val.pass} / ${splitMetrics.val.total} PASS`);
  console.log(`   - Holdout Split:       ${splitMetrics.holdout.pass} / ${splitMetrics.holdout.total} PASS`);
  console.log('   Tokens Consumidos:     0');
  console.log('   Costo IA Mock:         $0.00 USD');
  console.log('================================================================');

  if (failedCases === 0 && totalCases === 60) {
    console.log('🏆 VEREDICTO: AG007_SEMANTIC_MOCK_GATE_PASS ✅');
  } else {
    console.error('❌ VEREDICTO: AG007_SEMANTIC_MOCK_GATE_FAILED');
    process.exit(1);
  }
}

runMockSemanticEval().catch(err => {
  console.error('Error fatal en evaluación mock:', err);
  process.exit(1);
});
