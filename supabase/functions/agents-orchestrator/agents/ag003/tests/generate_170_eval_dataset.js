// supabase/functions/agents-orchestrator/agents/ag003/tests/generate_170_eval_dataset.js
// Final 170-Case Dataset Generator for AG-003.4 (AG003-EVAL-001)

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const cases = [];

function addCase(split, category, description, inputData, expected) {
  const id = `EVAL-${String(cases.length + 1).padStart(3, '0')}`;
  cases.push({
    id,
    split, // 'TRAINING' (102) | 'VALIDATION' (34) | 'HOLDOUT' (34)
    category,
    description,
    input: inputData,
    expected
  });
}

// 1. Arquitectura / Data Mapping (8 cases: 5 Train, 2 Val, 1 Holdout)
addCase('TRAINING', 'Arquitectura / Data Mapping', 'Mapeo canónico machine -> cat_maquinas', { source: 'cat_maquinas', id: 'TEL-01' }, { resolved: true });
addCase('TRAINING', 'Arquitectura / Data Mapping', 'Mapeo de calidad -> public.segundas_por_rollo', { source: 'segundas_por_rollo' }, { resolved: true });
addCase('TRAINING', 'Arquitectura / Data Mapping', 'Staging no sustituye tabla analítica final', { source: 'stg_segundas_por_rollo_excel' }, { staging_isolated: true });
addCase('TRAINING', 'Arquitectura / Data Mapping', 'Mapeo de paros históricos -> fallas_por_maquina y Telegram', { source: 'fallas_por_maquina' }, { resolved: true });
addCase('TRAINING', 'Arquitectura / Data Mapping', 'Mapeo de contratos canónicos de planificación y hallazgo', { contract: 'contracts' }, { resolved: true });
addCase('VALIDATION', 'Arquitectura / Data Mapping', 'Validación de mapeo hacia calendarios_mantenimiento', { target: 'calendarios_mantenimiento' }, { contract: 'PREDICTIVE-SCHEDULE-001' });
addCase('VALIDATION', 'Arquitectura / Data Mapping', 'Validación de persistencia hacia respuestas_checklist_predictivo', { target: 'respuestas_checklist_predictivo' }, { form_family: 'LEVANTAMIENTO_PREDICTIVO' });
addCase('HOLDOUT', 'Arquitectura / Data Mapping', 'Holdout de resolución integral de 14 fuentes mapeadas', { all_sources: true }, { mapping_pass: true });

// 2. Eligibility / PF / Telares (12 cases: 7 Train, 2 Val, 3 Holdout)
addCase('TRAINING', 'Eligibility / PF / Telares', 'Telar activo en PF (Elegible)', { depto: 'PF', tipo: 'TELAR', activo: true }, { eligible: true });
addCase('TRAINING', 'Eligibility / PF / Telares', 'Telar inactivo en PF (No Elegible)', { depto: 'PF', tipo: 'TELAR', activo: false }, { eligible: false });
addCase('TRAINING', 'Eligibility / PF / Telares', 'Máquina no-telar en PF (URDIDOR - No Elegible)', { depto: 'PF', tipo: 'URDIDOR', activo: true }, { eligible: false });
addCase('TRAINING', 'Eligibility / PF / Telares', 'Máquina de CF Confección (No Elegible)', { depto: 'CF', tipo: 'COSTURA', activo: true }, { eligible: false });
addCase('TRAINING', 'Eligibility / PF / Telares', 'Máquina de TF Tintorería (No Elegible)', { depto: 'TF', tipo: 'RAMA', activo: true }, { eligible: false });
addCase('TRAINING', 'Eligibility / PF / Telares', 'Máquina de AF Acabados (No Elegible)', { depto: 'AF', tipo: 'SECADORA', activo: true }, { eligible: false });
addCase('TRAINING', 'Eligibility / PF / Telares', 'Máquina inexistente en catálogo (No Elegible)', { id: 'UNKNOWN' }, { eligible: false });
addCase('VALIDATION', 'Eligibility / PF / Telares', 'Validación de 54 telares identificados en catálogo', { count: 54 }, { total_looms: 54 });
addCase('VALIDATION', 'Eligibility / PF / Telares', 'Validación de rechazo a máquinas de servicios generales', { depto: 'SG' }, { eligible: false });
addCase('HOLDOUT', 'Eligibility / PF / Telares', 'Holdout de cobertura estricta de telares activos PF', { scan: 'all' }, { non_looms_selected: 0 });
addCase('HOLDOUT', 'Eligibility / PF / Telares', 'Holdout de rechazo inmediato a telar con activo = null/false', { activo: null }, { eligible: false });
addCase('HOLDOUT', 'Eligibility / PF / Telares', 'Holdout de discriminación por código de área PF', { depto: 'PF' }, { department_pass: true });

// 3. Segundas / Window / Data Quality (18 cases: 11 Train, 4 Val, 3 Holdout)
for (let i = 1; i <= 11; i++) {
  addCase('TRAINING', 'Segundas / Window / Data Quality', `Training ventana móvil 30d caso ${i}`, {
    rolls: i * 2, segundas: i * 5, target_date: '2026-08-18'
  }, { valid_window: true });
}
addCase('VALIDATION', 'Segundas / Window / Data Quality', 'Muestra suficiente (>=10 rollos)', { rolls: 15 }, { status: 'SUFFICIENT_DATA' });
addCase('VALIDATION', 'Segundas / Window / Data Quality', 'Muestra parcial (3 a 9 rollos)', { rolls: 5 }, { status: 'PARTIAL_DATA' });
addCase('VALIDATION', 'Segundas / Window / Data Quality', 'Muestra insuficiente (<3 rollos)', { rolls: 2 }, { status: 'INSUFFICIENT_DATA' });
addCase('VALIDATION', 'Segundas / Window / Data Quality', 'Sin producción en 30 días', { rolls: 0 }, { status: 'NO_PRODUCTION_DATA' });
addCase('HOLDOUT', 'Segundas / Window / Data Quality', 'Holdout de límite temporal exacto D-30 a D', { window_days: 30 }, { boundary_pass: true });
addCase('HOLDOUT', 'Segundas / Window / Data Quality', 'Holdout de protección ante nulos en metraje/piezas', { has_nulls: true }, { count_preserved: true });
addCase('HOLDOUT', 'Segundas / Window / Data Quality', 'Holdout de segregación de registros de fecha futura/corrupta', { corrupt_dates: 2 }, { invalid_isolated: true });

// 4. Baseline / Deviation (18 cases: 11 Train, 4 Val, 3 Holdout)
for (let i = 1; i <= 11; i++) {
  addCase('TRAINING', 'Baseline / Deviation', `Training cálculo baseline/desviación caso ${i}`, {
    rate: 2.0 + i*0.3, baseline: 2.5, hist_samples: 15 + i
  }, { baseline_type: 'MACHINE_HISTORICAL_MEAN' });
}
addCase('VALIDATION', 'Baseline / Deviation', 'Auditoría de proveniencia de fallback peer group = 2.5 seg/rollo', { hist_samples: 5 }, { fallback: 2.5, provenance: 'AG003-BASELINE-RULES-001' });
addCase('VALIDATION', 'Baseline / Deviation', 'Desviación relativa significativa (>= +50%)', { rate: 4.5, baseline: 2.5 }, { trend: 'SIGNIFICANT_INCREASE' });
addCase('VALIDATION', 'Baseline / Deviation', 'Protección ante división por cero en baseline = 0', { rate: 3.0, baseline: 0 }, { division_by_zero_protected: true });
addCase('VALIDATION', 'Baseline / Deviation', 'Desviación moderada (+15% a +49%)', { rate: 3.2, baseline: 2.5 }, { trend: 'MODERATE_INCREASE' });
addCase('HOLDOUT', 'Baseline / Deviation', 'Holdout de trazabilidad completa del origen del baseline', { track_provenance: true }, { provenance_verified: true });
addCase('HOLDOUT', 'Baseline / Deviation', 'Holdout de estabilidad en variación menor al 10%', { rate: 2.6, baseline: 2.5 }, { trend: 'STABLE' });
addCase('HOLDOUT', 'Baseline / Deviation', 'Holdout de tendencia decreciente (mejora de calidad)', { rate: 1.8, baseline: 2.5 }, { trend: 'DECREASING' });

// 5. Histórico / Telegram / Dedupe (14 cases: 8 Train, 3 Val, 3 Holdout)
for (let i = 1; i <= 8; i++) {
  addCase('TRAINING', 'Histórico / Telegram / Dedupe', `Training contexto histórico caso ${i}`, {
    failures: i, telegrams: i, dupes: Math.floor(i/2)
  }, { dedupe_applied: true });
}
addCase('VALIDATION', 'Histórico / Telegram / Dedupe', 'Deduplicación estricta de paros en ventana 24h', { same_day: true, count: 2 }, { deduplicated_count: 1 });
addCase('VALIDATION', 'Histórico / Telegram / Dedupe', 'Preservación de reincidencias reales separadas por >24h', { separate_days: true, count: 3 }, { deduplicated_count: 3 });
addCase('VALIDATION', 'Histórico / Telegram / Dedupe', 'Tratamiento de downtime desconocido (no convertir a 0)', { dt: null }, { is_unknown: true });
addCase('HOLDOUT', 'Histórico / Telegram / Dedupe', 'Holdout de deduplicación cruzada Excel + Telegram', { cross_source: true }, { exact_dupes_removed: true });
addCase('HOLDOUT', 'Histórico / Telegram / Dedupe', 'Holdout de preservación de categorías de falla', { cat: 'MECANICA' }, { cat_preserved: true });
addCase('HOLDOUT', 'Histórico / Telegram / Dedupe', 'Holdout de recencia respecto a último predictivo', { days_ago: 45 }, { recency_scored: true });

// 6. Priority / Selection (20 cases: 12 Train, 4 Val, 4 Holdout)
for (let i = 1; i <= 12; i++) {
  addCase('TRAINING', 'Priority / Selection', `Training prioridad predictiva caso ${i}`, {
    dev: i*0.1, seg: i*5, failures: Math.floor(i/3), crit: i%2===0 ? 'Alta':'Media'
  }, { score_range: [0, 100] });
}
addCase('VALIDATION', 'Priority / Selection', 'Dominancia de la señal primaria de calidad sobre fallas', {
  telarA: { dev: 1.0, fails: 0 }, telarB: { dev: 0.1, fails: 4 }
}, { telarA_ranks_higher: true });
addCase('VALIDATION', 'Priority / Selection', 'Auditoría de seguridad de umbral de selección (score >= 25)', {
  score: 22, seg: 0
}, { selected: false });
addCase('VALIDATION', 'Priority / Selection', 'Desempate determinístico en 5 niveles', {
  tie_score: 75, devA: 0.5, devB: 0.3
}, { loomA_selected_first: true });
addCase('VALIDATION', 'Priority / Selection', 'Límite absoluto Top-4 cuando califican >4 telares', {
  qualifying: 10
}, { selected_count: 4 });
addCase('HOLDOUT', 'Priority / Selection', 'Holdout de no llenado forzado (si solo 2 califican, seleccionar 2)', {
  qualifying: 2
}, { selected_count: 2 });
addCase('HOLDOUT', 'Priority / Selection', 'Holdout de cero candidatos (0 seleccionados sin error)', {
  qualifying: 0
}, { selected_count: 0 });
addCase('HOLDOUT', 'Priority / Selection', 'Holdout de reproducibilidad del ranking determinístico', {
  profile_hash: 'abc'
}, { deterministic_rank: true });
addCase('HOLDOUT', 'Priority / Selection', 'Holdout de selección máxima de 4 con 54 candidatos', {
  qualifying: 54
}, { selected_count: 4 });

// 7. Monthly Capacity / Scheduler (16 cases: 10 Train, 3 Val, 3 Holdout)
for (let i = 1; i <= 10; i++) {
  addCase('TRAINING', 'Monthly Capacity / Scheduler', `Training capacidad y scheduler caso ${i}`, {
    existing: i%5, target_month: '2026-09'
  }, { available: Math.max(0, 4 - (i%5)) });
}
addCase('VALIDATION', 'Monthly Capacity / Scheduler', 'Capacidad existente llena (4 existentes -> 0 nuevos)', { existing: 4 }, { available_slots: 0 });
addCase('VALIDATION', 'Monthly Capacity / Scheduler', 'Programación en viernes hábiles del mes objetivo', { month: '2026-09' }, { scheduled_in_month: true });
addCase('VALIDATION', 'Monthly Capacity / Scheduler', 'Prevención de duplicado del mismo telar en el mismo mes', { existing_loom: 'TEL-01' }, { duplicate_rejected: true });
addCase('HOLDOUT', 'Monthly Capacity / Scheduler', 'Holdout de meses con menos de 4 viernes (distribución segura)', { month: '2026-02' }, { dates_in_target_month: true });
addCase('HOLDOUT', 'Monthly Capacity / Scheduler', 'Holdout de emisión de PREDICTIVE-SCHEDULE-001 (v1.0)', { format: 'canonical' }, { contract_valid: true });
addCase('HOLDOUT', 'Monthly Capacity / Scheduler', 'Holdout de inmutabilidad del mes programado', { target_month: '2026-09' }, { month_preserved: true });

// 8. MiMo Semantic Layer (16 cases: 10 Train, 3 Val, 3 Holdout)
for (let i = 1; i <= 10; i++) {
  addCase('TRAINING', 'MiMo Semantic Layer', `Training interpretación semántica caso ${i}`, {
    mId: `TEL-${i}`, score: 70 + i
  }, { structured_json: true });
}
addCase('VALIDATION', 'MiMo Semantic Layer', 'Fast Path con MIMO_ENABLED = false (0 calls, 0 tokens, $0)', { mimo_enabled: false }, { calls: 0, cost: 0 });
addCase('VALIDATION', 'MiMo Semantic Layer', 'Rechazo de intento de override en machine_id / score', { override_attempt: true }, { deterministic_wins: true });
addCase('VALIDATION', 'MiMo Semantic Layer', 'Aislamiento de prompt injection en histórico', { prompt_injection: true }, { injection_neutralized: true });
addCase('HOLDOUT', 'MiMo Semantic Layer', 'Holdout de preservación de frontera: señal analítica != hallazgo físico', { score: 98 }, { findings_created: 0 });
addCase('HOLDOUT', 'MiMo Semantic Layer', 'Holdout de sugerencia de foco en 4 bloques aprobados', { focus: ['Mecánico'] }, { valid_focus: true });
addCase('HOLDOUT', 'MiMo Semantic Layer', 'Holdout de fallback determinístico ante fallo de MiMo', { timeout: true }, { deterministic_plan_valid: true });

// 9. Calendario -> Levantamiento (12 cases: 7 Train, 2 Val, 3 Holdout)
for (let i = 1; i <= 7; i++) {
  addCase('TRAINING', 'Calendario -> Levantamiento', `Training transición calendario a levantamiento caso ${i}`, {
    schedule_id: `sched-${i}`
  }, { form_family: 'LEVANTAMIENTO_PREDICTIVO' });
}
addCase('VALIDATION', 'Calendario -> Levantamiento', 'Vinculación de contexto técnico a LEVANTAMIENTO_PREDICTIVO', { item: 'TEL-01' }, { survey_generated: true });
addCase('VALIDATION', 'Calendario -> Levantamiento', 'Prohibición de crear OT directamente desde el calendario', { create_ot: false }, { direct_ots: 0 });
addCase('HOLDOUT', 'Calendario -> Levantamiento', 'Holdout de persistencia en calendarios_mantenimiento_detalle', { target: 'calendario_detalle' }, { row_valid: true });
addCase('HOLDOUT', 'Calendario -> Levantamiento', 'Holdout de tipo_mantenimiento = PREDICTIVO en calendario', { type: 'PREDICTIVO' }, { type_match: true });
addCase('HOLDOUT', 'Calendario -> Levantamiento', 'Holdout de 4 slots máximos convertidos a levantamientos', { max_surveys: 4 }, { max_preserved: true });

// 10. Checklist / Hallazgo (12 cases: 7 Train, 2 Val, 3 Holdout)
for (let i = 1; i <= 7; i++) {
  addCase('TRAINING', 'Checklist / Hallazgo', `Training checklist y respuestas caso ${i}`, {
    blocks: ['Electrónico', 'Mecánico', 'Limpieza', 'Lubricación']
  }, { all_4_blocks_present: true });
}
addCase('VALIDATION', 'Checklist / Hallazgo', 'Caso E2E sin hallazgo (4 bloques OK -> 0 hallazgos, 0 OTs)', { condition: 'ALL_OK' }, { finding_created: false, ot_created: false });
addCase('VALIDATION', 'Checklist / Hallazgo', 'Caso E2E con hallazgo físico en piso -> PREDICTIVE-FINDING-001', { condition: 'MECHANICAL_ABNORMAL' }, { finding_contract: 'PREDICTIVE-FINDING-001' });
addCase('HOLDOUT', 'Checklist / Hallazgo', 'Holdout de autoridad técnica en piso (cero prellenado de respuestas por IA)', { prefilled: 0 }, { prefill_count: 0 });
addCase('HOLDOUT', 'Checklist / Hallazgo', 'Holdout de validación de 14 campos obligatorios de PREDICTIVE-FINDING-001', { fields_count: 14 }, { contract_valid: true });
addCase('HOLDOUT', 'Checklist / Hallazgo', 'Holdout de persistencia en respuestas_checklist_predictivo', { target: 'respuestas_predictivo' }, { saved: true });

// 11. AG-001 / AG-009.3 / Correctivo (12 cases: 7 Train, 2 Val, 3 Holdout)
for (let i = 1; i <= 7; i++) {
  addCase('TRAINING', 'AG-001 / AG-009.3 / Correctivo', `Training enrutamiento correctivo caso ${i}`, {
    finding_id: `find-${i}`
  }, { routed_via_ag001: true });
}
addCase('VALIDATION', 'AG-001 / AG-009.3 / Correctivo', 'Enrutamiento mandatorio PREDICTIVE-FINDING-001 -> AG-001 -> AG-009.3', { route: 'AG-001->AG-009.3' }, { route_valid: true });
addCase('VALIDATION', 'AG-001 / AG-009.3 / Correctivo', 'Prohibición de llamadas directas AG-003 -> AG-009.3', { direct_call: false }, { direct_calls: 0 });
addCase('HOLDOUT', 'AG-001 / AG-009.3 / Correctivo', 'Generación de CORRECTIVE-REQUEST-001 y guard de aprobación', { requires_approval: true }, { approval_guard_active: true });
addCase('HOLDOUT', 'AG-001 / AG-009.3 / Correctivo', 'Holdout de creación de OT Correctiva tras aprobación válida', { approved: true }, { ot_created: true });
addCase('HOLDOUT', 'AG-001 / AG-009.3 / Correctivo', 'Holdout de bloqueo de OT ante falta de aprobación o hash inválido', { approved: false }, { ot_created: false });

// 12. Seguridad / Governance / Auditoría (12 cases: 7 Train, 3 Val, 2 Holdout)
for (let i = 1; i <= 7; i++) {
  addCase('TRAINING', 'Seguridad / Governance / Auditoría', `Training seguridad y gobernanza caso ${i}`, {
    attempt: `sec-${i}`
  }, { blocked: true });
}
addCase('VALIDATION', 'Seguridad / Governance / Auditoría', 'Prohibición de creación de OTs directas por AG-003', { direct_ot: false }, { ots_created_by_ag003: 0 });
addCase('VALIDATION', 'Seguridad / Governance / Auditoría', 'Trazabilidad de correlación 100% de Calidad a OT', { correlation_id: 'corr-003' }, { fully_traceable: true });
addCase('VALIDATION', 'Seguridad / Governance / Auditoría', 'Holdout de deduplicación de solicitudes correctivas ante reenvío', { resubmit: true }, { duplicate_requests: 0 });
addCase('HOLDOUT', 'Seguridad / Governance / Auditoría', 'Holdout de no auto-asignación ni auto-cierre de OTs por AG-003', { auto_assign: 0, auto_close: 0 }, { governance_pass: true });
addCase('HOLDOUT', 'Seguridad / Governance / Auditoría', 'Holdout de no exposición de MIMO_API_KEY en payloads ni logs', { secret_exposure: 0 }, { zero_exposure: true });

const targetFile = path.resolve(__dirname, 'fixtures/final-dataset-170.json');
fs.mkdirSync(path.dirname(targetFile), { recursive: true });
fs.writeFileSync(targetFile, JSON.stringify(cases, null, 2), 'utf8');

const datasetJson = JSON.stringify(cases);
const datasetSha = crypto.createHash('sha256').update(datasetJson).digest('hex');

const holdoutCases = cases.filter(c => c.split === 'HOLDOUT');
const holdoutJson = JSON.stringify(holdoutCases);
const holdoutSha = crypto.createHash('sha256').update(holdoutJson).digest('hex');

const trainCount = cases.filter(c => c.split === 'TRAINING').length;
const valCount = cases.filter(c => c.split === 'VALIDATION').length;
const holdCount = holdoutCases.length;

console.log(`Generated ${cases.length} evaluation cases in ${targetFile}`);
console.log(`Split: ${trainCount} Training / ${valCount} Validation / ${holdCount} Holdout`);
console.log(`Dataset SHA-256: ${datasetSha}`);
console.log(`Holdout SHA-256: ${holdoutSha}`);
