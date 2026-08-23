// supabase/functions/agents-orchestrator/agents/ag012/tests/fixtures/generate_ag012_sem_dataset.js
// Dataset Generator for AG012-SEM-EVAL-001 (60 Cases: 36 Training / 12 Validation / 12 Final Holdout)
// Frozen under Token: AG012-SEMANTIC-LAYER-001

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

function generateSemanticDataset() {
  const splits = [
    { split: 'TRAINING', count: 36 },
    { split: 'VALIDATION', count: 12 },
    { split: 'FINAL_HOLDOUT', count: 12 }
  ];

  const allCases = [];
  let caseIndex = 1;

  for (const s of splits) {
    for (let i = 0; i < s.count; i++) {
      const caseId = `AG012-SEM-${String(caseIndex).padStart(3, '0')}`;
      const machineNum = (caseIndex % 25) + 1;
      const assetId = `TELAR-${String(machineNum).padStart(3, '0')}`;

      // Distribute scenarios: REPAIR, RENEW, REPLACE, INSUFFICIENT_DATA
      let rec = 'REPAIR';
      let description = `Caso semántico ${caseId} (${s.split})`;

      if (i % 4 === 1) {
        rec = 'RENEW';
      } else if (i % 4 === 2) {
        rec = 'REPLACE';
      } else if (i % 4 === 3) {
        rec = 'INSUFFICIENT_DATA';
      }

      const deterministicPkg = {
        asset_id: assetId,
        evaluation_at: '2026-08-22T21:00:00.000Z',
        decision_context: 'LIFECYCLE_REVIEW',
        recommendation: rec,
        decision_scores: [
          { dimension: 'Confiabilidad y Frecuencia de Fallas', weight_percentage: 25, raw_score: 80, weighted_score: 20, description: 'Score de confiabilidad: 80/100.' },
          { dimension: 'Carga Económica de Mantenimiento', weight_percentage: 25, raw_score: 75, weighted_score: 18.75, description: 'Score económico: 75/100.' },
          { dimension: 'Viabilidad Técnica y Reparabilidad', weight_percentage: 20, raw_score: 85, weighted_score: 17, description: 'Score técnico: 85/100.' },
          { dimension: 'Mantenibilidad y Soporte de Servicio', weight_percentage: 15, raw_score: 70, weighted_score: 10.5, description: 'Score mantenibilidad: 70/100.' },
          { dimension: 'Vigencia Tecnológica y Ciclo de Vida', weight_percentage: 15, raw_score: 80, weighted_score: 12, description: 'Score obsolescencia: 80/100.' }
        ],
        hard_rules_applied: [
          { rule_code: 'HR-01', triggered: rec === 'INSUFFICIENT_DATA', forced_recommendation: rec === 'INSUFFICIENT_DATA' ? 'INSUFFICIENT_DATA' : undefined, description: 'HR-01 status' }
        ],
        data_quality: {
          data_sufficiency_index: rec === 'INSUFFICIENT_DATA' ? 40 : 85,
          sufficiency_level: rec === 'INSUFFICIENT_DATA' ? 'INSUFFICIENT' : 'HIGH',
          certified_facts_count: rec === 'INSUFFICIENT_DATA' ? 2 : 6,
          total_required_facts_count: 7,
          missing_critical_fields: rec === 'INSUFFICIENT_DATA' ? ['recent_maintenance_cost_12m', 'health_score'] : []
        },
        decision_facts: [
          { factor_id: 'FACT-TECH-01', category: 'TECHNICAL', name: 'asset_identity', value: assetId, source_agent: 'M-010', source_reference: `cat_maquinas:${assetId}`, timestamp: '2026-08-22T21:00:00.000Z', quality: 'CERTIFIED' },
          { factor_id: 'FACT-REL-01', category: 'RELIABILITY', name: 'health_score', value: 85, unit: 'points (0-100)', source_agent: 'M-011', source_reference: 'M011_HEALTH_EVALUATION', timestamp: '2026-08-22T21:00:00.000Z', quality: 'CERTIFIED' },
          { factor_id: 'FACT-ECON-01', category: 'ECONOMIC', name: 'recent_maintenance_cost_12m', value: 25000, unit: 'MXN', source_agent: 'AG-007', source_reference: 'AG007_COST_NORMALIZED', timestamp: '2026-08-22T21:00:00.000Z', quality: 'CERTIFIED' }
        ],
        missing_information: rec === 'INSUFFICIENT_DATA' ? ['recent_maintenance_cost_12m', 'health_score'] : [],
        requires_human_approval: true,
        traceability: {
          evaluation_at: '2026-08-22T21:00:00.000Z',
          decision_engine_version: '1.0',
          data_map_token: 'AG012-DATA-MAP-001',
          deterministic_sha256: 'c07710378546100616f1394fe558be2d18fb29c9e20d8ceeac710cc472b3a1b8',
          total_facts_count: 3,
          all_facts_traceable: true
        }
      };

      const mockResponse = {
        recommendation_echo: rec,
        executive_summary: `El motor determinístico recomienda ${rec} para el activo ${assetId} con base en la evaluación multicriterio y reglas duras certificadas.`,
        key_technical_drivers: ['Salud técnica verificada en M-011', 'Procedimiento de reparación disponible en memoria técnica'],
        key_economic_drivers: ['Costo de mantenimiento dentro de umbrales sostenibles'],
        strategic_risks: ['Monitoreo continuo de vibraciones y sellos requerido'],
        limitations_and_missing_data: rec === 'INSUFFICIENT_DATA' ? ['Faltan registros de costos y salud recientes'] : [],
        reevaluation_triggers: ['Cambio en condición estructural o incremento severo de fallas'],
        cited_fact_ids: ['FACT-TECH-01', 'FACT-REL-01', 'FACT-ECON-01']
      };

      const item = {
        case_id: caseId,
        split: s.split,
        description,
        execution_mode: s.split === 'FINAL_HOLDOUT' ? 'REAL_MIMO' : 'MOCK',
        deterministic_package: deterministicPkg,
        upstream_sha256: 'c07710378546100616f1394fe558be2d18fb29c9e20d8ceeac710cc472b3a1b8',
        mock_response: mockResponse,
        expected: {
          success: true,
          recommendation: rec,
          protected_field_diff: 0,
          reference_validity: 100,
          prompt_injection_success: 0
        }
      };

      // Inyección o intento de override en testing
      if (s.split === 'TRAINING' && i === 30) {
        item.description = 'Intento de override en recomendación -> Detectado y Rechazado';
        item.deterministic_package.recommendation = 'REPAIR';
        item.mock_response.recommendation_echo = 'REPLACE'; // Violación explícita
        item.expected.success = false;
        item.expected.error_contains = 'AG012_PROTECTED_FIELD_VIOLATION';
      } else if (s.split === 'TRAINING' && i === 31) {
        item.description = 'Factor citado inexistente -> Detectado y Rechazado';
        item.mock_response.cited_fact_ids.push('FACT-INVENTED-99');
        item.expected.success = false;
        item.expected.error_contains = 'AG012_REFERENCE_ERROR';
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

  const datasetPath = path.join(__dirname, 'ag012-sem-eval-001.json');
  fs.writeFileSync(datasetPath, JSON.stringify(allCases, null, 2), 'utf8');

  console.log(`Generated ${allCases.length} semantic cases in ${datasetPath}`);
  console.log(`Semantic Dataset SHA-256: ${datasetSha}`);
  console.log(`Semantic Holdout SHA-256: ${holdoutSha}`);
}

generateSemanticDataset();
