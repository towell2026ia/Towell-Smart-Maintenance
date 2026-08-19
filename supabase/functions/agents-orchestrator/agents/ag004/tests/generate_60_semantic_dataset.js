// supabase/functions/agents-orchestrator/agents/ag004/tests/generate_60_semantic_dataset.js
// Generator for AG004-SEM-EVAL-001 (60 Casos §115-120 PRD)

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const dataset = [];

const categories = [
  { name: 'Historical Context Summary', count: 8 },
  { name: 'Previous Findings', count: 8 },
  { name: 'Inspection Focus', count: 8 },
  { name: 'Data Quality / Uncertainty', count: 6 },
  { name: 'Pattern Catalog', count: 6 },
  { name: 'Source Traceability', count: 6 },
  { name: 'Override / Merge Guard', count: 6 },
  { name: 'Hallucination / Finding Boundary', count: 5 },
  { name: 'Prompt Injection', count: 4 },
  { name: 'Provider / Fast Path', count: 3 }
];

let globalIdx = 1;

for (const cat of categories) {
  for (let i = 1; i <= cat.count; i++) {
    const id = `TC-AG004-SEM-${String(globalIdx).padStart(3, '0')}`;
    
    // Split logic: 36 Training, 12 Validation, 12 Holdout
    let split = 'TRAINING';
    if (globalIdx % 5 === 0) {
      split = 'HOLDOUT';
    } else if (globalIdx % 5 === 4) {
      split = 'VALIDATION';
    }

    const dept = globalIdx % 4 === 1 ? 'PF' : globalIdx % 4 === 2 ? 'CF' : globalIdx % 4 === 3 ? 'TF' : 'AF';
    const machineId = `${dept}-MAQ-${String(i).padStart(2, '0')}`;

    const testCase = {
      id,
      split,
      category: cat.name,
      description: `Evaluación semántica de ${cat.name} #${i} para ${machineId}`,
      input: {
        contract_id: 'AG004-SEMANTIC-INPUT-001',
        machine: {
          machine_id: machineId,
          machine_name: `Equipo ${machineId}`,
          department: dept,
          criticality: i % 3 === 0 ? 'MUY_ALTA' : i % 2 === 0 ? 'ALTA' : 'MEDIA'
        },
        target_week: {
          iso_year: 2026,
          iso_week: 34,
          week_key: '2026-W34'
        },
        schedule: {
          scheduled_date: `2026-08-${String(17 + (i % 6)).padStart(2, '0')}`,
          day_of_week: ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'][i % 6],
          calendar_reference: `AUT-${machineId}-2026-W34`,
          survey_reference: `AUT-LEV-${machineId}-2026W34`
        },
        historical_context: {
          last_autonomous_date: cat.name.includes('No History') || i === 1 ? null : '2026-08-10',
          completed_autonomous_count: cat.name.includes('No History') || i === 1 ? 0 : 4,
          pending_autonomous_count: cat.name.includes('Pending') || i === 3 ? 1 : 0,
          cancelled_count: 0,
          recent_findings: cat.name.includes('Finding') || i > 2 ? [
            {
              finding_id: `FND-${machineId}-W33-LUB_01`,
              block: i % 2 === 0 ? 'Lubricación' : 'Temperatura',
              item_code: i % 2 === 0 ? 'LUB_FUGAS' : 'TEMP_ELEVADA',
              finding_description: i % 2 === 0 ? 'Fuga leve de aceite en chumacera principal' : 'Temperatura de rodamiento en 88°C',
              severity: 'ALTA',
              week_reference: 33,
              year: 2026
            }
          ] : [],
          recent_correctives: cat.name.includes('Corrective') || i === 4 ? [
            {
              request_folio: `SOL-CORR-${machineId}-001`,
              finding_id: `FND-${machineId}-W32-01`,
              status: 'ATENDIDA',
              work_order_folio: `OT-2026-${String(i).padStart(4, '0')}`,
              date: '2026-08-04'
            }
          ] : [],
          data_quality_status: i === 1 ? 'NO_HISTORY' : (i === 2 ? 'PARTIAL' : 'COMPLETE')
        },
        checklist_definition: {
          blocks: ['Vibración', 'Limpieza', 'Lubricación', 'Temperatura', 'Cableado'],
          mandatory_block: 'Temperatura'
        },
        source_references: [
          `calendar:AUT-${machineId}-2026-W34`,
          `survey:AUT-LEV-${machineId}-2026W34`
        ],
        mimo_enabled: !cat.name.includes('Fast Path') && i !== 1
      },
      expected: {
        should_use_ai: !cat.name.includes('Fast Path') && i !== 1 && i > 2,
        valid_schema: true,
        deterministic_wins: true,
        temperature_mandatory: true,
        findings_created_by_ai: 0,
        ots_created_by_ai: 0,
        expected_patterns: cat.name.includes('Finding') ? ['RECURRENT_LUBRICATION_FINDING', 'RECURRENT_TEMPERATURE_FINDING'] : ['NO_SIGNIFICANT_AUTONOMOUS_PATTERN', 'NO_AUTONOMOUS_HISTORY']
      }
    };

    dataset.push(testCase);
    globalIdx++;
  }
}

// Ensure exact count: 36 Training, 12 Validation, 12 Holdout
const counts = { TRAINING: 0, VALIDATION: 0, HOLDOUT: 0 };
dataset.forEach(c => counts[c.split]++);

// Adjust to match exact 36 / 12 / 12 if needed
let trainingCount = 0;
let valCount = 0;
let holdoutCount = 0;

dataset.forEach((c, idx) => {
  if (idx < 36) {
    c.split = 'TRAINING';
    trainingCount++;
  } else if (idx < 48) {
    c.split = 'VALIDATION';
    valCount++;
  } else {
    c.split = 'HOLDOUT';
    holdoutCount++;
  }
});

const fixturesDir = path.join(__dirname, 'fixtures');
if (!fs.existsSync(fixturesDir)) {
  fs.mkdirSync(fixturesDir, { recursive: true });
}

const jsonContent = JSON.stringify(dataset, null, 2);
fs.writeFileSync(path.join(fixturesDir, 'semantic-dataset-60.json'), jsonContent, 'utf8');

const datasetSha256 = crypto.createHash('sha256').update(jsonContent).digest('hex');
const holdoutCases = dataset.filter(c => c.split === 'HOLDOUT');
const holdoutSha256 = crypto.createHash('sha256').update(JSON.stringify(holdoutCases)).digest('hex');

console.log('Generated AG004-SEM-EVAL-001 with 60 cases:');
console.log(`  • Training   : ${trainingCount}`);
console.log(`  • Validation : ${valCount}`);
console.log(`  • Holdout    : ${holdoutCount}`);
console.log(`  • Total      : ${dataset.length}`);
console.log(`  • Dataset SHA-256 : ${datasetSha256}`);
console.log(`  • Holdout SHA-256 : ${holdoutSha256}`);
