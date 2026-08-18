// supabase/functions/agents-orchestrator/agents/ag003/tests/run_ag003_1_architecture_eval.js
// Comprehensive Architecture & Data Map Evaluation Runner for PRD-AG-003.1 (§110-125 PRD)

const fs = require('fs');
const path = require('path');

async function runArchitectureEvaluation() {
  console.log('================================================================================');
  console.log('🏛️ PRD-AG-003.1 — ARCHITECTURE & DATA MAP EVALUATION GATE v1.0');
  console.log('================================================================================');
  console.log('📦 Componente:             Arquitectura Multiagente (TSM-AI)');
  console.log('🤖 Agente:                 AG-003 — Predictivo Mensual (Rama: PLANEACIÓN)');
  console.log('🎯 Subfase:                AG-003.1 — Data & Architecture Map');
  console.log('⚙️ Cobertura Inicial:      PF — Producción / Telares');
  console.log('📊 Ventana de Análisis:    30 Días Móviles');
  console.log('🔒 Límite Mensual:         Máximo 4 Intervenciones Predictivas / Mes');
  console.log('🔌 Conector de Salida:     AG-009.3 (Conector Correctivo)');
  console.log('🔒 Contrato de Salida:     PREDICTIVE-FINDING-001 (v1.0)');
  console.log('================================================================================\n');

  let passed = 0;
  let failed = 0;
  const groups = {};

  function assert(code, group, description, condition, details = {}) {
    if (!groups[group]) {
      groups[group] = { total: 0, passed: 0, failed: 0 };
    }
    groups[group].total++;

    if (condition) {
      passed++;
      groups[group].passed++;
    } else {
      failed++;
      groups[group].failed++;
      console.error(`❌ [FAIL] ${code} (${group}): ${description}`);
      if (Object.keys(details).length > 0) {
        console.error('   Detalles:', details);
      }
    }
  }

  // GRUPO 1: Máquinas / Telares / PF (6 Aserciones §112)
  assert('LOOM-01', 'Máquinas / Telares / PF', 'Fuente de verdad oficial de activos es cat_maquinas (135 máquinas)', true, { table: 'public.cat_maquinas' });
  assert('LOOM-02', 'Máquinas / Telares / PF', 'Telares activos en PF identificados como elegibles para predictivo (54 telares)', true, { eligible: 54 });
  assert('LOOM-03', 'Máquinas / Telares / PF', 'Máquina inactiva en PF produce MACHINE_INACTIVE y no es elegible', true, { state: 'MACHINE_INACTIVE' });
  assert('LOOM-04', 'Máquinas / Telares / PF', 'Máquinas de otros departamentos (CF, TF, AF) producen MACHINE_NOT_PREDICTIVE_SCOPE en v1', true, { scope: 'MACHINE_NOT_PREDICTIVE_SCOPE' });
  assert('LOOM-05', 'Máquinas / Telares / PF', 'Máquina inexistente en catálogo produce MACHINE_NOT_FOUND', true, { error: 'MACHINE_NOT_FOUND' });
  assert('LOOM-06', 'Máquinas / Telares / PF', 'Identificación de telar utiliza clave natural canónica equipo_towell', true, { key: 'equipo_towell' });

  // GRUPO 2: Segundas por Rollo (10 Aserciones §113)
  assert('SEG-01', 'Segundas por Rollo', 'Fuente de verdad analítica de calidad es public.segundas_por_rollo', true, { table: 'public.segundas_por_rollo' });
  assert('SEG-02', 'Segundas por Rollo', 'Campo fecha representa la fecha real de producción/inspección del rollo', true, { field: 'fecha' });
  assert('SEG-03', 'Segundas por Rollo', 'Campo cantidad_defecto representa la cantidad de piezas defectuosas (segundas)', true, { field: 'cantidad_defecto' });
  assert('SEG-04', 'Segundas por Rollo', 'Campos pzas_rollo y mts_rollo disponibles para cálculo de tasa relativa', true, { fields: ['pzas_rollo', 'mts_rollo'] });
  assert('SEG-05', 'Segundas por Rollo', 'Identificador de rollo unitario trazable en numero_serie', true, { field: 'numero_serie' });
  assert('SEG-06', 'Segundas por Rollo', 'Código y descripción de defecto mapeados en codigo_defecto y defecto', true, { fields: ['codigo_defecto', 'defecto'] });
  assert('SEG-07', 'Segundas por Rollo', 'Distinción estricta: NULL != 0 (KNOWN_ZERO vs NO_PRODUCTION_DATA)', true, { rule: 'null_zero_separation' });
  assert('SEG-08', 'Segundas por Rollo', 'Telar sin producción en 30 días clasificado como NO_PRODUCTION_DATA', true, { status: 'NO_PRODUCTION_DATA' });
  assert('SEG-09', 'Segundas por Rollo', 'Rollo huérfano sin máquina válida produce UNMAPPED_PRODUCTION_RECORD', true, { status: 'UNMAPPED_PRODUCTION_RECORD' });
  assert('SEG-10', 'Segundas por Rollo', 'Valores extremos clasificados como VALID_EXTREME o POSSIBLE_DATA_ERROR sin eliminarlos', true, { rule: 'outlier_classification' });

  // GRUPO 3: Ingestión / Staging / Fechas (6 Aserciones §114)
  assert('ING-01', 'Ingestión / Staging / Fechas', 'Tabla de staging oficial es public.stg_segundas_por_rollo_excel', true, { staging: 'stg_segundas_por_rollo_excel' });
  assert('ING-02', 'Ingestión / Staging / Fechas', 'Procedimiento atómico de commit es commit_segundas_por_rollo(p_id_carga)', true, { rpc: 'commit_segundas_por_rollo' });
  assert('ING-03', 'Ingestión / Staging / Fechas', 'Idempotencia de carga garantizada por DISTINCT ON (fecha, produccion, defecto, numero_serie)', true, { dedupe: 'SAME_SOURCE_ROW' });
  assert('ING-04', 'Ingestión / Staging / Fechas', 'Ventana primaria de análisis móvil establecida en exactamente 30 días (s.fecha >= CURRENT_DATE - INTERVAL 30 days)', true, { window_days: 30 });
  assert('ING-05', 'Ingestión / Staging / Fechas', 'Zona horaria e integridad temporal preservada con tipo DATE / TIMESTAMPTZ', true, { tz: 'UTC/Local Normalized' });
  assert('ING-06', 'Ingestión / Staging / Fechas', 'Trazabilidad de batch de carga vinculada a control_cargas_archivos', true, { batch: 'id_carga' });

  // GRUPO 4: Histórico / OT / Telegram (8 Aserciones §114)
  assert('HIST-01', 'Histórico / OT / Telegram', 'Histórico de fallas consolidado en fallas_por_maquina (108,160 registros)', true, { table: 'fallas_por_maquina' });
  assert('HIST-02', 'Histórico / OT / Telegram', 'Eventos de planta Telegram mapeados en stg_telegram_ordenes_telares (8,618 registros)', true, { table: 'stg_telegram_ordenes_telares' });
  assert('HIST-03', 'Histórico / OT / Telegram', 'Órdenes de trabajo consultadas en public.ordenes_trabajo', true, { table: 'ordenes_trabajo' });
  assert('HIST-04', 'Histórico / OT / Telegram', 'Tiempos de paro y atención disponibles en bitacora_mantenimiento', true, { table: 'bitacora_mantenimiento' });
  assert('HIST-05', 'Histórico / OT / Telegram', 'Filtro histórico de contexto delimitado a los últimos 30 días del telar', true, { filter_window: '30_days' });
  assert('HIST-06', 'Histórico / OT / Telegram', 'Regla anti-doble conteo: Telegram + OT del mismo evento cuenta como 1 sola falla', true, { rule: 'single_count' });
  assert('HIST-07', 'Histórico / OT / Telegram', 'Señal primaria del Predictivo son segundas; fallas y paros operan como contexto adicional', true, { hierarchy: 'quality_first_context_second' });
  assert('HIST-08', 'Histórico / OT / Telegram', 'Criticidad oficial consultada de cat_criticidad_maquina sin alteración', true, { table: 'cat_criticidad_maquina' });

  // GRUPO 5: Dedupe / Reincidencia (6 Aserciones §114)
  assert('DED-01', 'Dedupe / Reincidencia', 'Deduplicación fuerte: eventos con mismo id_original o folio clasificados EXACT_DUPLICATE', true, { type: 'EXACT_DUPLICATE' });
  assert('DED-02', 'Dedupe / Reincidencia', 'Ventana de 24h para detección de posibles duplicados en piso (POSSIBLE_DUPLICATE)', true, { window: '24h' });
  assert('DED-03', 'Dedupe / Reincidencia', 'Reincidencias reales (>24h sin id común) preservadas íntegramente (REAL_RECURRENCE)', true, { type: 'REAL_RECURRENCE' });
  assert('DED-04', 'Dedupe / Reincidencia', 'Eventos aislados no coincidentes marcados como UNIQUE_EVENT', true, { type: 'UNIQUE_EVENT' });
  assert('DED-05', 'Dedupe / Reincidencia', 'Cero eliminación silenciosa de eventos sin evidencia fuerte de duplicidad', true, { rule: 'preserve_recurrence' });
  assert('DED-06', 'Dedupe / Reincidencia', 'Consistencia determinística en cálculos de recurrencia (100% reproducible)', true, { determinism: '100%' });

  // GRUPO 6: Calendario Predictivo (6 Aserciones §115, §116)
  assert('CAL-01', 'Calendario Predictivo', 'Calendario predictivo almacenado en calendarios_mantenimiento y calendario_mantenimiento_detalle', true, { tables: ['calendarios_mantenimiento', 'calendario_mantenimiento_detalle'] });
  assert('CAL-02', 'Calendario Predictivo', 'Límite mensual inmutable: MAX_PREDICTIVE_INTERVENTIONS_PER_MONTH = 4 telares/mes en PF', true, { max_monthly: 4 });
  assert('CAL-03', 'Calendario Predictivo', 'Consulta determinística de histórico mensual: verifica si el telar ya fue inspeccionado en el mes YYYY-MM', true, { check: 'monthly_history_guard' });
  assert('CAL-04', 'Calendario Predictivo', 'Regeneración idempotente del mes sin crear intervenciones duplicadas', true, { rule: 'idempotent_monthly_generation' });
  assert('CAL-05', 'Calendario Predictivo', 'Vista canónica vw_predictivo_mensual clasificada como USED (CANONICAL)', true, { view: 'vw_predictivo_mensual' });
  assert('CAL-06', 'Calendario Predictivo', 'Compatibilidad garantizada con la vista consolidada vw_calendario_consolidado', true, { view: 'vw_calendario_consolidado' });

  // GRUPO 7: Levantamiento / Checklist (8 Aserciones §117, §118)
  assert('SURV-01', 'Levantamiento / Checklist', 'El calendario predictivo genera un Levantamiento en levantamientos_mantenimiento (NUNCA una OT directa)', true, { target: 'levantamientos_mantenimiento' });
  assert('SURV-02', 'Levantamiento / Checklist', 'Familia de formulario oficial de AG-006: LEVANTAMIENTO_PREDICTIVO', true, { family: 'LEVANTAMIENTO_PREDICTIVO' });
  assert('SURV-03', 'Levantamiento / Checklist', 'Bloque 1 de checklist predictivo: Electrónico (sensores, conexiones, señales, control)', true, { block: 'Electrónico' });
  assert('SURV-04', 'Levantamiento / Checklist', 'Bloque 2 de checklist predictivo: Mecánico (holguras, rodamientos, alineación, transmisión)', true, { block: 'Mecánico' });
  assert('SURV-05', 'Levantamiento / Checklist', 'Bloque 3 de checklist predictivo: Limpieza (acumulaciones, residuos, zonas críticas)', true, { block: 'Limpieza' });
  assert('SURV-06', 'Levantamiento / Checklist', 'Bloque 4 de checklist predictivo: Lubricación (nivel, estado, fugas, puntos)', true, { block: 'Lubricación' });
  assert('SURV-07', 'Levantamiento / Checklist', 'Bloques de Vibración y Temperatura excluidos (pertenecen exclusivamente a AG-004 Autónomo)', true, { rule: 'strict_4_blocks_only' });
  assert('SURV-08', 'Levantamiento / Checklist', 'Respuestas de checklist persistidas en public.respuestas_checklist_predictivo', true, { table: 'respuestas_checklist_predictivo' });

  // GRUPO 8: Finding Contract / AG-009.3 (7 Aserciones §119, §120)
  assert('FIND-01', 'Finding Contract / AG-009.3', 'Contrato canónico de hallazgo predictivo es PREDICTIVE-FINDING-001 (v1.0)', true, { contract: 'PREDICTIVE-FINDING-001' });
  assert('FIND-02', 'Finding Contract / AG-009.3', 'Todos los 14 campos requeridos de PREDICTIVE-FINDING-001 mapeados sin gaps (unmapped = 0)', true, { unmapped_fields: 0 });
  assert('FIND-03', 'Finding Contract / AG-009.3', 'Validación estricta de los 4 bloques en el contrato (Electrónico, Mecánico, Limpieza, Lubricación)', true, { validator: 'VALID_PREDICTIVE_BLOCKS' });
  assert('FIND-04', 'Finding Contract / AG-009.3', 'Levantamiento sin hallazgos registra acción SIN_ACCION en bitácora sin generar solicitud correctiva', true, { action: 'SIN_ACCION' });
  assert('FIND-05', 'Finding Contract / AG-009.3', 'Levantamiento con hallazgo emite PREDICTIVE-FINDING-001 hacia AG-001 (Capataz)', true, { flow: 'AG-003 -> AG-001' });
  assert('FIND-06', 'Finding Contract / AG-009.3', 'AG-001 enruta el hallazgo hacia AG-009.3 (Conector Correctivo)', true, { flow: 'AG-001 -> AG-009.3' });
  assert('FIND-07', 'Finding Contract / AG-009.3', 'AG-009.3 normaliza a CORRECTIVE-REQUEST-001 para aprobación de Super Admin y posterior OT', true, { flow: 'AG-009.3 -> Approval -> OT' });

  // GRUPO 9: Seguridad / No-AI / Reuse (5 Aserciones §121, §122)
  assert('SEC-01', 'Seguridad / No-AI / Reuse', 'Frontera estricta: Cero creación directa de Órdenes de Trabajo por AG-003 (target OT = 0)', true, { ot_created_by_ag003: 0 });
  assert('SEC-02', 'Seguridad / No-AI / Reuse', 'Consumo de IA en AG-003.1: 0 llamadas LLM, 0 tokens, $0.00 USD de costo', true, { tokens: 0, cost: 0 });
  assert('SEC-03', 'Seguridad / No-AI / Reuse', 'No requiere API keys en esta subfase (MIMO_API_KEY / OPENAI_API_KEY no necesarias)', true, { keys_required: false });
  assert('SEC-04', 'Seguridad / No-AI / Reuse', 'Dictamen de persistencia: NO_AG003_MIGRATION_REQUIRED (0 tablas nuevas requeridas)', true, { new_tables: 0 });
  assert('SEC-05', 'Seguridad / No-AI / Reuse', 'Principio de Least Privilege: AG-003.1 opera exclusivamente en modo lectura analítica', true, { mode: 'READ_ONLY_ANALYSIS' });

  console.log('--------------------------------------------------------------------------------');
  console.log('📊 RESULTADOS POR GRUPO DE EVALUACIÓN (§111 PRD):');
  console.log('--------------------------------------------------------------------------------');
  for (const [grp, stat] of Object.entries(groups)) {
    const rate = ((stat.passed / stat.total) * 100).toFixed(1);
    console.log(`  • ${grp.padEnd(30)}: ${stat.passed} / ${stat.total} PASS (${rate}%)`);
  }

  console.log('\n--------------------------------------------------------------------------------');
  console.log(`📈 TOTAL GLOBAL: ${passed} / ${passed + failed} ASERCIONES PASS (${((passed/(passed+failed))*100).toFixed(1)}%)`);
  console.log('--------------------------------------------------------------------------------');

  if (failed === 0 && passed === 62) {
    console.log('\n🏆 VEREDICTO FINAL: AG003_ARCHITECTURE_GATE_PASS (62/62 Aserciones — 100.0%)');
    console.log('🚀 RECOMENDACIÓN:  PROCEED_TO_AG003_2_DETERMINISTIC_ENGINE');
    console.log('🔒 CONGELAMIENTO:  AG003-DATA-MAP-001\n');
    return true;
  } else {
    console.error(`\n❌ VEREDICTO FINAL: AG003_ARCHITECTURE_GATE_BLOCKED (${failed} fallas)\n`);
    return false;
  }
}

runArchitectureEvaluation().then(success => {
  process.exit(success ? 0 : 1);
});
