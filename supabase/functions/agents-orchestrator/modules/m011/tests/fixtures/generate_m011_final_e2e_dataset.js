// supabase/functions/agents-orchestrator/modules/m011/tests/fixtures/generate_m011_final_e2e_dataset.js
// Generator for M011-EVAL-001 Master Final E2E Evaluation Dataset (170 Cases)
// Frozen under Token: M011-EVAL-001

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const categories = [
  { name: 'M-010 Context / Asset Identity', count: 10 },
  { name: 'Evaluation Time / Historical Isolation', count: 10 },
  { name: 'Feature Resolution', count: 12 },
  { name: 'Feature Windows', count: 10 },
  { name: 'Missing / Unknown / N/A', count: 12 },
  { name: 'Data Sufficiency', count: 12 },
  { name: 'Normalization', count: 12 },
  { name: 'Health Components', count: 12 },
  { name: 'Health Score / Classification', count: 10 },
  { name: 'Risk Components', count: 12 },
  { name: 'Risk Score / Classification', count: 10 },
  { name: 'Health/Risk Independence', count: 10 },
  { name: 'Configuration Integrity', count: 10 },
  { name: 'Traceability / Audit', count: 8 },
  { name: 'Security / Runtime / Boundaries', count: 10 },
  { name: 'Edge Cases & Boundary Thresholds', count: 10 }
];

const totalCases = categories.reduce((sum, c) => sum + c.count, 0); // 170 cases

const criticalities = ['ALTA', 'MEDIA', 'BAJA'];
const deptos = ['PF', 'TINTORERIA', 'CORTE', 'ACABADOS', 'CONFECCION'];
const assetTypes = ['TELAR DE AIRE', 'RAMA TEXTIL', 'LAVADORA INDUSTRIAL', 'CALDERA', 'COMPRESOR'];

const cases = [];
let caseIdx = 1;

for (const cat of categories) {
  for (let i = 0; i < cat.count; i++) {
    const padId = String(caseIdx).padStart(3, '0');
    const assetId = `M011-AST-${padId}`;
    const crit = criticalities[(caseIdx - 1) % criticalities.length];
    const depto = deptos[(caseIdx - 1) % deptos.length];
    const aType = assetTypes[(caseIdx - 1) % assetTypes.length];

    let failCount = (caseIdx % 4);
    let prevComp = 1.0 - ((caseIdx % 5) * 0.1);
    let autoComp = 1.0 - ((caseIdx % 4) * 0.1);
    let critFind = (caseIdx % 7 === 0) ? 1 : 0;
    let modFind = (caseIdx % 5 === 0) ? 1 : 0;
    let mildFind = (caseIdx % 3 === 0) ? 1 : 0;
    let dtMin = (caseIdx % 6) * 60;
    let recScore = (caseIdx % 5) * 20;
    let trend = (caseIdx % 3 === 0) ? 'UP' : ((caseIdx % 3 === 1) ? 'STABLE' : 'DOWN');

    let isInsufficient = false;

    // Cases designed for missing data / insufficiency
    if (cat.name === 'Missing / Unknown / N/A' && i >= 6) {
      isInsufficient = true;
    }
    if (cat.name === 'Data Sufficiency' && i >= 6) {
      isInsufficient = true;
    }

    const testCase = {
      case_id: `CASE-M011-${padId}`,
      category: cat.name,
      split: caseIdx <= 102 ? 'TRAINING' : (caseIdx <= 136 ? 'VALIDATION' : 'HOLDOUT'),
      description: `E2E Test Case #${caseIdx} for ${cat.name} (${assetId})`,
      evaluation_at: '2026-08-21T12:00:00.000Z',
      context: {
        asset_id: assetId,
        identity: {
          nombre: `Equipo Textil ${assetId}`,
          depto: depto,
          tipo: aType,
          criticidad: isInsufficient && (caseIdx % 2 === 0) ? undefined : crit,
          estatus: isInsufficient ? 'INACTIVO' : 'OPERANDO',
          activo: !isInsufficient
        },
        failure_metrics: isInsufficient ? undefined : {
          total_failures_90d: failCount,
          failure_recurrence_score: recScore,
          failure_trend: trend
        },
        maintenance_history: isInsufficient ? undefined : {
          preventive_compliance_rate: prevComp,
          autonomous_compliance_rate: autoComp,
          overdue_maintenances_count: 0
        },
        findings: isInsufficient ? undefined : {
          active_critical_findings_count: critFind,
          active_moderate_findings_count: modFind,
          active_mild_findings_count: mildFind
        },
        downtime_history: isInsufficient ? undefined : {
          total_downtime_minutes_90d: dtMin,
          downtime_events_count_90d: dtMin > 0 ? 1 : 0
        },
        alerts: {
          active_critical_alerts: critFind,
          active_warning_alerts: modFind
        },
        source_references: [
          {
            source_name: 'cat_maquinas',
            source_table: 'public.cat_maquinas',
            source_id: `SRC-${padId}`,
            retrieved_at: '2026-08-21T10:00:00Z',
            relationship_type: 'DIRECT_FK'
          }
        ]
      },
      expected: {
        is_sufficient: !isInsufficient,
        requires_null_score: isInsufficient
      }
    };

    cases.push(testCase);
    caseIdx++;
  }
}

const holdoutCases = cases.filter(c => c.split === 'HOLDOUT');
const holdoutCanonical = JSON.stringify(holdoutCases);
const holdoutSha256 = crypto.createHash('sha256').update(holdoutCanonical, 'utf8').digest('hex');

const datasetPayload = {
  version: 'M011-EVAL-001',
  description: 'Master Final E2E Evaluation Dataset for M-011 Health & Risk Engine',
  total_cases: cases.length,
  splits: {
    training: cases.filter(c => c.split === 'TRAINING').length,
    validation: cases.filter(c => c.split === 'VALIDATION').length,
    holdout: holdoutCases.length
  },
  holdout_sha256: holdoutSha256,
  generated_at: new Date().toISOString(),
  cases: cases
};

const datasetPath = path.join(__dirname, 'm011-final-eval-170.json');
const rawContent = JSON.stringify(datasetPayload, null, 2);
fs.writeFileSync(datasetPath, rawContent, 'utf8');

const datasetSha256 = crypto.createHash('sha256').update(fs.readFileSync(datasetPath)).digest('hex');

console.log(`✅ Master Dataset M011-EVAL-001 generado con éxito:`);
console.log(`   - Archivo:           ${datasetPath}`);
console.log(`   - Total Casos:       ${cases.length}`);
console.log(`   - Training (60%):    ${datasetPayload.splits.training}`);
console.log(`   - Validation (20%):  ${datasetPayload.splits.validation}`);
console.log(`   - Holdout (20%):     ${datasetPayload.splits.holdout}`);
console.log(`   - Dataset SHA-256:   ${datasetSha256}`);
console.log(`   - Holdout SHA-256:   ${holdoutSha256}`);
