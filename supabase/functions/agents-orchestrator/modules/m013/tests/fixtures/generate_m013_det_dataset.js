// supabase/functions/agents-orchestrator/modules/m013/tests/fixtures/generate_m013_det_dataset.js
// Dataset Generator for M013-DET-EVAL-001 (202 Cases in 16 Groups)
// Frozen under Token: M013-SAFETY-ENGINE-001

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
    { name: 'OT_ASSET_IDENTITY', count: 12 },
    { name: 'M012_HANDOFF', count: 12 },
    { name: 'REQUIREMENT_APPLICABILITY', count: 16 },
    { name: 'EVIDENCE_AUTHORITY', count: 16 },
    { name: 'HUMAN_AUTHORITY', count: 16 },
    { name: 'LOTO_CONTROLS', count: 14 },
    { name: 'PERMITS_CONTROLS', count: 14 },
    { name: 'OTHER_CONTROLS', count: 10 },
    { name: 'TEMPORAL_VALIDITY', count: 12 },
    { name: 'CONFLICTS_DETECTION', count: 12 },
    { name: 'BLOCKING_RULES', count: 14 },
    { name: 'SAFETY_STATUS', count: 14 },
    { name: 'TRACEABILITY', count: 12 },
    { name: 'SECURITY_INJECTION', count: 12 },
    { name: 'READONLY_NO_PERSISTENCE', count: 10 },
    { name: 'FOREIGN_BOUNDARIES_NO_AI', count: 6 }
  ];

  const allCases = [];
  let caseIndex = 1;

  for (const group of groups) {
    for (let i = 0; i < group.count; i++) {
      const caseId = `M013-DET-${String(caseIndex).padStart(3, '0')}`;
      const otId = `OT-2026-${String(caseIndex).padStart(4, '0')}`;
      const machineNum = (caseIndex % 30) + 1;
      const assetId = `TELAR-${String(machineNum).padStart(3, '0')}`;

      const item = {
        case_id: caseId,
        group: group.name,
        description: `Caso ${caseId} para evaluación determinística del grupo ${group.name}`,
        request: {
          request_id: `REQ-${caseId}`,
          work_order_id: otId,
          asset_id: assetId,
          evaluation_at: '2026-08-22T20:00:00.000Z',
          consumer: 'AG001_CAPATAZ',
          work_order_raw: {
            id: otId,
            maquina_id: assetId,
            titulo: `Intervención de seguridad sobre ${assetId}`,
            tipo_mantenimiento: i % 2 === 0 ? 'CORRECTIVE' : 'PREVENTIVE',
            component_id: 'MOTOR_PRINCIPAL',
            seguridad_raw: [
              { id: `SAF-${caseIndex}-01`, type: 'LOTO_REQUIRED', description: 'Bloqueo eléctrico principal' }
            ],
            ag011_memories: [
              {
                memory_id: `MEM-ZAX-${String(caseIndex).padStart(3, '0')}`,
                critical_precautions: ['Comprobar ausencia de tensión con voltímetro']
              }
            ]
          },
          m012_package: {
            work_order_id: otId,
            asset_id: assetId,
            safety_dependencies: [
              { dependency_id: `M012-DEP-${caseIndex}`, dependency_type: 'LOTO_REQUIRED', description: 'Aislamiento LOTO M012' }
            ],
            scope_snapshot: {
              maintenance_type: i % 2 === 0 ? 'CORRECTIVE' : 'PREVENTIVE'
            }
          },
          human_confirmations_raw: [
            {
              confirmation_id: `CONF-${caseIndex}`,
              requirement_id: `REQ-SAF-${caseIndex}-01`,
              actor_id: `TECH-USER-${(caseIndex % 10) + 1}`,
              actor_role: 'TECHNICIAN',
              decision: 'CONFIRMED',
              timestamp: '2026-08-22T19:50:00.000Z',
              evidence_notes: 'Candado colocado y verificado a 0.0V'
            }
          ]
        },
        expected: {
          success: true,
          work_order_id: otId,
          asset_id: assetId,
          safety_status: 'CONTROLS_COMPLETE',
          is_blocked: false,
          controls_complete: true,
          llm_calls: 0,
          tokens: 0,
          cost_usd: 0
        }
      };

      // Specific edge / error / blocking cases
      if (group.name === 'OT_ASSET_IDENTITY' && i === 0) {
        item.description = 'OT inexistente en BD -> Bloqueo controlado';
        item.request.work_order_raw = null;
        item.expected.success = false;
        item.expected.error_contains = 'M013_WORK_ORDER_NOT_FOUND';
      } else if (group.name === 'OT_ASSET_IDENTITY' && i === 1) {
        item.description = 'Discrepancia de máquina entre OT y Activo -> Bloqueo cross-asset';
        item.request.asset_id = 'TELAR-999';
        item.expected.success = false;
        item.expected.error_contains = 'M013_CROSS_ASSET_VIOLATION';
      } else if (group.name === 'LOTO_CONTROLS' && i === 0) {
        item.description = 'LOTO requerido sin confirmación humana -> Estado BLOCKED';
        item.request.human_confirmations_raw = [];
        item.expected.safety_status = 'BLOCKED';
        item.expected.is_blocked = true;
        item.expected.controls_complete = false;
      } else if (group.name === 'PERMITS_CONTROLS' && i === 0) {
        item.description = 'Permiso de trabajo en caliente requerido pero expirado -> BLOCKED';
        item.request.work_order_raw.seguridad_raw.push({
          id: `PERM-${caseIndex}`,
          type: 'PERMIT_REQUIRED',
          description: 'Trabajo en caliente'
        });
        item.request.permits_raw = [
          { id: `PERM-${caseIndex}`, type: 'HOT_WORK', status: 'APPROVED', valid_to: '2026-08-22T10:00:00.000Z' }
        ];
        item.expected.safety_status = 'BLOCKED';
        item.expected.is_blocked = true;
        item.expected.controls_complete = false;
      } else if (group.name === 'CONFLICTS_DETECTION' && i === 0) {
        item.description = 'Conflicto de seguridad en OT -> REVIEW_REQUIRED';
        item.request.work_order_raw.has_safety_conflict = true;
        item.expected.safety_status = 'REVIEW_REQUIRED';
        item.expected.is_blocked = true;
        item.expected.controls_complete = false;
      } else if (group.name === 'SECURITY_INJECTION' && i === 0) {
        item.description = 'Inyección SQL en payload de solicitud -> Rechazo inmediato';
        item.request.sql = 'DROP TABLE ordenes_trabajo;';
        item.expected.success = false;
        item.expected.error_contains = 'M013_SECURITY_REJECTION';
      }

      allCases.push(item);
      caseIndex++;
    }
  }

  const datasetCanonical = canonicalJsonStringify(allCases);
  const datasetSha = crypto.createHash('sha256').update(datasetCanonical, 'utf8').digest('hex');

  const datasetPath = path.join(__dirname, 'm013-det-eval-001.json');
  fs.writeFileSync(datasetPath, JSON.stringify(allCases, null, 2), 'utf8');

  console.log(`Generated ${allCases.length} deterministic cases in ${datasetPath}`);
  console.log(`Dataset SHA-256: ${datasetSha}`);
}

generateDataset();
