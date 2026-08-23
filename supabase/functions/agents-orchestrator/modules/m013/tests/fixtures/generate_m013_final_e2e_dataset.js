// supabase/functions/agents-orchestrator/modules/m013/tests/fixtures/generate_m013_final_e2e_dataset.js
// Final E2E Dataset Generator for M013-EVAL-001 (170 Cases: 102 Train / 34 Val / 34 Holdout)
// Frozen under Token: M013-1.0-FROZEN

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
    { name: 'AG001_INPUT_GOVERNANCE', count: 8 },
    { name: 'OT_ASSET_IDENTITY', count: 10 },
    { name: 'M012_HANDOFF', count: 10 },
    { name: 'REQUIREMENT_APPLICABILITY', count: 12 },
    { name: 'EVIDENCE_AUTHORITY', count: 14 },
    { name: 'HUMAN_AUTHORITY', count: 14 },
    { name: 'LOTO_CONTROLS', count: 12 },
    { name: 'PERMITS_CONTROLS', count: 12 },
    { name: 'TEMPORAL_VALIDITY', count: 10 },
    { name: 'CONFLICTS_DETECTION', count: 10 },
    { name: 'BLOCKING_RULES', count: 12 },
    { name: 'SAFETY_STATUS', count: 12 },
    { name: 'TRACEABILITY', count: 10 },
    { name: 'SECURITY_INJECTION', count: 10 },
    { name: 'SOURCE_MUTATION_PERSISTENCE', count: 8 },
    { name: 'FOREIGN_BOUNDARIES_NO_AI', count: 6 }
  ];

  const allCases = [];
  let caseIndex = 1;

  for (const group of groups) {
    for (let i = 0; i < group.count; i++) {
      const caseId = `M013-EVAL-${String(caseIndex).padStart(3, '0')}`;
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
            titulo: `Intervención gobernada de seguridad para ${assetId}`,
            tipo_mantenimiento: i % 2 === 0 ? 'CORRECTIVE' : 'PREVENTIVE',
            component_id: 'MOTOR_PRINCIPAL',
            seguridad_raw: [
              { id: `SAF-${caseIndex}-01`, type: 'LOTO_REQUIRED', description: 'Bloqueo eléctrico principal' }
            ],
            ag011_memories: [
              {
                memory_id: `MEM-ZAX-${String(caseIndex).padStart(3, '0')}`,
                critical_precautions: ['Verificar energía cero a 0.0V antes de abrir caja']
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

      // Critical Edge & Boundary Cases
      if (group.name === 'OT_ASSET_IDENTITY' && i === 0) {
        item.description = 'OT inexistente en BD -> Bloqueo controlado';
        item.request.work_order_raw = null;
        item.expected.success = false;
        item.expected.error_contains = 'M013_WORK_ORDER_NOT_FOUND';
      } else if (group.name === 'OT_ASSET_IDENTITY' && i === 1) {
        item.description = 'Discrepancia de máquina -> Bloqueo cross-asset';
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
        item.description = 'Permiso de trabajo requerido expirado -> BLOCKED';
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
        item.description = 'Inyección SQL en payload -> Rechazo inmediato';
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

  const holdoutCases = allCases.filter(c => c.split === 'FINAL_HOLDOUT');
  const holdoutCanonical = canonicalJsonStringify(holdoutCases);
  const holdoutSha = crypto.createHash('sha256').update(holdoutCanonical, 'utf8').digest('hex');

  const datasetPath = path.join(__dirname, 'm013-final-eval-170.json');
  fs.writeFileSync(datasetPath, JSON.stringify(allCases, null, 2), 'utf8');

  console.log(`Generated ${allCases.length} final cases in ${datasetPath}`);
  console.log(`  - Training Split:      ${allCases.filter(c => c.split === 'TRAINING').length} cases`);
  console.log(`  - Validation Split:    ${allCases.filter(c => c.split === 'VALIDATION').length} cases`);
  console.log(`  - Final Holdout Split: ${holdoutCases.length} cases`);
  console.log(`  - Dataset SHA-256:     ${datasetSha}`);
  console.log(`  - Holdout SHA-256:     ${holdoutSha}`);
}

generateFinalE2EDataset();
