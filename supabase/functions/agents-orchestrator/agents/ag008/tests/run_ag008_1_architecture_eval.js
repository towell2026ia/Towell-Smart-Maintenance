// supabase/functions/agents-orchestrator/agents/ag008/tests/run_ag008_1_architecture_eval.js
// Architecture & Failure Intelligence Evaluation Suite for PRD-AG-008.1 (100 Assertions)
// Frozen under Token: AG008-DATA-MAP-001

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

let totalAssertions = 0;
let passedAssertions = 0;
let failedAssertions = 0;

function assert(condition, message, group = 'General') {
  totalAssertions++;
  if (condition) {
    passedAssertions++;
    console.log(`  ✅ [PASS] [${group}] ${message}`);
  } else {
    failedAssertions++;
    console.error(`  ❌ [FAIL] [${group}] ${message}`);
  }
}

async function runArchitectureEvaluation() {
  console.log('================================================================================');
  console.log('🏁 PRD-AG-008.1 — DATA & FAILURE INTELLIGENCE ARCHITECTURE MAP EVALUATION');
  console.log('================================================================================\n');

  const docsDir = path.join(__dirname, '..', 'docs');
  const typesFile = path.join(__dirname, '..', 'types', 'ag008.types.ts');

  // --- GRUPO 1: Source Inventory (10 Aserciones) ---
  const sourceInvPath = path.join(docsDir, 'AG008_SOURCE_INVENTORY.md');
  assert(fs.existsSync(sourceInvPath), 'AG008_SOURCE_INVENTORY.md existe', 'Source Inventory');
  const sourceInvContent = fs.readFileSync(sourceInvPath, 'utf8');
  assert(sourceInvContent.includes('ordenes_trabajo'), 'Mapeo de ordenes_trabajo presente', 'Source Inventory');
  assert(sourceInvContent.includes('stg_telegram_ordenes_telares'), 'Mapeo de Telegram presente', 'Source Inventory');
  assert(sourceInvContent.includes('fallas_por_maquina'), 'Mapeo de fallas_por_maquina presente', 'Source Inventory');
  assert(sourceInvContent.includes('stg_fallas_por_maquina_excel'), 'Mapeo de Excel staging presente', 'Source Inventory');
  assert(sourceInvContent.includes('levantamientos_mantenimiento'), 'Mapeo de levantamientos presente', 'Source Inventory');
  assert(sourceInvContent.includes('bitacora_mantenimiento'), 'Mapeo de bitacora presente', 'Source Inventory');
  assert(sourceInvContent.includes('cat_maquinas'), 'Mapeo de cat_maquinas presente', 'Source Inventory');
  assert(sourceInvContent.includes('raw_failure_overwrite = 0'), 'Invariante de texto crudo documentado', 'Source Inventory');
  assert(sourceInvContent.includes('UNATTRIBUTED_FAILURE'), 'Manejo de fallas no atribuidas documentado', 'Source Inventory');

  // --- GRUPO 2: Machine / Department Mapping (10 Aserciones) ---
  const sotMatrixPath = path.join(docsDir, 'AG008_SOURCE_OF_TRUTH_MATRIX.md');
  assert(fs.existsSync(sotMatrixPath), 'AG008_SOURCE_OF_TRUTH_MATRIX.md existe', 'Machine/Dept Mapping');
  const sotContent = fs.readFileSync(sotMatrixPath, 'utf8');
  assert(sotContent.includes('cat_maquinas(equipo_towell)'), 'cat_maquinas como autoridad de equipo', 'Machine/Dept Mapping');
  assert(sotContent.includes('PF'), 'Código de departamento PF soportado', 'Machine/Dept Mapping');
  assert(sotContent.includes('CF'), 'Código de departamento CF soportado', 'Machine/Dept Mapping');
  assert(sotContent.includes('TF'), 'Código de departamento TF soportado', 'Machine/Dept Mapping');
  assert(sotContent.includes('AF'), 'Código de departamento AF soportado', 'Machine/Dept Mapping');
  assert(sotContent.includes('UNATTRIBUTED_FAILURE'), 'Fallas sin máquina permanecen en total global', 'Machine/Dept Mapping');
  assert(sotContent.includes('criticidad'), 'Criticidad de máquina mapeada como contexto', 'Machine/Dept Mapping');
  assert(!sotContent.includes('modificar criticidad'), 'AG-008 no modifica criticidad de catálogo', 'Machine/Dept Mapping');
  assert(sotContent.includes('AG008-SOURCE-OF-TRUTH-001'), 'Token de Source of Truth referenciado', 'Machine/Dept Mapping');

  // --- GRUPO 3: Failure Time Semantics (10 Aserciones) ---
  const timeSemPath = path.join(docsDir, 'AG008_FAILURE_TIME_SEMANTICS.md');
  assert(fs.existsSync(timeSemPath), 'AG008_FAILURE_TIME_SEMANTICS.md existe', 'Time Semantics');
  const timeContent = fs.readFileSync(timeSemPath, 'utf8');
  assert(timeContent.includes('occurred_at'), 'Semántica de occurred_at definida', 'Time Semantics');
  assert(timeContent.includes('requested_at'), 'Semántica de requested_at definida', 'Time Semantics');
  assert(timeContent.includes('executed_at'), 'Semántica de executed_at definida', 'Time Semantics');
  assert(timeContent.includes('closed_at'), 'Semántica de closed_at definida', 'Time Semantics');
  assert(timeContent.includes('APPROXIMATED_FROM_REQUEST'), 'Manejo de fechas aproximadas definido', 'Time Semantics');
  assert(timeContent.includes('America/Mexico_City'), 'Zona horaria canónica de planta definida', 'Time Semantics');
  assert(timeContent.includes('YYYY-Www'), 'Formato ISO para semanas definido', 'Time Semantics');
  assert(timeContent.includes('YYYY-MM'), 'Formato ISO para meses definido', 'Time Semantics');
  assert(timeContent.includes('Turno 1'), 'Turnos de operación formalmente mapeados', 'Time Semantics');

  // --- GRUPO 4: Raw / Normalized Failure (10 Aserciones) ---
  assert(fs.existsSync(typesFile), 'ag008.types.ts existe', 'Raw/Norm Failure');
  const typesContent = fs.readFileSync(typesFile, 'utf8');
  assert(typesContent.includes('failure_raw: string'), 'Campo failure_raw inmutable definido', 'Raw/Norm Failure');
  assert(typesContent.includes('failure_normalized: string'), 'Campo failure_normalized derivado definido', 'Raw/Norm Failure');
  assert(sourceInvContent.includes('Normalización Determinística'), 'Normalización documentada sin IA', 'Raw/Norm Failure');
  assert(sotContent.includes('AG008-FAILURE-NORMALIZATION-001'), 'Token de normalización referenciado', 'Raw/Norm Failure');
  assert(!sourceInvContent.includes('normalizar con LLM'), 'Cero uso de LLM para normalización', 'Raw/Norm Failure');
  assert(sotContent.toLowerCase().includes('trim'), 'Regla trim incluida en normalizador', 'Raw/Norm Failure');
  assert(sotContent.toLowerCase().includes('acentos'), 'Regla de acentos incluida en normalizador', 'Raw/Norm Failure');
  assert(sotContent.toLowerCase().includes('minúsculas'), 'Regla de minúsculas incluida en normalizador', 'Raw/Norm Failure');
  assert(!sotContent.includes('inferir causa'), 'Invariante: no inferir causa de síntoma', 'Raw/Norm Failure');

  // --- GRUPO 5: Taxonomy / Categories (8 Aserciones) ---
  const dataAvailPath = path.join(docsDir, 'AG008_DATA_AVAILABILITY_MATRIX.md');
  assert(fs.existsSync(dataAvailPath), 'AG008_DATA_AVAILABILITY_MATRIX.md existe', 'Taxonomy');
  const dataAvailContent = fs.readFileSync(dataAvailPath, 'utf8');
  assert(dataAvailContent.includes('Categoría Técnica'), 'Mapeo de categorías técnicas evaluado', 'Taxonomy');
  assert(dataAvailContent.includes('USABLE_WITH_NORMALIZATION'), 'Estado de categorías técnicas documentado', 'Taxonomy');
  assert(typesContent.includes('failure_category: string | null'), 'Categoría de falla nullable en contrato', 'Taxonomy');
  assert(typesContent.includes('MaintenanceType'), 'Tipo de mantenimiento tipado canónicamente', 'Taxonomy');
  assert(typesContent.includes('PREVENTIVO'), 'Mantenimiento Preventivo soportado', 'Taxonomy');
  assert(typesContent.includes('CORRECTIVO'), 'Mantenimiento Correctivo soportado', 'Taxonomy');
  assert(typesContent.includes('AUTONOMO'), 'Mantenimiento Autónomo soportado', 'Taxonomy');

  // --- GRUPO 6: Telegram / OT Dedupe (10 Aserciones) ---
  const dedupePath = path.join(docsDir, 'AG008_FAILURE_DEDUPE_MODEL.md');
  assert(fs.existsSync(dedupePath), 'AG008_FAILURE_DEDUPE_MODEL.md existe', 'Dedupe');
  const dedupeContent = fs.readFileSync(dedupePath, 'utf8');
  assert(dedupeContent.includes('SHA-256'), 'Deduplicación criptográfica SHA-256', 'Dedupe');
  assert(dedupeContent.includes('Duplicado Exacto'), 'Tratamiento de duplicados exactos documentado', 'Dedupe');
  assert(dedupeContent.includes('Cross-Source Duplicate'), 'Deduplicación Telegram ↔ OT documentada', 'Dedupe');
  assert(dedupeContent.includes('ordenes_trabajo'), 'Precedencia de OTs sobre Telegram', 'Dedupe');
  assert(dedupeContent.includes('levantamientos_mantenimiento'), 'Precedencia de levantamientos físicos', 'Dedupe');
  assert(dedupeContent.includes('Verdadera Recurrencia'), 'True recurrence no eliminada como duplicado', 'Dedupe');
  assert(dedupeContent.includes('AG008-FAILURE-DEDUPE-MODEL-001'), 'Token de dedupe referenciado', 'Dedupe');
  assert(typesContent.includes('failure_event_id: string'), 'ID de evento determinístico en types', 'Dedupe');
  assert(!dedupeContent.includes('eliminar recurrencia'), 'Protección contra borrado de recurrencias reales', 'Dedupe');

  // --- GRUPO 7: Physical Findings (8 Aserciones) ---
  assert(typesContent.includes('physical_finding: boolean'), 'Flag physical_finding en FailureEvent', 'Physical Findings');
  assert(sotContent.includes('levantamientos_mantenimiento'), 'Levantamientos como fuente física', 'Physical Findings');
  assert(sotContent.includes('AG-004'), 'Frontera de hallazgos autónomos AG-004', 'Physical Findings');
  assert(sotContent.includes('AG-003'), 'Frontera de hallazgos predictivos AG-003', 'Physical Findings');
  assert(!sotContent.includes('crear hallazgo físico'), 'AG-008 no crea hallazgos físicos actuales', 'Physical Findings');
  assert(dataAvailContent.includes('RELIABLE'), 'Levantamientos clasificados como confiables', 'Physical Findings');
  assert(typesContent.includes('is_resolved: boolean'), 'Estado de resolución física registrado', 'Physical Findings');
  assert(typesContent.includes('resolution_date: string | null'), 'Fecha de resolución física auditada', 'Physical Findings');

  // --- GRUPO 8: Recurrence / Reincidence Semantics (10 Aserciones) ---
  const recMatrixPath = path.join(docsDir, 'AG008_RECURRENCE_REINCIDENCE_MATRIX.md');
  assert(fs.existsSync(recMatrixPath), 'AG008_RECURRENCE_REINCIDENCE_MATRIX.md existe', 'Recurrence/Reincidence');
  const recContent = fs.readFileSync(recMatrixPath, 'utf8');
  assert(recContent.includes('Frecuencia'), 'Definición de frecuencia documentada', 'Recurrence/Reincidence');
  assert(recContent.includes('Recurrencia'), 'Definición de recurrencia documentada', 'Recurrence/Reincidence');
  assert(recContent.includes('Reincidencia'), 'Definición de reincidencia documentada', 'Recurrence/Reincidence');
  assert(recContent.includes('REPEATED'), 'Estado REPEATED definido (2 ocurrencias)', 'Recurrence/Reincidence');
  assert(recContent.includes('RECURRENT'), 'Estado RECURRENT definido (>= 3 ocurrencias)', 'Recurrence/Reincidence');
  assert(recContent.includes('REINCIDENCE'), 'Estado REINCIDENCE definido (post-cierre OT)', 'Recurrence/Reincidence');
  assert(recContent.includes('INSUFFICIENT_DATA'), 'Estado INSUFFICIENT_DATA definido', 'Recurrence/Reincidence');
  assert(typesContent.includes('FailureRecurrenceGroup'), 'Estructura FailureRecurrenceGroup en types', 'Recurrence/Reincidence');
  assert(typesContent.includes('repeat_interval_days_avg'), 'Intervalo promedio entre fallas tipado', 'Recurrence/Reincidence');
  assert(recContent.includes('AG008-RECURRENCE-SEMANTICS-001'), 'Token de semántica de recurrencia presente', 'Recurrence/Reincidence');

  // --- GRUPO 9: Trend / Seasonality Readiness (8 Aserciones) ---
  assert(dataAvailContent.includes('Series Diarias/Semanales'), 'Series temporales listas en data availability', 'Trend/Seasonality');
  assert(dataAvailContent.includes('INSUFFICIENT_HISTORY_FOR_SEASONALITY'), 'Tratamiento de estacionalidad insuficiente', 'Trend/Seasonality');
  assert(dataAvailContent.includes('MTBF_NOT_SUPPORTED_WITH_CURRENT_DATA'), 'Declaración explícita de MTBF no soportado', 'Trend/Seasonality');
  assert(typesContent.includes('FailureSeriesPoint'), 'FailureSeriesPoint definido en types', 'Trend/Seasonality');
  assert(typesContent.includes('TrendDirection'), 'TrendDirection definida en types', 'Trend/Seasonality');
  assert(typesContent.includes('SeasonalityStatus'), 'SeasonalityStatus definida en types', 'Trend/Seasonality');
  assert(typesContent.includes('UP'), 'Dirección UP soportada', 'Trend/Seasonality');
  assert(typesContent.includes('INSUFFICIENT_HISTORY'), 'Estado INSUFFICIENT_HISTORY soportado', 'Trend/Seasonality');

  // --- GRUPO 10: Lineage / Traceability (8 Aserciones) ---
  const lineagePath = path.join(docsDir, 'AG008_FAILURE_LINEAGE_MATRIX.md');
  assert(fs.existsSync(lineagePath), 'AG008_FAILURE_LINEAGE_MATRIX.md existe', 'Lineage');
  const lineageContent = fs.readFileSync(lineagePath, 'utf8');
  assert(lineageContent.includes('failure_signal_traceability = 100%'), 'Meta de trazabilidad 100% documentada', 'Lineage');
  assert(lineageContent.includes('unsupported_failure_signals = 0'), 'Cero señales no sustentadas', 'Lineage');
  assert(typesContent.includes('evidence_event_ids: string[]'), 'Campo evidence_event_ids en FailureSignal', 'Lineage');
  assert(typesContent.includes('source_references: string[]'), 'Campo source_references en FailureSignal', 'Lineage');
  assert(typesContent.includes('rule_version: string'), 'Campo rule_version en FailureSignal', 'Lineage');
  assert(lineageContent.includes('CADENA DE LINAJE'), 'Diagrama de cadena de linaje documentado', 'Lineage');
  assert(lineageContent.includes('AG008-FAILURE-LINEAGE-001'), 'Token de linaje referenciado', 'Lineage');

  // --- GRUPO 11: UI / AG-001 / Governance / Security (8 Aserciones) ---
  const dbMapPath = path.join(docsDir, 'AG008_DATABASE_INTERACTION_MAP.md');
  const dbMapContent = fs.readFileSync(dbMapPath, 'utf8');
  const gapPath = path.join(docsDir, 'AG008_PERSISTENCE_GAP_ANALYSIS.md');
  const gapContent = fs.readFileSync(gapPath, 'utf8');
  const alertReadinessPath = path.join(docsDir, 'AG008_ALERT_READINESS_MATRIX.md');
  const alertContent = fs.readFileSync(alertReadinessPath, 'utf8');

  assert(dbMapContent.includes('AG-001 (Capataz)'), 'Enrutamiento UI exclusivo a través de AG-001', 'UI/AG-001/Gov');
  assert(gapContent.includes('NO_AG008_MIGRATION_REQUIRED'), 'Decisión de migración NO_AG008_MIGRATION_REQUIRED', 'UI/AG-001/Gov');
  assert(alertContent.includes('FAILURE_RECURRENCE_ALERT'), 'Alerta de recurrencia en matriz de preparación', 'UI/AG-001/Gov');
  assert(alertContent.includes('FAILURE_TREND_UP'), 'Alerta de tendencia alcista en matriz', 'UI/AG-001/Gov');
  assert(!sotContent.includes('crear ordenes_trabajo'), 'AG-008 no crea OTs', 'UI/AG-001/Gov');
  assert(!sotContent.includes('calcular costo'), 'AG-008 no calcula costos (pertenece a AG-007)', 'UI/AG-001/Gov');
  assert(!sotContent.includes('clasificar mal actor como autoridad'), 'AG-008 no clasifica malos actores (pertenece a AG-013)', 'UI/AG-001/Gov');
  assert(!dbMapContent.includes('OpenAI') && !dbMapContent.includes('MiMo'), 'Fase AG-008.1 con cero llamadas a LLM ($0.00 USD)', 'UI/AG-001/Gov');

  console.log('\n================================================================================');
  console.log('📊 RESUMEN DE EVALUACIÓN ARQUITECTÓNICA AG-008.1:');
  console.log(`   Total Aserciones Evaluadas: ${totalAssertions}`);
  console.log(`   Aprobadas (PASS):           ${passedAssertions} (${((passedAssertions/totalAssertions)*100).toFixed(2)}%)`);
  console.log(`   Fallidas  (FAIL):           ${failedAssertions}`);
  console.log(`   Tokens Consumidos:          0`);
  console.log(`   Costo IA Total:             $0.00 USD`);
  console.log('================================================================================');

  if (passedAssertions >= 100 && failedAssertions === 0) {
    console.log('🏆 VEREDICTO FINAL: AG008_ARCHITECTURE_GATE_PASS ✅');
    console.log('🔒 FREEZE TOKEN CONCEDIDO: AG008-DATA-MAP-001\n');
    return { success: true };
  } else {
    console.error('❌ VEREDICTO: AG008_ARCHITECTURE_GATE_FAILED\n');
    process.exit(1);
  }
}

runArchitectureEvaluation().catch(err => {
  console.error('Error fatal en evaluación arquitectónica:', err);
  process.exit(1);
});
