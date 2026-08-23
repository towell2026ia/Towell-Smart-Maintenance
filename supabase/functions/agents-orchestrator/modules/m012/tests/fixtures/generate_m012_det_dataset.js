// supabase/functions/agents-orchestrator/modules/m012/tests/fixtures/generate_m012_det_dataset.js
// Generator for M012-DET-EVAL-001 Dataset (196 Cases across 16 Groups)
// Frozen under Token: M012-PREPARATION-ENGINE-001

const fs = require('fs');
const path = require('path');

function generateDataset() {
  const cases = [];

  const groups = [
    { name: 'OT_IDENTITY_STATE', count: 12 },
    { name: 'ASSET_IDENTITY', count: 12 },
    { name: 'SCOPE_SNAPSHOT', count: 12 },
    { name: 'M010_CONTEXT', count: 10 },
    { name: 'M011_BOUNDARIES', count: 10 },
    { name: 'AG011_MEMORY', count: 14 },
    { name: 'PARTS_READINESS', count: 16 },
    { name: 'TOOLS_RESOURCES', count: 12 },
    { name: 'CHECKLIST_RESOLUTION', count: 16 },
    { name: 'DEPENDENCIES', count: 10 },
    { name: 'SAFETY_DEPENDENCIES', count: 12 },
    { name: 'DATA_GAPS', count: 12 },
    { name: 'READINESS', count: 16 },
    { name: 'TEMPORAL_SEMANTICS', count: 12 },
    { name: 'TRACEABILITY', count: 12 },
    { name: 'SECURITY_NO_AI', count: 8 }
  ];

  let caseIndex = 1;

  for (const group of groups) {
    for (let i = 0; i < group.count; i++) {
      const caseId = `M012-DET-${String(caseIndex).padStart(3, '0')}`;
      const otId = `OT-2026-${String(caseIndex).padStart(4, '0')}`;
      const machineNum = (caseIndex % 30) + 1;
      const assetId = `TELAR-${String(machineNum).padStart(3, '0')}`;

      let mType = 'CORRECTIVE';
      if (i % 4 === 0) mType = 'PREVENTIVE';
      else if (i % 4 === 1) mType = 'PREDICTIVE';
      else if (i % 4 === 2) mType = 'AUTONOMOUS';

      const item = {
        case_id: caseId,
        group: group.name,
        description: `Caso ${caseId} para evaluación determinística del grupo ${group.name}`,
        request: {
          request_id: `REQ-${caseId}`,
          work_order_id: otId,
          asset_id: assetId,
          evaluation_at: '2026-08-22T20:00:00.000Z',
          consumer: 'TECHNICIAN_UI',
          work_order_raw: {
            id: otId,
            maquina_id: assetId,
            titulo: `Intervención programada para ${assetId}`,
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
            health_score: 82,
            risk_score: 28
          },
          ag011_memories: [
            {
              memory_id: `MEM-ZAX-${String(caseIndex).padStart(3, '0')}`,
              version: '1.0',
              status: 'APPROVED',
              applicability: 'DIRECTLY_APPLICABLE',
              key_procedure_steps: ['Paso 1: Bloquear energía', 'Paso 2: Extraer rodamiento con extractor'],
              critical_precautions: ['Verificar energía cero con multímetro antes de abrir caja'],
              limitations: ['No golpear directamente el eje'],
              relevance_score: 0.95,
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

      // Specific boundary variations
      if (group.name === 'OT_IDENTITY_STATE' && i === 0) {
        item.description = 'OT no existente -> Debe emitir error de no encontrada';
        item.request.work_order_raw = null;
        item.expected.success = false;
        item.expected.error_contains = 'M012_WORK_ORDER_NOT_FOUND';
      } else if (group.name === 'ASSET_IDENTITY' && i === 0) {
        item.description = 'Discrepancia de activo -> Debe rechazar cross-asset';
        item.request.asset_id = 'TELAR-999';
        item.expected.success = false;
        item.expected.error_contains = 'M012_CROSS_ASSET_VIOLATION';
      } else if (group.name === 'DATA_GAPS' && i === 0) {
        item.description = 'Información contradictoria -> Debe emitir REVIEW_REQUIRED';
        item.request.work_order_raw.has_conflicting_data = true;
        item.request.work_order_raw.conflict_description = 'Conflicto de voltaje';
        item.expected.readiness_status = 'REVIEW_REQUIRED';
        item.expected.ready_for_execution = false;
      } else if (group.name === 'PARTS_READINESS' && i === 0) {
        item.description = 'Refacción requerida agotada -> Bloqueo por falta de recurso';
        item.request.work_order_raw.refacciones_planificadas[0].stock_status = 'OUT_OF_STOCK';
        item.expected.readiness_status = 'BLOCKED_MISSING_RESOURCE';
        item.expected.ready_for_execution = false;
      }

      cases.push(item);
      caseIndex++;
    }
  }

  const outputPath = path.join(__dirname, 'm012-det-eval-001.json');
  fs.writeFileSync(outputPath, JSON.stringify(cases, null, 2), 'utf8');
  console.log(`Generated ${cases.length} deterministic cases in ${outputPath}`);
}

generateDataset();
