// supabase/functions/agents-orchestrator/modules/m010/tests/fixtures/generate_m010_det_dataset.js
// Generator for M010-DET-EVAL-001 Deterministic Evaluation Dataset (v1.0)
// Frozen under Token: M010-DET-EVAL-001

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const machines = [
  { id: 'MACH-01', codigo_maquina: 'TELAR-201', nombre: 'Telar Tsudakoma ZAX 201', depto: 'PF', tipo: 'TELAR DE AIRE', modelo: 'ZAX-9100', marca: 'TSUDAKOMA', serie: 'SN-201-99', criticidad: 'ALTA', estatus: 'OPERANDO', activo: true, created_at: '2025-01-10T08:00:00Z' },
  { id: 'MACH-02', codigo_maquina: 'TELAR-202', nombre: 'Telar Tsudakoma ZAX 202', depto: 'PF', tipo: 'TELAR DE AIRE', modelo: 'ZAX-9100', marca: 'TSUDAKOMA', serie: 'SN-202-99', criticidad: 'ALTA', estatus: 'OPERANDO', activo: true, created_at: '2025-01-10T08:00:00Z' },
  { id: 'MACH-03', codigo_maquina: 'RAMA-01', nombre: 'Rama Termofijadora Monforts 1', depto: 'AF', tipo: 'RAMA', modelo: 'MONF-800', marca: 'MONFORTS', serie: 'SN-RAMA-01', criticidad: 'ALTA', estatus: 'OPERANDO', activo: true, created_at: '2025-01-10T08:00:00Z' },
  { id: 'MACH-04', codigo_maquina: 'CARDA-01', nombre: 'Carda Trutzschler 1', depto: 'PF', tipo: 'CARDA', modelo: 'TC-19', marca: 'TRUTZSCHLER', serie: null, criticidad: 'MEDIA', estatus: 'INACTIVA', activo: false, created_at: '2025-01-10T08:00:00Z' }
];

const workOrders = [
  { id: 'WO-101', folio: 'OT-2026-001', tipo_mantenimiento: 'CORRECTIVO', maquina_id: 'TELAR-202', estatus: 'CERRADA', fecha_creacion: '2026-08-01T08:30:00Z', fecha_cierre: '2026-08-01T10:30:00Z', descripcion: 'Fuga de aceite en reductor principal', trabajo_realizado: 'Cambio de empaque de retén' },
  { id: 'WO-102', folio: 'OT-2026-002', tipo_mantenimiento: 'PREVENTIVO', maquina_id: 'TELAR-202', estatus: 'CERRADA', fecha_creacion: '2026-06-15T09:00:00Z', fecha_cierre: '2026-06-15T15:00:00Z', descripcion: 'Servicio Preventivo Anual 2026', trabajo_realizado: 'Revisión general y lubricación' },
  { id: 'WO-103', folio: 'SUB-2026-001', tipo_mantenimiento: 'CORRECTIVO', maquina_id: 'TELAR-202', parent_ot_id: 'WO-101', estatus: 'CERRADA', fecha_creacion: '2026-08-01T09:00:00Z', fecha_cierre: '2026-08-01T10:00:00Z', descripcion: 'Torneado de flecha en taller mecánico', trabajo_realizado: 'Ajuste de flecha' }
];

const maintenancePlans = [
  { id: 'MP-01', maquina_id: 'TELAR-202', tipo: 'PREVENTIVO_ANUAL', anio: 2026, periodo_referencia: '06', fecha_programada: '2026-06-15', fecha_ejecutada: '2026-06-15', estado: 'EJECUTADO' },
  { id: 'MP-02', maquina_id: 'TELAR-202', tipo: 'AUTONOMO_SEMANAL', anio: 2026, periodo_referencia: 'W32', fecha_programada: '2026-08-10', fecha_ejecutada: '2026-08-10', estado: 'EJECUTADO' }
];

const checklistDefinitions = [
  { id: 'CHK-DEF-01', nombre: 'Checklist Preventivo Telares', tipo_mantenimiento: 'PREVENTIVO', depto: 'PF', preguntas_count: 15 }
];

const checklistExecutions = [
  { id: 'CHK-EXEC-01', orden_id: 'WO-102', maquina_id: 'TELAR-202', checklist_id: 'CHK-DEF-01', fecha_ejecucion: '2026-06-15T10:00:00Z', respuestas_aprobadas: 15, respuestas_fallidas: 0 }
];

const surveys = [
  { id: 'SRV-01', maquina_id: 'TELAR-202', tipo_levantamiento: 'LEVANTAMIENTO_PREDICTIVO', fecha: '2026-08-05T11:00:00Z', tecnico_id: 'TECH-01', estado: 'COMPLETADO', observaciones: 'Medición de vibraciones en chumaceras' }
];

const findings = [
  { id: 'FIND-01', levantamiento_id: 'SRV-01', maquina_id: 'TELAR-202', fecha: '2026-08-05T11:15:00Z', bloque_o_item: 'CHUMACERA_LADO_MANDO', hallazgo: 'Vibración excesiva en rodamiento 6208', gravedad: 'MODERADA', evidencia: 'Espectro de vibración pico 4.2 mm/s' }
];

const failures = [
  { id: 'FAIL-01', maquina_id: 'TELAR-202', falla_normalizada: 'FUGA_ACEITE', falla_raw: 'fuga de aceite en reductor', fecha: '2026-08-01', depto: 'PF', source_type: 'OT', associated_ot_folio: 'OT-2026-001' },
  { id: 'FAIL-02', maquina_id: 'TELAR-202', falla_normalizada: 'FALLA_TRAMA', falla_raw: 'paro de trama tensor', fecha: '2026-08-10', depto: 'PF', source_type: 'TELEGRAM', associated_ot_folio: null }
];

const parts = [
  { id: 'PART-01', maquina_id: 'TELAR-202', refaccion_id: 'REF-RETEN-45', codigo_refaccion: 'RETEN-45X65X10', nombre_refaccion: 'Retén de aceite 45x65x10', cantidad: 1, unidad: 'PZA', fecha_uso: '2026-08-01', associated_ot_folio: 'OT-2026-001', costo_unitario: 180.50 }
];

const downtime = [
  { id: 'DT-01', maquina_id: 'TELAR-202', fecha_inicio: '2026-08-01T08:30:00Z', fecha_fin: '2026-08-01T10:30:00Z', duracion_minutos: 120, causa_aparente: 'Fuga de aceite en reductor', associated_ot_folio: 'OT-2026-001' }
];

const alerts = [
  { signal_id: 'ALT-REC-01', signal_type: 'FAILURE_RECURRENCE_ALERT', target_id: 'TELAR-202', severity: 'Advertencia', message: 'Falla recurrente detectada', created_at: '2026-08-12T10:00:00Z', status: 'ACTIVE', source_agent: 'AG-008' }
];

const dataset = {
  version: 'M010-DET-EVAL-001',
  generated_at: new Date().toISOString(),
  machines,
  workOrders,
  maintenancePlans,
  checklistDefinitions,
  checklistExecutions,
  surveys,
  findings,
  failures,
  parts,
  downtime,
  alerts
};

const targetPath = path.join(__dirname, 'm010-det-eval-001.json');
fs.writeFileSync(targetPath, JSON.stringify(dataset, null, 2), 'utf8');

const hash = crypto.createHash('sha256').update(fs.readFileSync(targetPath)).digest('hex');
console.log(`Dataset generado en ${targetPath}`);
console.log(`Dataset SHA-256: ${hash}`);
