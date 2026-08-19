// supabase/functions/agents-orchestrator/agents/ag004/tests/generate_170_final_dataset.js
// Master Dataset Generator for AG004-EVAL-001 (170 Casos §5-11 PRD)

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const categories = [
  { name: 'Arquitectura / Source of Truth', count: 8 },
  { name: 'Eligibility / PF-CF-TF-AF', count: 12 },
  { name: 'ISO Week / Calendar Boundaries', count: 14 },
  { name: 'Weekly Coverage / Population', count: 16 },
  { name: 'Load Balancing / Scheduler', count: 16 },
  { name: 'Idempotency / Concurrency', count: 14 },
  { name: 'MiMo Semantic Layer / Fast Path', count: 16 },
  { name: 'Levantamiento Autónomo', count: 12 },
  { name: 'Checklist / Temperatura', count: 18 },
  { name: 'Finding Detector / Evidence', count: 14 },
  { name: 'AG-001 / AG-009.2 / AG-009.3', count: 14 },
  { name: 'Security / Governance / Audit', count: 16 }
];

const totalTarget = 170;
const dataset = [];
let globalIdx = 1;

for (const cat of categories) {
  for (let i = 1; i <= cat.count; i++) {
    const id = `TC-AG004-E2E-${String(globalIdx).padStart(3, '0')}`;
    
    // Split logic: 102 Training (60%), 34 Validation (20%), 34 Final Holdout (20%)
    let split = 'TRAINING';
    if (globalIdx > 136) {
      split = 'HOLDOUT';
    } else if (globalIdx > 102) {
      split = 'VALIDATION';
    }

    const dept = globalIdx % 4 === 1 ? 'PF' : globalIdx % 4 === 2 ? 'CF' : globalIdx % 4 === 3 ? 'TF' : 'AF';
    const machineId = `${dept}-MAQ-${String(i).padStart(2, '0')}`;

    // Test case variations based on category
    let isActive = true;
    let targetWeek = '2026-W34';
    let isoYear = 2026;
    let isoWeek = 34;
    let tempC = 55.0 + (i % 30);
    let hasFinding = false;
    let findingBlock = null;
    let findingItem = null;
    let isTempMissing = false;
    let shouldCallMiMo = (cat.name.includes('MiMo') || i % 3 === 0) && !cat.name.includes('Fast Path');

    if (cat.name === 'Eligibility / PF-CF-TF-AF') {
      if (i === 11) isActive = false;
      if (i === 12) isActive = false;
    }

    if (cat.name === 'ISO Week / Calendar Boundaries') {
      if (i === 1) { targetWeek = '2026-W01'; isoWeek = 1; }
      if (i === 2) { targetWeek = '2026-W52'; isoWeek = 52; }
      if (i === 3) { targetWeek = '2020-W53'; isoYear = 2020; isoWeek = 53; }
      if (i === 4) { targetWeek = '2026-W53'; isoYear = 2026; isoWeek = 53; } // Invalid W53 in 2026
    }

    if (cat.name === 'Checklist / Temperatura') {
      if (i === 1 || i === 2) isTempMissing = true;
      if (i === 3) {
        tempC = 92.5; // High temp finding (>85°C)
        hasFinding = true;
        findingBlock = 'Temperatura';
        findingItem = 'TEMP_ELEVADA';
      }
    }

    if (cat.name === 'Finding Detector / Evidence' || cat.name === 'AG-001 / AG-009.2 / AG-009.3') {
      hasFinding = true;
      const blocks = ['Vibración', 'Limpieza', 'Lubricación', 'Temperatura', 'Cableado'];
      findingBlock = blocks[i % blocks.length];
      findingItem = findingBlock === 'Temperatura' ? 'TEMP_ELEVADA' : `${findingBlock.substring(0, 3).toUpperCase()}_DEFECT_01`;
      if (findingBlock === 'Temperatura') tempC = 89.0;
    }

    const testCase = {
      id,
      split,
      category: cat.name,
      description: `E2E Evaluación #${i} [${cat.name}] para ${machineId} (${dept})`,
      machine: {
        machine_id: machineId,
        machine_name: `Equipo ${machineId}`,
        department: dept,
        active: isActive,
        criticality: i % 3 === 0 ? 'MUY_ALTA' : i % 2 === 0 ? 'ALTA' : 'MEDIA'
      },
      target_week: {
        iso_year: isoYear,
        iso_week: isoWeek,
        week_key: targetWeek
      },
      schedule: {
        scheduled_date: `2026-08-${String(17 + (i % 6)).padStart(2, '0')}`,
        day_of_week: ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'][i % 6],
        calendar_reference: `AUT-${machineId}-${targetWeek}`,
        survey_reference: `AUT-LEV-${machineId}-${targetWeek.replace('-', '')}`
      },
      survey_responses: {
        vibracion: findingBlock === 'Vibración' ? 'VIBRACION_EXCESIVA' : 'NORMAL',
        limpieza: findingBlock === 'Limpieza' ? 'SUCIEDAD_ACUMULADA' : 'CONFORME',
        lubricacion: findingBlock === 'Lubricación' ? 'FUGA_ACEITE_CHUMACERA' : 'NIVEL_CORRECTO',
        temperatura_c: isTempMissing ? null : tempC,
        cableado: findingBlock === 'Cableado' ? 'TERMINAL_FLOJA_TABLERO' : 'CONEXIONES_OK',
        observaciones: `Inspección física en ${dept} ${machineId}`
      },
      expected: {
        is_eligible: isActive && ['PF', 'CF', 'TF', 'AF'].includes(dept) && !(isoYear === 2026 && isoWeek === 53),
        valid_iso_week: !(isoYear === 2026 && isoWeek === 53),
        scheduled_day_valid: true,
        temperature_mandatory_pass: !isTempMissing,
        has_finding: hasFinding && !isTempMissing,
        finding_block: findingBlock,
        requires_corrective_route: hasFinding && !isTempMissing,
        requires_admin_approval: hasFinding && !isTempMissing,
        work_orders_created_by_ag004: 0,
        direct_connector_bypass: 0
      }
    };

    dataset.push(testCase);
    globalIdx++;
  }
}

const fixturesDir = path.join(__dirname, 'fixtures');
if (!fs.existsSync(fixturesDir)) {
  fs.mkdirSync(fixturesDir, { recursive: true });
}

const jsonContent = JSON.stringify(dataset, null, 2);
fs.writeFileSync(path.join(fixturesDir, 'final-e2e-dataset-170.json'), jsonContent, 'utf8');

const datasetSha256 = crypto.createHash('sha256').update(jsonContent).digest('hex');
const holdoutCases = dataset.filter(c => c.split === 'HOLDOUT');
const holdoutSha256 = crypto.createHash('sha256').update(JSON.stringify(holdoutCases)).digest('hex');

console.log('Generated AG004-EVAL-001 with 170 cases:');
console.log(`  • Training   : ${dataset.filter(c => c.split === 'TRAINING').length} / 102`);
console.log(`  • Validation : ${dataset.filter(c => c.split === 'VALIDATION').length} / 34`);
console.log(`  • Holdout    : ${dataset.filter(c => c.split === 'HOLDOUT').length} / 34`);
console.log(`  • Total      : ${dataset.length} / 170`);
console.log(`  • Dataset SHA-256 : ${datasetSha256}`);
console.log(`  • Holdout SHA-256 : ${holdoutSha256}`);
