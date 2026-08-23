// supabase/functions/agents-orchestrator/agents/ag013/tests/fixtures/generate_ag013_deterministic_dataset.js
// Deterministic Dataset Generator for AG013-DET-EVAL-001 (260 Cases across 22 Groups)
// Frozen under Token: AG013-BAD-ACTOR-ENGINE-001

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
    { name: 'ASSET_POPULATION', count: 12 },
    { name: 'PEER_GROUPS', count: 12 },
    { name: 'M010_ASSET_IDENTITY', count: 10 },
    { name: 'M011_HEALTH_RISK', count: 10 },
    { name: 'AG008_FAILURE_INTELLIGENCE', count: 14 },
    { name: 'AG007_ECONOMICS', count: 14 },
    { name: 'AG010_RCA', count: 8 },
    { name: 'AG011_MEMORY', count: 8 },
    { name: 'AG012_STRATEGY', count: 10 },
    { name: 'EXPOSURE', count: 14 },
    { name: 'DATA_QUALITY', count: 12 },
    { name: 'ELIGIBILITY_SUFFICIENCY', count: 14 },
    { name: 'FAILURE_BURDEN', count: 12 },
    { name: 'CHRONICITY', count: 16 },
    { name: 'ECONOMIC_BURDEN', count: 12 },
    { name: 'INTERVENTION_EFFECTIVENESS', count: 10 },
    { name: 'CONFLICTS', count: 10 },
    { name: 'HARD_RULES', count: 12 },
    { name: 'CLASSIFICATION', count: 16 },
    { name: 'RANKING_TIE_BREAK', count: 16 },
    { name: 'TEMPORAL_TRACEABILITY', count: 10 },
    { name: 'GOVERNANCE_NO_AI', count: 8 }
  ];

  const allCases = [];
  let caseIndex = 1;

  for (const group of groups) {
    for (let i = 0; i < group.count; i++) {
      const caseId = `AG013-DET-${String(caseIndex).padStart(3, '0')}`;
      const machineNum = (caseIndex % 30) + 1;
      const assetId = `TELAR-${String(machineNum).padStart(3, '0')}`;

      let expClass = 'NOT_BAD_ACTOR';
      let health = 85;
      let failCount = 1;
      let recurrence = 0.0;
      let reincidence30d = 0;
      let cost = 12000;
      let mci = 0.05;
      let variance = 0.0;
      let opHours = 2000;
      let strat = 'REPAIR';
      let trend = 'STABLE';

      if (group.name === 'CHRONICITY' || group.name === 'CLASSIFICATION') {
        if (i % 4 === 1) {
          expClass = 'WATCHLIST';
          health = 60;
          failCount = 6;
          recurrence = 0.35;
          reincidence30d = 1;
          cost = 75000;
          trend = 'INCREASING';
        } else if (i % 4 === 2) {
          expClass = 'BAD_ACTOR';
          health = 50;
          failCount = 8;
          recurrence = 0.50;
          reincidence30d = 2;
          cost = 110000;
          mci = 0.45;
          trend = 'INCREASING';
        } else if (i % 4 === 3) {
          expClass = 'SEVERE_BAD_ACTOR';
          health = 35;
          failCount = 14;
          recurrence = 0.75;
          reincidence30d = 4;
          cost = 250000;
          mci = 0.65;
          trend = 'INCREASING';
        }
      } else if (group.name === 'HARD_RULES') {
        if (i % 3 === 0) {
          expClass = 'INSUFFICIENT_DATA';
        } else if (i % 3 === 1) {
          expClass = 'NOT_BAD_ACTOR';
          health = 88;
          failCount = 1;
          recurrence = 0.0;
        } else {
          expClass = 'SEVERE_BAD_ACTOR';
          health = 25;
          failCount = 15;
          recurrence = 0.80;
          reincidence30d = 4;
          cost = 300000;
          trend = 'INCREASING';
        }
      } else if (group.name === 'ELIGIBILITY_SUFFICIENCY') {
        if (i % 2 === 0) {
          expClass = 'INSUFFICIENT_DATA';
        } else {
          expClass = 'NOT_BAD_ACTOR';
        }
      } else if (group.name === 'AG012_STRATEGY') {
        // Demonstrate that REPLACE != BAD ACTOR automatically
        strat = 'REPLACE';
        expClass = 'NOT_BAD_ACTOR';
        health = 82;
        failCount = 1;
      } else if (group.name === 'AG008_FAILURE_INTELLIGENCE') {
        // Demonstrate that TOP FAILURE != BAD ACTOR automatically if non-chronic & isolated
        failCount = 10;
        recurrence = 0.05;
        health = 80;
        expClass = 'NOT_BAD_ACTOR';
      } else if (group.name === 'AG007_ECONOMICS') {
        // Demonstrate that TOP COST != BAD ACTOR automatically if single planned overhaul
        cost = 350000;
        failCount = 1;
        health = 85;
        expClass = 'NOT_BAD_ACTOR';
      }

      const singleAssetInput = {
        asset_raw: {
          id: assetId,
          codigo_maquina: assetId,
          nombre: `Telar de Toallas ${assetId}`,
          area: 'TEJIDO',
          linea: 'LINEA_01',
          machine_family: 'TERRY_LOOM',
          criticality: 'HIGH',
          activo: true,
          operating_hours_window: opHours
        },
        ag008_context: expClass === 'INSUFFICIENT_DATA' ? null : {
          failure_count_window: failCount,
          recurrence_rate: recurrence,
          reincidence_count_30d: reincidence30d,
          downtime_hours: failCount * 2.5,
          mtbf_hours: 350,
          mttr_hours: 2.5,
          trend: trend
        },
        ag007_context: expClass === 'INSUFFICIENT_DATA' ? null : {
          maintenance_cost_window: cost,
          budget_window: 100000,
          budget_variance: variance,
          estimated_replacement_cost: 500000,
          mci,
          currency: 'MXN'
        },
        m011_context: expClass === 'INSUFFICIENT_DATA' ? null : {
          health_score: health,
          risk_score: 100 - health
        },
        ag010_context: {
          has_confirmed_rca: expClass.includes('BAD_ACTOR'),
          root_cause: expClass.includes('BAD_ACTOR') ? 'Desgaste prematuro de rodamientos de biela' : undefined
        },
        ag011_context: {
          has_approved_memory: true,
          repeated_unsuccessful_interventions_count: reincidence30d
        },
        ag012_context: {
          recommended_strategy: strat
        }
      };

      const request = {
        request_id: `REQ-${caseId}`,
        event_id: `EVT-${caseId}`,
        correlation_id: `CORR-${caseId}`,
        evaluation_at: '2026-08-22T23:00:00.000Z',
        population_scope: 'PLANT_WIDE',
        analysis_window: 'ROLLING_180D',
        consumer: 'AG001_CAPATAZ',
        assets: [singleAssetInput]
      };

      const item = {
        case_id: caseId,
        group: group.name,
        description: `Evaluación Determinística ${caseId} (${group.name})`,
        request,
        expected: {
          success: true,
          asset_id: assetId,
          classification: expClass,
          rank: 1,
          requires_engineering_review: expClass === 'BAD_ACTOR' || expClass === 'SEVERE_BAD_ACTOR'
        }
      };

      // Security edge case
      if (group.name === 'GOVERNANCE_NO_AI' && i === 0) {
        item.description = 'Inyección SQL en payload de solicitud -> Rechazo de seguridad';
        item.request.sql_injection = 'DROP TABLE cat_maquinas;';
        item.expected.success = false;
        item.expected.error_contains = 'AG013_SECURITY_REJECTION';
      }

      allCases.push(item);
      caseIndex++;
    }
  }

  const datasetCanonical = canonicalJsonStringify(allCases);
  const datasetSha = crypto.createHash('sha256').update(datasetCanonical, 'utf8').digest('hex');

  const datasetPath = path.join(__dirname, 'ag013-det-eval-260.json');
  fs.writeFileSync(datasetPath, JSON.stringify(allCases, null, 2), 'utf8');

  console.log(`Generated ${allCases.length} deterministic cases in ${datasetPath}`);
  console.log(`Dataset SHA-256: ${datasetSha}`);
}

generateDataset();
