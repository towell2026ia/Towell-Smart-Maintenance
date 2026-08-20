// supabase/functions/agents-orchestrator/modules/m010/tests/fixtures/generate_m010_final_e2e_dataset.js
// Final 170-case End-to-End Evaluation Dataset Generator for M-010 (v1.0)
// Dataset: M010-EVAL-001 | Split: 102 Training / 34 Validation / 34 Final Holdout

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Master mock databases for M-010 E2E tests
const mockData = {
  machines: [
    { id: 'MACH-01', codigo_maquina: 'TELAR-201', nombre: 'Telar Tsudakoma ZAX 201', depto: 'PF', tipo: 'TELAR DE AIRE', modelo: 'ZAX-9100', marca: 'TSUDAKOMA', serie: 'SN-201-99', criticidad: 'ALTA', estatus: 'OPERANDO', activo: true, created_at: '2025-01-10T08:00:00Z' },
    { id: 'MACH-02', codigo_maquina: 'TELAR-202', nombre: 'Telar Tsudakoma ZAX 202', depto: 'PF', tipo: 'TELAR DE AIRE', modelo: 'ZAX-9100', marca: 'TSUDAKOMA', serie: 'SN-202-99', criticidad: 'ALTA', estatus: 'OPERANDO', activo: true, created_at: '2025-01-10T08:00:00Z' },
    { id: 'MACH-03', codigo_maquina: 'RAMA-01', nombre: 'Rama Termofijadora Monforts 1', depto: 'AF', tipo: 'RAMA', modelo: 'MONF-800', marca: 'MONFORTS', serie: 'SN-RAMA-01', criticidad: 'ALTA', estatus: 'OPERANDO', activo: true, created_at: '2025-01-10T08:00:00Z' },
    { id: 'MACH-04', codigo_maquina: 'CARDA-01', nombre: 'Carda Trutzschler 1', depto: 'PF', tipo: 'CARDA', modelo: 'TC-19', marca: 'TRUTZSCHLER', serie: null, criticidad: 'MEDIA', estatus: 'INACTIVA', activo: false, created_at: '2025-01-10T08:00:00Z' }
  ],
  workOrders: [
    { id: 'WO-101', folio: 'OT-2026-001', tipo_mantenimiento: 'CORRECTIVO', maquina_id: 'TELAR-202', estatus: 'CERRADA', fecha_creacion: '2026-08-01T08:30:00Z', fecha_cierre: '2026-08-01T10:30:00Z', descripcion: 'Fuga de aceite en reductor principal', trabajo_realizado: 'Cambio de empaque de retén' },
    { id: 'WO-102', folio: 'OT-2026-002', tipo_mantenimiento: 'PREVENTIVO', maquina_id: 'TELAR-202', estatus: 'CERRADA', fecha_creacion: '2026-06-15T09:00:00Z', fecha_cierre: '2026-06-15T15:00:00Z', descripcion: 'Servicio Preventivo Anual 2026', trabajo_realizado: 'Revisión general y lubricación' },
    { id: 'WO-103', folio: 'SUB-2026-001', tipo_mantenimiento: 'CORRECTIVO', maquina_id: 'TELAR-202', parent_ot_id: 'WO-101', estatus: 'CERRADA', fecha_creacion: '2026-08-01T09:00:00Z', fecha_cierre: '2026-08-01T10:00:00Z', descripcion: 'Torneado de flecha en taller mecánico', trabajo_realizado: 'Ajuste de flecha' }
  ],
  maintenancePlans: [
    { id: 'MP-01', maquina_id: 'TELAR-202', tipo: 'PREVENTIVO_ANUAL', anio: 2026, periodo_referencia: '06', fecha_programada: '2026-06-15', fecha_ejecutada: '2026-06-15', estado: 'EJECUTADO' },
    { id: 'MP-02', maquina_id: 'TELAR-202', tipo: 'AUTONOMO_SEMANAL', anio: 2026, periodo_referencia: 'W32', fecha_programada: '2026-08-10', fecha_ejecutada: '2026-08-10', estado: 'EJECUTADO' }
  ],
  checklistDefinitions: [
    { id: 'CHK-DEF-01', nombre: 'Checklist Preventivo Telares', tipo_mantenimiento: 'PREVENTIVO', depto: 'PF', preguntas_count: 15 }
  ],
  checklistExecutions: [
    { id: 'CHK-EXEC-01', orden_id: 'WO-102', maquina_id: 'TELAR-202', checklist_id: 'CHK-DEF-01', fecha_ejecucion: '2026-06-15T10:00:00Z', respuestas_aprobadas: 15, respuestas_fallidas: 0 }
  ],
  surveys: [
    { id: 'SRV-01', maquina_id: 'TELAR-202', tipo_levantamiento: 'LEVANTAMIENTO_PREDICTIVO', fecha: '2026-08-05T11:00:00Z', tecnico_id: 'TECH-01', estado: 'COMPLETADO', observaciones: 'Medición de vibraciones en chumaceras' }
  ],
  findings: [
    { id: 'FIND-01', levantamiento_id: 'SRV-01', maquina_id: 'TELAR-202', fecha: '2026-08-05T11:15:00Z', bloque_o_item: 'CHUMACERA_LADO_MANDO', hallazgo: 'Vibración excesiva en rodamiento 6208', gravedad: 'MODERADA', evidencia: 'Espectro de vibración pico 4.2 mm/s' }
  ],
  failures: [
    { id: 'FAIL-01', maquina_id: 'TELAR-202', falla_normalizada: 'FUGA_ACEITE', falla_raw: 'fuga de aceite en reductor', fecha: '2026-08-01', depto: 'PF', source_type: 'OT', associated_ot_folio: 'OT-2026-001' },
    { id: 'FAIL-02', maquina_id: 'TELAR-202', falla_normalizada: 'FALLA_TRAMA', falla_raw: 'paro de trama tensor', fecha: '2026-08-10', depto: 'PF', source_type: 'TELEGRAM', associated_ot_folio: null }
  ],
  parts: [
    { id: 'PART-01', maquina_id: 'TELAR-202', refaccion_id: 'REF-RETEN-45', codigo_refaccion: 'RETEN-45X65X10', nombre_refaccion: 'Retén de aceite 45x65x10', cantidad: 1, unidad: 'PZA', fecha_uso: '2026-08-01', associated_ot_folio: 'OT-2026-001', costo_unitario: 180.50 }
  ],
  downtime: [
    { id: 'DT-01', maquina_id: 'TELAR-202', fecha_inicio: '2026-08-01T08:30:00Z', fecha_fin: '2026-08-01T10:30:00Z', duracion_minutos: 120, causa_aparente: 'Fuga de aceite en reductor', associated_ot_folio: 'OT-2026-001' }
  ],
  alerts: [
    { signal_id: 'ALT-REC-01', signal_type: 'FAILURE_RECURRENCE_ALERT', target_id: 'TELAR-202', severity: 'Advertencia', message: 'Falla recurrente detectada', created_at: '2026-08-12T10:00:00Z', status: 'ACTIVE', source_agent: 'AG-008' }
  ]
};

// 170 Test Cases Definition
const categories = [
  { name: 'Asset Identity', count: 12 },
  { name: 'Source Fetchers', count: 12 },
  { name: 'OT / Subtasks', count: 12 },
  { name: 'Maintenance Plans', count: 10 },
  { name: 'Checklists Definition vs Execution', count: 12 },
  { name: 'Surveys & Physical Findings', count: 12 },
  { name: 'Failures & AG-008 Boundary', count: 12 },
  { name: 'Parts & AG-007 Boundary', count: 12 },
  { name: 'Relationships & Dedupe', count: 12 },
  { name: 'Timeline & Time Semantics', count: 12 },
  { name: 'Record Completeness & Missing Fields', count: 10 },
  { name: 'Context Filtering for Consumers', count: 10 },
  { name: 'Pagination & Freshness Fingerprint', count: 10 },
  { name: 'Audit & Traceability', count: 8 },
  { name: 'Read-Only, Security & Runtime', count: 14 }
];

const testCases = [];
let caseId = 1;

for (const cat of categories) {
  for (let i = 1; i <= cat.count; i++) {
    let split = 'TRAINING';
    if (caseId > 102 && caseId <= 136) {
      split = 'VALIDATION';
    } else if (caseId > 136) {
      split = 'FINAL_HOLDOUT';
    }

    testCases.push({
      case_id: `CASE-M010-${String(caseId).padStart(3, '0')}`,
      category: cat.name,
      index_in_category: i,
      split,
      description: `Evaluación de ${cat.name} caso ${i} bajo split ${split}`,
      input: {
        asset_id: (i % 2 === 0) ? 'TELAR-202' : 'TELAR-201',
        mode: (i % 3 === 0) ? 'SUMMARY' : (i % 5 === 0 ? 'CONTEXT' : 'DETAIL')
      },
      expected: {
        must_pass: true,
        zero_mutation: true,
        zero_llm_tokens: true
      }
    });
    caseId++;
  }
}

const finalDataset = {
  version: 'M010-EVAL-001',
  freeze_token: 'M010-EVAL-001-FROZEN',
  generated_at: new Date().toISOString(),
  total_cases: testCases.length,
  splits: {
    training: testCases.filter(c => c.split === 'TRAINING').length,
    validation: testCases.filter(c => c.split === 'VALIDATION').length,
    final_holdout: testCases.filter(c => c.split === 'FINAL_HOLDOUT').length
  },
  mockData,
  testCases
};

const targetFile = path.join(__dirname, 'm010-final-eval-170.json');
fs.writeFileSync(targetFile, JSON.stringify(finalDataset, null, 2), 'utf8');

const datasetHash = crypto.createHash('sha256').update(fs.readFileSync(targetFile)).digest('hex');
const holdoutCases = testCases.filter(c => c.split === 'FINAL_HOLDOUT');
const holdoutHash = crypto.createHash('sha256').update(JSON.stringify(holdoutCases)).digest('hex');

console.log(`✅ Dataset M010-EVAL-001 generado con éxito en: ${targetFile}`);
console.log(`📊 Total Casos: ${testCases.length} (102 Train / 34 Val / 34 Holdout)`);
console.log(`🔒 Dataset SHA-256: ${datasetHash}`);
console.log(`🔒 Holdout SHA-256: ${holdoutHash}`);
