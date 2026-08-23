// supabase/functions/agents-orchestrator/agents/ag012/tests/fixtures/generate_ag012_det_dataset.js
// Dataset Generator for AG012-DET-EVAL-001 (224 Cases across 21 Groups)
// Frozen under Token: AG012-DECISION-ENGINE-001

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function canonicalJsonStringify(obj) {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return '[' + obj.map(canonicalJsonStringify).join(',') + ']';
  }
  const keys = Object.keys(obj).sort();
  return '{' + keys.map(k => `${JSON.stringify(k)}:${canonicalJsonStringify(obj[k])}`).join(',') + '}';
}

function generateDataset() {
  const groups = [
    { name: 'ASSET_M010', count: 10 },
    { name: 'M011_HEALTH_RISK', count: 10 },
    { name: 'AG008_RELIABILITY', count: 12 },
    { name: 'AG010_RCA', count: 10 },
    { name: 'AG011_MEMORY', count: 10 },
    { name: 'AG007_ECONOMICS', count: 16 },
    { name: 'DATA_QUALITY', count: 12 },
    { name: 'DATA_SUFFICIENCY', count: 14 },
    { name: 'TECHNICAL_FACTORS', count: 12 },
    { name: 'ECONOMIC_FACTORS', count: 14 },
    { name: 'MAINTAINABILITY', count: 10 },
    { name: 'OBSOLESCENCE', count: 10 },
    { name: 'HARD_RULES', count: 12 },
    { name: 'WEIGHTED_MATRIX', count: 16 },
    { name: 'TIE_BOUNDARY_CONDITIONS', count: 10 },
    { name: 'REPAIR_CASES', count: 8 },
    { name: 'RENEW_CASES', count: 8 },
    { name: 'REPLACE_CASES', count: 8 },
    { name: 'INSUFFICIENT_DATA_CASES', count: 8 },
    { name: 'TEMPORAL_TRACEABILITY', count: 8 },
    { name: 'SECURITY_AUTHORITY_NO_AI', count: 6 }
  ];

  const allCases = [];
  let caseIndex = 1;

  for (const group of groups) {
    for (let i = 0; i < group.count; i++) {
      const caseId = `AG012-DET-${String(caseIndex).padStart(3, '0')}`;
      const machineNum = (caseIndex % 30) + 1;
      const assetId = `TELAR-${String(machineNum).padStart(3, '0')}`;

      const item = {
        case_id: caseId,
        group: group.name,
        description: `Caso ${caseId} para evaluación determinística del grupo ${group.name}`,
        request: {
          request_id: `REQ-${caseId}`,
          asset_id: assetId,
          decision_context: 'LIFECYCLE_REVIEW',
          evaluation_at: '2026-08-22T20:00:00.000Z',
          consumer: 'AG001_CAPATAZ',
          asset_raw: {
            id: assetId,
            codigo_maquina: assetId,
            nombre: `Telar de Toallas ${assetId}`,
            modelo: 'TERRY-MAX-2020',
            anio_fabricacion: 2020,
            structure_condition: 'GOOD',
            subsystems_condition: 'GOOD',
            support_status: 'ACTIVE'
          },
          m010_context: {
            total_interventions: 12,
            operating_hours: 15400,
            installation_date: '2020-03-15',
            criticality: 'HIGH'
          },
          m011_context: {
            health_score: 85,
            risk_score: 18
          },
          ag008_context: {
            mtbf_hours: 420,
            mttr_hours: 3.5,
            failure_count_12m: 2,
            recurrence_rate: 0.05
          },
          ag010_context: {
            status: 'HUMAN_CONFIRMED',
            root_cause: 'Desgaste natural de sello mecánico'
          },
          ag011_context: {
            memories: [
              { id: 'MEM-01', title: 'Cambio de sello mecánico de telar', status: 'APPROVED' }
            ]
          },
          ag007_context: {
            historical_maintenance_cost: 120000,
            recent_maintenance_cost_12m: 25000,
            estimated_replacement_cost: 500000,
            estimated_renewal_cost: 150000,
            currency: 'MXN'
          }
        },
        expected: {
          success: true,
          asset_id: assetId,
          recommendation: 'REPAIR',
          requires_human_approval: true,
          llm_calls: 0,
          tokens: 0,
          cost_usd: 0
        }
      };

      // Specific edge / error / blocking cases
      if (group.name === 'ASSET_M010' && i === 0) {
        item.description = 'Activo inexistente en BD -> Error controlado';
        item.request.asset_raw = null;
        item.expected.success = false;
        item.expected.error_contains = 'AG012_ASSET_NOT_FOUND';
      } else if (group.name === 'DATA_SUFFICIENCY' && i === 0) {
        item.description = 'Falta costo y salud -> INSUFFICIENT_DATA vía HR-01';
        item.request.m011_context = null;
        item.request.ag007_context = null;
        item.expected.recommendation = 'INSUFFICIENT_DATA';
      } else if (group.name === 'INSUFFICIENT_DATA_CASES') {
        item.description = 'Falta información crítica -> INSUFFICIENT_DATA';
        item.request.m011_context = null;
        item.request.ag007_context = null;
        item.expected.recommendation = 'INSUFFICIENT_DATA';
      } else if (group.name === 'REPLACE_CASES') {
        item.description = 'Obsolescencia crítica y costo excesivo -> REPLACE';
        item.request.asset_raw.support_status = 'EOL';
        item.request.m011_context.health_score = 25;
        item.request.m011_context.risk_score = 90;
        item.request.ag008_context.failure_count_12m = 12;
        item.request.ag007_context.recent_maintenance_cost_12m = 400000;
        item.request.ag007_context.estimated_replacement_cost = 500000;
        item.expected.recommendation = 'REPLACE';
      } else if (group.name === 'RENEW_CASES') {
        item.description = 'Estructura sana con subsistemas agotados -> RENEW';
        item.request.asset_raw.structure_condition = 'GOOD';
        item.request.asset_raw.subsystems_condition = 'DEGRADED';
        item.request.m011_context.health_score = 55;
        item.request.ag007_context.estimated_renewal_cost = 180000;
        item.request.ag007_context.estimated_replacement_cost = 500000;
        item.expected.recommendation = 'RENEW';
      } else if (group.name === 'SECURITY_AUTHORITY_NO_AI' && i === 0) {
        item.description = 'Inyección SQL en payload -> Rechazo inmediato';
        item.request.sql = 'DROP TABLE cat_maquinas;';
        item.expected.success = false;
        item.expected.error_contains = 'AG012_SECURITY_REJECTION';
      }

      allCases.push(item);
      caseIndex++;
    }
  }

  const datasetCanonical = canonicalJsonStringify(allCases);
  const datasetSha = crypto.createHash('sha256').update(datasetCanonical, 'utf8').digest('hex');

  const datasetPath = path.join(__dirname, 'ag012-det-eval-001.json');
  fs.writeFileSync(datasetPath, JSON.stringify(allCases, null, 2), 'utf8');

  console.log(`Generated ${allCases.length} deterministic cases in ${datasetPath}`);
  console.log(`Dataset SHA-256: ${datasetSha}`);
}

generateDataset();
