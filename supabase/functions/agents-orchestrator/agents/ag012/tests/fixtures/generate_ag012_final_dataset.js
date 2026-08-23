// supabase/functions/agents-orchestrator/agents/ag012/tests/fixtures/generate_ag012_final_dataset.js
// Dataset Generator for AG012-EVAL-001 (170 Cases: 102 Train / 34 Val / 34 Holdout across 18 Groups)
// Frozen under Token: AG012-1.0-FROZEN

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

function generateFinalDataset() {
  const groups = [
    { name: 'AG001_GOVERNANCE', count: 8 },
    { name: 'ASSET_M010', count: 8 },
    { name: 'M011_HEALTH_RISK', count: 8 },
    { name: 'AG008_RELIABILITY', count: 8 },
    { name: 'AG010_RCA', count: 8 },
    { name: 'AG011_MEMORY', count: 8 },
    { name: 'AG007_ECONOMICS', count: 12 },
    { name: 'DATA_QUALITY_SUFFICIENCY', count: 12 },
    { name: 'TECHNICAL_RELIABILITY_FACTORS', count: 10 },
    { name: 'ECONOMIC_MAINTAINABILITY_OBSOLESCENCE', count: 12 },
    { name: 'HARD_RULES_CONFLICTS', count: 10 },
    { name: 'DECISION_MATRIX', count: 12 },
    { name: 'REPAIR_CASES', count: 8 },
    { name: 'RENEW_CASES', count: 8 },
    { name: 'REPLACE_CASES', count: 8 },
    { name: 'INSUFFICIENT_DATA_CASES', count: 8 },
    { name: 'MIMO_SEMANTIC_INTEGRITY', count: 12 },
    { name: 'SECURITY_AUTHORITY_NO_ACTIONS', count: 10 }
  ];

  const allCases = [];
  let caseIndex = 1;

  for (const group of groups) {
    for (let i = 0; i < group.count; i++) {
      const caseId = `AG012-EVAL-${String(caseIndex).padStart(3, '0')}`;
      const machineNum = (caseIndex % 30) + 1;
      const assetId = `TELAR-${String(machineNum).padStart(3, '0')}`;

      // Assign split: 102 Train (60%), 34 Val (20%), 34 Holdout (20%)
      let split = 'TRAINING';
      if (caseIndex > 136) {
        split = 'FINAL_HOLDOUT';
      } else if (caseIndex > 102) {
        split = 'VALIDATION';
      }

      let rec = 'REPAIR';
      if (group.name === 'RENEW_CASES' || (i % 4 === 1 && !group.name.includes('REPAIR'))) {
        rec = 'RENEW';
      } else if (group.name === 'REPLACE_CASES' || (i % 4 === 2 && !group.name.includes('REPAIR'))) {
        rec = 'REPLACE';
      } else if (group.name === 'INSUFFICIENT_DATA_CASES' || (i % 4 === 3 && !group.name.includes('REPAIR'))) {
        rec = 'INSUFFICIENT_DATA';
      }

      const request = {
        request_id: `REQ-${caseId}`,
        event_id: `EVT-${caseId}`,
        correlation_id: `CORR-${caseId}`,
        asset_id: assetId,
        decision_context: 'LIFECYCLE_REVIEW',
        evaluation_at: '2026-08-22T22:00:00.000Z',
        consumer: 'AG001_CAPATAZ',
        asset_raw: {
          id: assetId,
          codigo_maquina: assetId,
          nombre: `Telar de Toallas ${assetId}`,
          modelo: 'TERRY-MAX-2020',
          anio_fabricacion: 2020,
          structure_condition: rec === 'RENEW' ? 'GOOD' : 'GOOD',
          subsystems_condition: rec === 'RENEW' ? 'DEGRADED' : 'GOOD',
          support_status: rec === 'REPLACE' ? 'EOL' : 'ACTIVE'
        },
        m010_context: {
          total_interventions: 12,
          operating_hours: 15400,
          installation_date: '2020-03-15',
          criticality: 'HIGH'
        },
        m011_context: {
          health_score: rec === 'RENEW' ? 55 : (rec === 'REPLACE' ? 25 : (rec === 'INSUFFICIENT_DATA' ? undefined : 82)),
          risk_score: rec === 'REPLACE' ? 90 : 18
        },
        ag008_context: {
          mtbf_hours: 420,
          mttr_hours: 3.5,
          failure_count_12m: rec === 'REPLACE' ? 12 : (rec === 'RENEW' ? 4 : 2),
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
          recent_maintenance_cost_12m: rec === 'INSUFFICIENT_DATA' ? undefined : (rec === 'REPLACE' ? 420000 : 25000),
          estimated_replacement_cost: 500000,
          estimated_renewal_cost: 180000,
          currency: 'MXN'
        }
      };

      if (rec === 'INSUFFICIENT_DATA') {
        request.m011_context = null;
        request.ag007_context = null;
      }

      const mockSemanticResponse = {
        recommendation_echo: rec,
        executive_summary: `El motor determinístico recomienda ${rec} para el activo ${assetId} con base en la evaluación multicriterio y reglas duras certificadas.`,
        key_technical_drivers: ['Salud técnica verificada en M-011', 'Procedimiento de reparación disponible en memoria técnica'],
        key_economic_drivers: ['Costo de mantenimiento dentro de umbrales sostenibles'],
        strategic_risks: ['Monitoreo continuo de vibraciones y sellos requerido'],
        limitations_and_missing_data: rec === 'INSUFFICIENT_DATA' ? ['Faltan registros de costos y salud recientes'] : [],
        reevaluation_triggers: ['Cambio en condición estructural o incremento severo de fallas'],
        cited_fact_ids: rec === 'INSUFFICIENT_DATA' ? ['FACT-TECH-01'] : ['FACT-TECH-01', 'FACT-REL-01', 'FACT-ECON-01']
      };

      const item = {
        case_id: caseId,
        group: group.name,
        split,
        description: `Caso E2E ${caseId} (${group.name} - ${split})`,
        execution_mode: split === 'FINAL_HOLDOUT' ? 'REAL_MIMO' : 'FAST_PATH',
        request,
        mock_semantic_response: mockSemanticResponse,
        expected: {
          success: true,
          asset_id: assetId,
          recommendation: rec,
          requires_human_approval: true,
          protected_field_diff: 0,
          semantic_reference_validity: 100,
          prompt_injection_success: 0
        }
      };

      // Security and edge cases
      if (group.name === 'SECURITY_AUTHORITY_NO_ACTIONS' && i === 0) {
        item.description = 'Inyección SQL en payload E2E -> Rechazo inmediato';
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

  const holdoutCases = allCases.filter(c => c.split === 'FINAL_HOLDOUT');
  const holdoutCanonical = canonicalJsonStringify(holdoutCases);
  const holdoutSha = crypto.createHash('sha256').update(holdoutCanonical, 'utf8').digest('hex');

  const datasetPath = path.join(__dirname, 'ag012-final-eval-170.json');
  fs.writeFileSync(datasetPath, JSON.stringify(allCases, null, 2), 'utf8');

  console.log(`Generated ${allCases.length} final E2E cases in ${datasetPath}`);
  console.log(`Training Cases:      ${allCases.filter(c => c.split === 'TRAINING').length}`);
  console.log(`Validation Cases:    ${allCases.filter(c => c.split === 'VALIDATION').length}`);
  console.log(`Final Holdout Cases: ${holdoutCases.length}`);
  console.log(`Final Dataset SHA-256: ${datasetSha}`);
  console.log(`Final Holdout SHA-256: ${holdoutSha}`);
}

generateFinalDataset();
