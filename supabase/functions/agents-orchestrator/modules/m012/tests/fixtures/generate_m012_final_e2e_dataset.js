// supabase/functions/agents-orchestrator/modules/m012/tests/fixtures/generate_m012_final_e2e_dataset.js
// Final E2E Dataset Generator for M012-EVAL-001 (170 Cases: 102 Train / 34 Val / 34 Holdout)
// Frozen under Token: M012-1.0-FROZEN

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

function generateFinalE2EDataset() {
  const groups = [
    { name: 'AG001_GOVERNANCE', count: 8 },
    { name: 'OT_IDENTITY_STATE', count: 10 },
    { name: 'ASSET_IDENTITY', count: 10 },
    { name: 'SCOPE_PRESERVATION', count: 12 },
    { name: 'M010_M011_CONTEXT', count: 8 },
    { name: 'AG011_MEMORY', count: 12 },
    { name: 'PARTS_READINESS', count: 14 },
    { name: 'TOOLS_RESOURCES', count: 10 },
    { name: 'CHECKLIST_RESOLUTION', count: 14 },
    { name: 'DEPENDENCIES', count: 8 },
    { name: 'SAFETY_DEPENDENCIES', count: 10 },
    { name: 'DATA_GAPS', count: 10 },
    { name: 'READINESS', count: 14 },
    { name: 'TEMPORAL_SEMANTICS', count: 10 },
    { name: 'TRACEABILITY_AUDIT', count: 8 },
    { name: 'SECURITY_NO_AI', count: 12 }
  ];

  const allCases = [];
  let caseIndex = 1;

  for (const group of groups) {
    for (let i = 0; i < group.count; i++) {
      const caseId = `M012-EVAL-${String(caseIndex).padStart(3, '0')}`;
      const otId = `OT-2026-${String(caseIndex).padStart(4, '0')}`;
      const machineNum = (caseIndex % 30) + 1;
      const assetId = `TELAR-${String(machineNum).padStart(3, '0')}`;

      // Assign split: 1-102 Training (60%), 103-136 Validation (20%), 137-170 Final Holdout (20%)
      let split = 'TRAINING';
      if (caseIndex > 102 && caseIndex <= 136) {
        split = 'VALIDATION';
      } else if (caseIndex > 136) {
        split = 'FINAL_HOLDOUT';
      }

      let mType = 'CORRECTIVE';
      if (i % 4 === 0) mType = 'PREVENTIVE';
      else if (i % 4 === 1) mType = 'PREDICTIVE';
      else if (i % 4 === 2) mType = 'AUTONOMOUS';
      else if (i % 4 === 3 && i > 8) mType = 'OVERHAUL';

      const item = {
        case_id: caseId,
        split,
        group: group.name,
        description: `Caso ${caseId} (${split}) para evaluación E2E final del grupo ${group.name}`,
        request: {
          request_id: `REQ-${caseId}`,
          work_order_id: otId,
          asset_id: assetId,
          evaluation_at: '2026-08-22T20:00:00.000Z',
          consumer: 'AG001_CAPATAZ',
          work_order_raw: {
            id: otId,
            maquina_id: assetId,
            titulo: `Intervención gobernada para ${assetId}`,
            descripcion: `Mantenimiento ${mType.toLowerCase()} sobre mecanismo de inserción`,
            tipo_mantenimiento: mType,
            estado: 'PENDING',
            component_id: 'MOTOR_PRINCIPAL',
            departamento: 'PF',
            actividades_solicitadas: [
              'Desmontar motor principal',
              'Inspeccionar rodamiento 6205',
              'Verificar alineación de polea'
            ],
            refacciones_planificadas: [
              { id: 'ROD-6205', descripcion: 'Rodamiento 6205-2RS', quantity: 1, stock_status: 'AVAILABLE_IN_STOCK' }
            ],
            herramientas_documentadas: [
              { tool_id: 'EXT-MEC-01', descripcion: 'Extractor mecánico de 3 garras', classification: 'REQUIRED' }
            ],
            dependencias_raw: [],
            seguridad_raw: [
              { id: 'SAF-01', type: 'LOTO_REQUIRED', description: 'Bloqueo eléctrico principal' }
            ]
          },
          asset_raw: {
            codigo_maquina: assetId,
            modelo: 'TSUDAKOMA ZAX9100',
            familia: 'TELAR DE AIRE',
            area: 'PF',
            criticidad: 'A'
          },
          m010_context: {
            summary: `Expediente del activo ${assetId} con 8 intervenciones previas`,
            interventions: [
              { id: 'INT-01', created_at: '2026-08-10T10:00:00.000Z', description: 'Cambio de banda' }
            ],
            failures: []
          },
          m011_context: {
            health_score: 85,
            risk_score: 24
          },
          ag011_memories: [
            {
              memory_id: `MEM-ZAX-${String(caseIndex).padStart(3, '0')}`,
              version: '1.0',
              status: 'APPROVED',
              applicability: 'DIRECTLY_APPLICABLE',
              key_procedure_steps: ['Paso 1: Bloquear energía', 'Paso 2: Extraer rodamiento'],
              critical_precautions: ['Verificar energía cero antes de abrir caja'],
              limitations: ['No golpear directamente el eje'],
              relevance_score: 0.96,
              created_at: '2026-08-15T12:00:00.000Z'
            }
          ]
        },
        expected: {
          success: true,
          work_order_id: otId,
          asset_id: assetId,
          maintenance_type: mType,
          readiness_status: 'READY',
          ready_for_execution: true,
          safety_handoff_required: true,
          llm_calls: 0,
          tokens: 0,
          cost_usd: 0
        }
      };

      // Critical Edge & Boundary Cases
      if (group.name === 'OT_IDENTITY_STATE' && i === 0) {
        item.description = 'OT no encontrada en base de datos -> Bloqueo con error seguro';
        item.request.work_order_raw = null;
        item.expected.success = false;
        item.expected.error_contains = 'M012_WORK_ORDER_NOT_FOUND';
      } else if (group.name === 'ASSET_IDENTITY' && i === 0) {
        item.description = 'Discrepancia de máquina -> Bloqueo por cross-asset';
        item.request.asset_id = 'TELAR-888';
        item.expected.success = false;
        item.expected.error_contains = 'M012_CROSS_ASSET_VIOLATION';
      } else if (group.name === 'DATA_GAPS' && i === 0) {
        item.description = 'Información técnica contradictoria -> REVIEW_REQUIRED';
        item.request.work_order_raw.has_conflicting_data = true;
        item.request.work_order_raw.conflict_description = 'Conflicto de especificación técnica';
        item.expected.readiness_status = 'REVIEW_REQUIRED';
        item.expected.ready_for_execution = false;
      } else if (group.name === 'PARTS_READINESS' && i === 0) {
        item.description = 'Refacción requerida agotada en almacén -> BLOCKED_MISSING_RESOURCE';
        item.request.work_order_raw.refacciones_planificadas[0].stock_status = 'OUT_OF_STOCK';
        item.expected.readiness_status = 'BLOCKED_MISSING_RESOURCE';
        item.expected.ready_for_execution = false;
      } else if (group.name === 'SECURITY_NO_AI' && i === 0) {
        item.description = 'Intento de inyección de parámetros SQL maliciosos -> Rechazo inmediato';
        item.request.sql = 'DROP TABLE ordenes_trabajo;';
        item.expected.success = false;
        item.expected.error_contains = 'M012_SECURITY_REJECTION';
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

  const datasetPath = path.join(__dirname, 'm012-final-eval-170.json');
  fs.writeFileSync(datasetPath, JSON.stringify(allCases, null, 2), 'utf8');

  console.log(`Generated ${allCases.length} final cases in ${datasetPath}`);
  console.log(`  - Training Split:      ${allCases.filter(c => c.split === 'TRAINING').length} cases`);
  console.log(`  - Validation Split:    ${allCases.filter(c => c.split === 'VALIDATION').length} cases`);
  console.log(`  - Final Holdout Split: ${holdoutCases.length} cases`);
  console.log(`  - Dataset SHA-256:     ${datasetSha}`);
  console.log(`  - Holdout SHA-256:     ${holdoutSha}`);
}

generateFinalE2EDataset();
