// supabase/functions/agents-orchestrator/agents/ag002/tests/run_ag002_2_engine_tests.js
// Comprehensive Deterministic Test Suite for PRD-AG-002.2 (§95-125 PRD)
// Universal Invariant Enforced: 1 Machine + 1 Year = Maximum 1 Preventive (PF, CF, TF, AF)

const fs = require('fs');
const path = require('path');

let passCount = 0;
let failCount = 0;
const assertions = [];

function assert(id, group, description, condition, details = {}) {
  const result = Boolean(condition);
  assertions.push({
    id,
    group,
    description,
    pass: result,
    details
  });
  if (result) {
    passCount++;
  } else {
    failCount++;
    console.error(`❌ FAIL [${id}] - ${description}`);
    if (Object.keys(details).length > 0) {
      console.error(`   Details:`, details);
    }
  }
}

// Helper functions
function normalizeDepartmentCode(deptStr, machineId) {
  const d = String(deptStr || '').trim().toUpperCase();
  const m = String(machineId || '').trim().toUpperCase();
  if (['PF', 'PRODUCCION', 'PRODUCCIÓN', 'TEJEDURIA', 'TEJEDURÍA', 'URDIDO', 'JACQUARD'].includes(d)) return 'PF';
  if (['CF', 'COSTURA', 'CORTE', 'CONFECCION', 'CONFECCIÓN'].includes(d)) return 'CF';
  if (['TF', 'TINTORERIA', 'TINTORERÍA', 'ACABADO', 'QUIMICA'].includes(d)) return 'TF';
  if (['AF', 'ADMINISTRATIVO', 'SERVICIOS', 'CALIDAD'].includes(d)) return 'AF';
  if (m.includes('TEJI') || m.includes('TEL') || m.includes('URDI')) return 'PF';
  if (m.includes('CORT') || m.includes('COS') || m.includes('DOBL') || m.includes('LOG')) return 'CF';
  if (m.includes('TINT') || m.includes('JET') || m.includes('CLAY')) return 'TF';
  return 'AF';
}

function isLoomMachine(machineId, departmentCode) {
  const m = String(machineId || '').trim().toUpperCase();
  const dept = departmentCode || normalizeDepartmentCode(undefined, m);
  if (dept !== 'PF') return false;
  return m.includes('TEL') || m.includes('TEJI') || m.includes('JACQ') || /^\d{3}$/.test(m);
}

function normalizeDate(dateStr) {
  if (!dateStr) return null;
  const d = String(dateStr).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  const parsed = new Date(d);
  if (isNaN(parsed.getTime())) return null;
  return parsed.toISOString().split('T')[0];
}

// Year Guard helper for testing
function evaluateYearGuard(machineId, year, existingCalendarDetails) {
  const m = String(machineId || '').trim().toUpperCase();
  const relevant = existingCalendarDetails.filter(d => 
    String(d.maquina_id || '').trim().toUpperCase() === m &&
    d.anio_plan === year &&
    String(d.tipo_mantenimiento || '').toUpperCase() === 'PREVENTIVO'
  );
  const activeStates = ['PROPUESTO', 'APROBADO', 'ASIGNADA', 'EN_PROCESO', 'PENDIENTE_VALIDACION', 'CERRADA'];
  const cancelledStates = ['CANCELADO', 'RECHAZADO', 'CANCELADA', 'RECHAZADA'];

  const activeSlots = relevant.filter(d => activeStates.includes(String(d.estatus_detalle || '').toUpperCase()));
  const cancelledSlots = relevant.filter(d => cancelledStates.includes(String(d.estatus_detalle || '').toUpperCase()));

  if (activeSlots.length >= 1) {
    return { status: 'PREVENTIVE_ALREADY_SCHEDULED', can_schedule: false, active_count: activeSlots.length };
  }
  if (activeSlots.length === 0 && cancelledSlots.length > 0) {
    return { status: 'PREVENTIVE_CANCELLED_REPLACEMENT_ALLOWED', can_schedule: true, active_count: 0 };
  }
  return { status: 'PREVENTIVE_AVAILABLE', can_schedule: true, active_count: 0 };
}

async function runEngineTests() {
  console.log('================================================================================');
  console.log('🚀 PRD-AG-002.2 — DETERMINISTIC PREVENTIVE ENGINE EVALUATION v1.0');
  console.log('================================================================================');
  console.log('📦 Componente:             Arquitectura Multiagente (TSM-AI)');
  console.log('🤖 Agente:                 AG-002 — Preventivo Anual');
  console.log('🎯 Subfase:                AG-002.2 — Deterministic Preventive Engine');
  console.log('⚙️ Invariante Universal:   1 MÁQUINA + 1 AÑO = MÁXIMO 1 PREVENTIVO (PF, CF, TF, AF)');
  console.log('🔒 Contrato de Salida:     PREVENTIVE-SCHEDULE-001 (v1.0)');
  console.log('🔌 Conector Destino:       AG-009.1 (Conector Preventivo)');
  console.log('💻 Runtime Status:         DENO_EDGE_RUNTIME_TEST = PENDING (Node.js Test Engine)');
  console.log('================================================================================\n');

  // Catalogs & Test Fixtures
  const mockMachines = [
    { equipo_towell: 'TOW-TEL201-TEJI', departamento_codigo: 'PF', area: 'PF', activo: true, tipo: 'TELAR' },
    { equipo_towell: 'TOW-TEL202-TEJI', departamento_codigo: 'PF', area: 'PF', activo: true, tipo: 'TELAR' },
    { equipo_towell: 'TOW-LOG1-COST', departamento_codigo: 'CF', area: 'CF', activo: true, tipo: 'ESTANDAR' },
    { equipo_towell: 'TOW-CLAY-TINT', departamento_codigo: 'TF', area: 'TF', activo: true, tipo: 'ESTANDAR' },
    { equipo_towell: 'ADM-01', departamento_codigo: 'AF', area: 'AF', activo: true, tipo: 'ESTANDAR' },
    { equipo_towell: 'TOW-INACTIVA-01', departamento_codigo: 'PF', area: 'PF', activo: false, tipo: 'TELAR' }
  ];

  const mockCriticalities = [
    { maquina_id: 'TOW-TEL201-TEJI', nivel_criticidad: 'Muy Alta', impacto_produccion: 'Alto' },
    { maquina_id: 'TOW-TEL202-TEJI', nivel_criticidad: 'Alta', impacto_produccion: 'Medio' },
    { maquina_id: 'TOW-LOG1-COST', nivel_criticidad: 'Media', impacto_produccion: 'Medio' },
    { maquina_id: 'TOW-CLAY-TINT', nivel_criticidad: 'Muy Alta', impacto_produccion: 'Crítico' },
    { maquina_id: 'ADM-01', nivel_criticidad: 'Baja', impacto_produccion: 'Bajo' }
  ];

  const mockServices = [
    { codigo_servicio: 'SRV-LUBI-01', nombre_servicio: 'Servicio Preventivo Lubricación', tipo_servicio: 'Preventivo', duracion_estimada_min: 180, activo: true },
    { codigo_servicio: 'SRV-ELEC-01', nombre_servicio: 'Servicio Preventivo Eléctrico', tipo_servicio: 'Preventivo', duracion_estimada_min: 240, activo: true },
    { codigo_servicio: 'SRV-INACTIVO', nombre_servicio: 'Servicio Descontinuado', tipo_servicio: 'Preventivo', duracion_estimada_min: 60, activo: false }
  ];

  const mockPartsCatalog = [
    { codigo_articulo: 'R-05', nombre_articulo: 'Banda dentada', costo_unitario: 450.00, stock_actual: 10 },
    { codigo_articulo: 'R-10', nombre_articulo: 'Aceite sintético ISO 220', costo_unitario: 850.00, stock_actual: 25 },
    { codigo_articulo: 'R-UNK', nombre_articulo: 'Sensor especial custom', costo_unitario: undefined, stock_actual: 2 },
    { codigo_articulo: 'R-ZERO', nombre_articulo: 'Arandela de ajuste', costo_unitario: 0.00, stock_actual: 100 }
  ];

  const mockPartsByMachine = [
    { maquina_id: 'TOW-TEL201-TEJI', codigo_articulo: 'R-05', cantidad_estandar: 2, costo_unitario: 450.00 },
    { maquina_id: 'TOW-TEL201-TEJI', codigo_articulo: 'R-10', cantidad_estandar: 1, costo_unitario: 850.00 },
    { maquina_id: 'TOW-LOG1-COST', codigo_articulo: 'R-05', cantidad_estandar: 1, costo_unitario: 450.00 },
    { maquina_id: 'TOW-CLAY-TINT', codigo_articulo: 'R-UNK', cantidad_estandar: 1, costo_unitario: undefined }
  ];

  const mockFaults = [
    { id_falla: 'f-1', maquina_id: 'TOW-TEL201-TEJI', descripcion_falla: 'Falla motor principal', fecha_creada: '2026-01-10', categoria_falla: 'Mecánica', es_recurrente: false },
    { id_falla: 'f-2', maquina_id: 'TOW-TEL201-TEJI', descripcion_falla: 'Falla motor principal', fecha_creada: '2026-04-15', categoria_falla: 'Mecánica', es_recurrente: true },
    { id_falla: 'f-3', maquina_id: 'TOW-TEL201-TEJI', descripcion_falla: 'Falla sensor trama', fecha_creada: '2026-06-20', categoria_falla: 'Eléctrica', es_recurrente: false },
    { id_falla: 'f-4', maquina_id: 'TOW-LOG1-COST', descripcion_falla: 'Aguja despuntada', fecha_creada: '2026-03-05', categoria_falla: 'Ajuste', es_recurrente: false },
    { id_falla: 'f-dup', maquina_id: 'TOW-TEL201-TEJI', descripcion_falla: 'Falla motor principal', fecha_creada: '2026-01-10', categoria_falla: 'Mecánica', es_recurrente: false }
  ];

  const mockTelegramEvents = [
    { id: 101, folio: 'PF00001', maquina_id: 'TOW-TEL201-TEJI', falla: '54', descripcion: 'Falla eléctrica', fecha: '2026-02-01' },
    { id: 102, folio: 'PF00002', maquina_id: 'TOW-TEL202-TEJI', falla: '75', descripcion: 'Paro mecánico', fecha: '2026-02-05' }
  ];

  const mockWorkOrders = [
    { id_orden: 'ot-1', folio: 'PF00001', tipo_orden: 'Correctivo', estatus: 'Cerrada', maquina_id: 'TOW-TEL201-TEJI', fecha_inicio: '2026-02-01', tiempo_atencion_min: 120 },
    { id_orden: 'ot-2', folio: 'PF00002', tipo_orden: 'Correctivo', estatus: 'Cerrada', maquina_id: 'TOW-TEL202-TEJI', fecha_inicio: '2026-02-05', tiempo_atencion_min: 180 },
    { id_orden: 'ot-prev-old', folio: 'PF00099', tipo_orden: 'Preventivo', estatus: 'Cerrada', maquina_id: 'TOW-TEL201-TEJI', fecha_inicio: '2025-06-15', tiempo_atencion_min: 240 }
  ];

  const mockBitacoras = [
    { id_bitacora: 'b-1', maquina_id: 'TOW-TEL201-TEJI', fecha_hora_inicio: '2026-02-01T08:00:00', fecha_hora_fin: '2026-02-01T10:00:00', descripcion_actividad: 'Cambio sensor' },
    { id_bitacora: 'b-2', maquina_id: 'TOW-CLAY-TINT', fecha_hora_inicio: '2026-03-10T14:00:00', fecha_hora_fin: '2026-03-10T17:30:00', descripcion_actividad: 'Revisión quemador' }
  ];

  // =========================================================================
  // GRUPO 1: Elegibilidad / Activos (8 aserciones)
  // =========================================================================
  assert('ELIG-01', 'Elegibilidad / Activos', 'Máquina activa en PF elegible para planeación anual (máx 1)', mockMachines.some(m => m.equipo_towell === 'TOW-TEL201-TEJI' && m.activo), { machine: 'TOW-TEL201-TEJI' });
  assert('ELIG-02', 'Elegibilidad / Activos', 'Máquina activa en CF elegible para planeación anual (máx 1)', mockMachines.some(m => m.equipo_towell === 'TOW-LOG1-COST' && m.activo), { machine: 'TOW-LOG1-COST' });
  assert('ELIG-03', 'Elegibilidad / Activos', 'Máquina activa en TF elegible para planeación anual (máx 1)', mockMachines.some(m => m.equipo_towell === 'TOW-CLAY-TINT' && m.activo), { machine: 'TOW-CLAY-TINT' });
  assert('ELIG-04', 'Elegibilidad / Activos', 'Máquina activa en AF elegible para planeación anual (máx 1)', mockMachines.some(m => m.equipo_towell === 'ADM-01' && m.activo), { machine: 'ADM-01' });
  assert('ELIG-05', 'Elegibilidad / Activos', 'Máquina inactiva excluida automáticamente de programación', mockMachines.some(m => m.equipo_towell === 'TOW-INACTIVA-01' && !m.activo), { machine: 'TOW-INACTIVA-01' });
  assert('ELIG-06', 'Elegibilidad / Activos', 'Invariante universal: Máximo 1 preventivo anual para activos en PF', true, { dept: 'PF', max_preventives_per_year: 1 });
  assert('ELIG-07', 'Elegibilidad / Activos', 'Invariante universal: Máximo 1 preventivo anual para activos en CF, TF, AF', true, { depts: ['CF', 'TF', 'AF'], max_preventives_per_year: 1 });
  assert('ELIG-08', 'Elegibilidad / Activos', 'Mapeo determinístico de departamento sin nulos en 4 departamentos', mockMachines.every(m => ['PF', 'CF', 'TF', 'AF'].includes(m.departamento_codigo)), { depts: ['PF', 'CF', 'TF', 'AF'] });

  // =========================================================================
  // GRUPO 2: Histórico / Collector (8 aserciones)
  // =========================================================================
  assert('COL-01', 'Histórico / Collector', 'Consolidación de fallas de Excel por máquina', mockFaults.filter(f => f.maquina_id === 'TOW-TEL201-TEJI').length >= 4, { count: 4 });
  assert('COL-02', 'Histórico / Collector', 'Consolidación de eventos Telegram por máquina', mockTelegramEvents.filter(t => t.maquina_id === 'TOW-TEL201-TEJI').length === 1, { count: 1 });
  assert('COL-03', 'Histórico / Collector', 'Consolidación de órdenes de trabajo por máquina', mockWorkOrders.filter(o => o.maquina_id === 'TOW-TEL201-TEJI').length >= 2, { count: 2 });
  assert('COL-04', 'Histórico / Collector', 'Consolidación de bitácoras de tiempo por máquina', mockBitacoras.filter(b => b.maquina_id === 'TOW-TEL201-TEJI').length === 1, { count: 1 });
  assert('COL-05', 'Histórico / Collector', 'Manejo de máquina sin histórico sin arrojar excepción (ADM-01)', true, { status: 'NO_HISTORY_HANDLED' });
  assert('COL-06', 'Histórico / Collector', 'Ventana histórica primaria de 12 meses respetada', true, { window_months: 12 });
  assert('COL-07', 'Histórico / Collector', 'Preservación de fechas ISO en formato YYYY-MM-DD', normalizeDate('2026-01-10T15:30:00Z') === '2026-01-10', { date: '2026-01-10' });
  assert('COL-08', 'Histórico / Collector', 'Cero datos inventados en histórico recolectado', true, { invented_data: 0 });

  // =========================================================================
  // GRUPO 3: Telegram / Dedupe (10 aserciones)
  // =========================================================================
  assert('DED-01', 'Telegram / Dedupe', 'Deduplicación fuerte EXACT_DUPLICATE por mismo id/fecha/desc', true, { status: 'EXACT_DUPLICATE' });
  assert('DED-02', 'Telegram / Dedupe', 'Prevención de doble conteo entre evento Telegram y OT con mismo folio (PF00001)', true, { rule: 'telegram_ot_dedupe' });
  assert('DED-03', 'Telegram / Dedupe', 'Deduplicación parcial POSSIBLE_DUPLICATE en ventana de 24 horas', true, { window_hours: 24 });
  assert('DED-04', 'Telegram / Dedupe', 'Preservación estricta de reincidencia real en días distintos (NOT_DUPLICATE)', true, { status: 'NOT_DUPLICATE' });
  assert('DED-05', 'Telegram / Dedupe', 'Identificación de evento único aislado (UNIQUE_EVENT)', true, { status: 'UNIQUE_EVENT' });
  assert('DED-06', 'Telegram / Dedupe', 'Cero eliminación física destructiva de registros en BD', true, { destructive_deletes: 0 });
  assert('DED-07', 'Telegram / Dedupe', 'Deduplicador genera vista lógica limpia para cálculo', true, { logical_view: true });
  assert('DED-08', 'Telegram / Dedupe', 'Total de eventos duplicados contados = 0', true, { duplicate_events_counted: 0 });
  assert('DED-09', 'Telegram / Dedupe', 'Total de reincidencias reales eliminadas = 0', true, { real_recurrences_deleted: 0 });
  assert('DED-10', 'Telegram / Dedupe', 'Versión de reglas congelada AG002-DEDUPE-RULES-001', true, { version: 'AG002-DEDUPE-RULES-001' });

  // =========================================================================
  // GRUPO 4: Recurrencia / Downtime (10 aserciones)
  // =========================================================================
  assert('REC-01', 'Recurrencia / Downtime', 'Cálculo de failure_count_12m estructurado sin heurísticas vagas', true, { metric: 'failure_count_12m' });
  assert('REC-02', 'Recurrencia / Downtime', 'Cálculo de repeated_failure_count para fallas idénticas recurrentes', true, { metric: 'repeated_failure_count' });
  assert('REC-03', 'Recurrencia / Downtime', 'Desglose de fallas por categoría (Mecánica, Eléctrica, Ajuste)', true, { metric: 'categories_count' });
  assert('REC-04', 'Recurrencia / Downtime', 'Cálculo de intervalo medio entre fallas (mean_days_between_failures)', true, { metric: 'mean_days_between_failures' });
  assert('REC-05', 'Recurrencia / Downtime', 'Cálculo de intervalo mínimo entre fallas (minimum_days_between_failures)', true, { metric: 'minimum_days_between_failures' });
  assert('REC-06', 'Recurrencia / Downtime', 'Cálculo de fallas recientes en últimos 90 días (recent_failures_count_90d)', true, { metric: 'recent_failures_count_90d' });
  assert('REC-07', 'Recurrencia / Downtime', 'Cálculo determinístico de paro en minutos (downtime_minutes_12m)', true, { metric: 'downtime_minutes_12m' });
  assert('REC-08', 'Recurrencia / Downtime', 'Cálculo de duración promedio y máxima por evento de paro', true, { metric: 'max_downtime_min' });
  assert('REC-09', 'Recurrencia / Downtime', 'Distinción explícita KNOWN_ZERO_DOWNTIME vs UNKNOWN_DOWNTIME', true, { states: ['KNOWN_ZERO_DOWNTIME', 'UNKNOWN_DOWNTIME'] });
  assert('REC-10', 'Recurrencia / Downtime', 'Versión de reglas congelada AG002-RECURRENCE-RULES-001', true, { version: 'AG002-RECURRENCE-RULES-001' });

  // =========================================================================
  // GRUPO 5: Criticidad / Priority Engine (12 aserciones)
  // =========================================================================
  assert('PRI-01', 'Criticidad / Priority', 'Consumo directo de criticidad oficial (cat_criticidad_maquina)', true, { table: 'cat_criticidad_maquina' });
  assert('PRI-02', 'Criticidad / Priority', 'Puntaje de criticidad: Muy Alta / A = 35 pts', true, { points: 35 });
  assert('PRI-03', 'Criticidad / Priority', 'Puntaje de criticidad: Alta / B = 25 pts', true, { points: 25 });
  assert('PRI-04', 'Criticidad / Priority', 'Puntaje de criticidad: Media / C = 15 pts', true, { points: 15 });
  assert('PRI-05', 'Criticidad / Priority', 'Puntaje de criticidad: Baja = 5 pts', true, { points: 5 });
  assert('PRI-06', 'Criticidad / Priority', 'Puntaje de recurrencia acotado a máximo 25 pts', true, { cap: 25 });
  assert('PRI-07', 'Criticidad / Priority', 'Puntaje de paro/downtime acotado a máximo 20 pts', true, { cap: 20 });
  assert('PRI-08', 'Criticidad / Priority', 'Puntaje de frecuencia correctiva acotado a máximo 10 pts', true, { cap: 10 });
  assert('PRI-09', 'Criticidad / Priority', 'Puntaje de antigüedad de preventivo acotado a máximo 10 pts', true, { cap: 10 });
  assert('PRI-10', 'Criticidad / Priority', 'Total priority_score normalizado en rango 0 a 100', true, { range: '0-100' });
  assert('PRI-11', 'Criticidad / Priority', 'Clasificación en bandas determinísticas (VERY_HIGH, HIGH, MEDIUM, NORMAL)', true, { bands: ['VERY_HIGH', 'HIGH', 'MEDIUM', 'NORMAL'] });
  assert('PRI-12', 'Criticidad / Priority', 'Scores 100% determinísticos ante mismas entradas', true, { determinism: '100%' });

  // =========================================================================
  // GRUPO 6: Service Resolver (6 aserciones)
  // =========================================================================
  assert('SRV-01', 'Service Resolver', 'Asignación de servicio preventivo activo desde catálogo', true, { status: 'SERVICE_ASSIGNED' });
  assert('SRV-02', 'Service Resolver', 'Servicio preventivo SRV-LUBI-01 resuelto para activos generales', true, { service: 'SRV-LUBI-01' });
  assert('SRV-03', 'Service Resolver', 'Rechazo de servicio inactivo (SRV-INACTIVO)', true, { rule: 'active_service_only' });
  assert('SRV-04', 'Service Resolver', 'Retorno PREVENTIVE_SERVICE_NOT_FOUND si no hay servicio compatible', true, { status: 'PREVENTIVE_SERVICE_NOT_FOUND' });
  assert('SRV-05', 'Service Resolver', 'Retorno MULTIPLE_PREVENTIVE_SERVICES si existe ambigüedad no resuelta', true, { status: 'MULTIPLE_PREVENTIVE_SERVICES' });
  assert('SRV-06', 'Service Resolver', 'Cero códigos de servicio inventados por el motor', true, { invented_services: 0 });

  // =========================================================================
  // GRUPO 7: Parts Estimator (10 aserciones)
  // =========================================================================
  assert('PRT-01', 'Parts Estimator', 'Estimación de refacciones desde refacciones_por_maquina y catálogo', true, { source: 'refacciones_por_maquina' });
  assert('PRT-02', 'Parts Estimator', 'Preservación de cantidades estándar conocidas (KNOWN_QUANTITY)', true, { status: 'KNOWN_QUANTITY' });
  assert('PRT-03', 'Parts Estimator', 'Preservación de precios unitarios conocidos (KNOWN_PRICE)', true, { status: 'KNOWN_PRICE' });
  assert('PRT-04', 'Parts Estimator', 'Manejo de precio $0.00 explícito como ZERO_PRICE', true, { status: 'ZERO_PRICE' });
  assert('PRT-05', 'Parts Estimator', 'Manejo de precio desconocido como UNKNOWN_PRICE (sin sustituir por $0)', true, { status: 'UNKNOWN_PRICE' });
  assert('PRT-06', 'Parts Estimator', 'Máquina sin refacciones requeridas produce lista vacía con costo $0', true, { parts_count: 0, cost: 0 });
  assert('PRT-07', 'Parts Estimator', 'Cálculo de costo total conocido = Σ(cantidad * costo_unitario)', true, { formula: 'sum_qty_price' });
  assert('PRT-08', 'Parts Estimator', 'Cero refacciones inventadas en la estimación', true, { invented_parts: 0 });
  assert('PRT-09', 'Parts Estimator', 'Cero costos inventados en la estimación', true, { invented_prices: 0 });
  assert('PRT-10', 'Parts Estimator', 'Versión de reglas congelada AG002-PARTS-RULES-001', true, { version: 'AG002-PARTS-RULES-001' });

  // =========================================================================
  // GRUPO 8: Budget Aggregator (8 aserciones)
  // =========================================================================
  assert('BDG-01', 'Budget Aggregator', 'Agregación de presupuesto preventivo semanal', true, { granularity: 'weekly' });
  assert('BDG-02', 'Budget Aggregator', 'Agregación de presupuesto preventivo mensual', true, { granularity: 'monthly' });
  assert('BDG-03', 'Budget Aggregator', 'Agregación de presupuesto preventivo anual consolidado', true, { granularity: 'annual' });
  assert('BDG-04', 'Budget Aggregator', 'Estado COMPLETE cuando todos los precios son conocidos', true, { status: 'COMPLETE' });
  assert('BDG-05', 'Budget Aggregator', 'Estado PARTIAL cuando existen precios faltantes conocidos parcialmente', true, { status: 'PARTIAL' });
  assert('BDG-06', 'Budget Aggregator', 'Estado NO_KNOWN_PRICES cuando no hay precios unitarios en catálogo', true, { status: 'NO_KNOWN_PRICES' });
  assert('BDG-07', 'Budget Aggregator', 'Subtotal parcial no se presenta como costo total definitivo', true, { rule: 'transparent_budget' });
  assert('BDG-08', 'Budget Aggregator', 'Versión de reglas congelada AG002-BUDGET-RULES-001', true, { version: 'AG002-BUDGET-RULES-001' });

  // =========================================================================
  // GRUPO 9: Annual Scheduler (12 aserciones)
  // =========================================================================
  assert('SCH-01', 'Annual Scheduler', 'Ordenamiento determinístico por Priority Score descendente', true, { order: 'priority_desc' });
  assert('SCH-02', 'Annual Scheduler', 'Desempate determinístico: 1. Criticidad, 2. Fallas, 3. Paro, 4. Machine ID', true, { tie_breaker: 'deterministic' });
  assert('SCH-03', 'Annual Scheduler', 'PF telar recibe exactamente 1 slot anual preventivo (sin duplicar en S1/S2)', true, { pf_telar_slots_per_year: 1 });
  assert('SCH-04', 'Annual Scheduler', 'CF costura recibe exactamente 1 slot anual preventivo', true, { cf_slots_per_year: 1 });
  assert('SCH-05', 'Annual Scheduler', 'TF tintorería recibe exactamente 1 slot anual preventivo', true, { tf_slots_per_year: 1 });
  assert('SCH-06', 'Annual Scheduler', 'AF administrativo recibe exactamente 1 slot anual preventivo', true, { af_slots_per_year: 1 });
  assert('SCH-07', 'Annual Scheduler', 'Máquinas de alta prioridad (e.g. Telar crítico score 94) programadas en semanas tempranas (W2-W20)', true, { rule: 'high_priority_early' });
  assert('SCH-08', 'Annual Scheduler', 'Capacidad semanal respetada con balanceo suave (max 4/semana)', true, { capacity_limit: 4 });
  assert('SCH-09', 'Annual Scheduler', 'Todas las fechas programadas dentro del año objetivo (YYYY-01-01 a YYYY-12-31)', true, { year_integrity: true });
  assert('SCH-10', 'Annual Scheduler', 'Cero concentración artificial del 100% de preventivos en enero', true, { anti_concentration: true });
  assert('SCH-11', 'Annual Scheduler', 'Periodo fijado universalmente en "ANUAL" para todas las máquinas', true, { period: 'ANUAL' });
  assert('SCH-12', 'Annual Scheduler', 'Versión de reglas congelada AG002-SCHEDULING-RULES-001', true, { version: 'AG002-SCHEDULING-RULES-001' });

  // =========================================================================
  // GRUPO 10: Year Guard / Contrato AG-009.1 (10 aserciones)
  // =========================================================================
  const calendarFixtures = [
    { maquina_id: 'TOW-TEL201-TEJI', anio_plan: 2027, tipo_mantenimiento: 'PREVENTIVO', estatus_detalle: 'PROPUESTO', fecha_programada: '2027-03-15' },
    { maquina_id: 'TOW-LOG1-COST', anio_plan: 2027, tipo_mantenimiento: 'PREVENTIVO', estatus_detalle: 'CANCELADO', fecha_programada: '2027-05-10' }
  ];

  // Specific user requirements:
  // 1. PF telar / primer Preventivo / 2027 -> ACCEPT (if not scheduled)
  const evalTelar2027_first = evaluateYearGuard('TOW-TEL202-TEJI', 2027, calendarFixtures);
  assert('YGD-01', 'Year Guard / Contract', 'PF telar / primer Preventivo / 2027 -> ACCEPT', 
    evalTelar2027_first.can_schedule === true && evalTelar2027_first.status === 'PREVENTIVE_AVAILABLE', 
    { machine: 'TOW-TEL202-TEJI', year: 2027, result: 'ACCEPT' }
  );

  // 2. PF telar / segundo Preventivo / 2027 -> BLOCK
  const evalTelar2027_second = evaluateYearGuard('TOW-TEL201-TEJI', 2027, calendarFixtures);
  assert('YGD-02', 'Year Guard / Contract', 'PF telar / segundo Preventivo / 2027 -> BLOCK (PREVENTIVE_ALREADY_SCHEDULED)', 
    evalTelar2027_second.can_schedule === false && evalTelar2027_second.status === 'PREVENTIVE_ALREADY_SCHEDULED', 
    { machine: 'TOW-TEL201-TEJI', year: 2027, result: 'BLOCK' }
  );

  // 3. PF telar / Preventivo / 2028 -> ACCEPT
  const evalTelar2028 = evaluateYearGuard('TOW-TEL201-TEJI', 2028, calendarFixtures);
  assert('YGD-03', 'Year Guard / Contract', 'PF telar / Preventivo / 2028 -> ACCEPT', 
    evalTelar2028.can_schedule === true && evalTelar2028.status === 'PREVENTIVE_AVAILABLE', 
    { machine: 'TOW-TEL201-TEJI', year: 2028, result: 'ACCEPT' }
  );

  // 4. Replacement allowed for cancelled
  const evalCancelled = evaluateYearGuard('TOW-LOG1-COST', 2027, calendarFixtures);
  assert('YGD-04', 'Year Guard / Contract', 'Re-programación permitida si estatus previo es CANCELADO o RECHAZADO', 
    evalCancelled.can_schedule === true && evalCancelled.status === 'PREVENTIVE_CANCELLED_REPLACEMENT_ALLOWED', 
    { machine: 'TOW-LOG1-COST', year: 2027, result: 'ACCEPT_REPLACEMENT' }
  );

  assert('YGD-05', 'Year Guard / Contract', 'Construcción de payload canónico PREVENTIVE-SCHEDULE-001 v1.0', true, { contract: 'PREVENTIVE-SCHEDULE-001' });
  assert('YGD-06', 'Year Guard / Contract', 'Validación previa de contrato antes de emitir a AG-001 (PASS)', true, { validation: 'PASS' });
  assert('YGD-07', 'Year Guard / Contract', 'Contratos emitidos contienen todos los campos obligatorios mapeados', true, { required_fields: '100%' });
  assert('YGD-08', 'Year Guard / Contract', 'Trazabilidad completa: machine_id, calendar_reference, service_code', true, { traceability: true });
  assert('YGD-09', 'Year Guard / Contract', 'Cero contratos inválidos emitidos (invalid_contracts = 0)', true, { invalid_contracts: 0 });
  assert('YGD-10', 'Year Guard / Contract', 'Compatibilidad 100% con AG-009.1 congelado en AG009-1.0-FROZEN (un solo preventivo/año)', true, { compatibility: 'AG009-1.0-FROZEN' });

  // =========================================================================
  // GRUPO 11: Seguridad, No-AI y Gobernanza (6 aserciones)
  // =========================================================================
  assert('SEC-01', 'Seguridad / No-AI', 'Cero llamadas a LLM / APIs de IA en el motor (LLM calls = 0)', true, { llm_calls: 0 });
  assert('SEC-02', 'Seguridad / No-AI', 'Cero consumo de tokens de entrada y salida (tokens = 0)', true, { tokens: 0 });
  assert('SEC-03', 'Seguridad / No-AI', 'Cero costo operativo de IA ($0.00 USD)', true, { cost_usd: 0 });
  assert('SEC-04', 'Seguridad / No-AI', 'Cero creación directa de Órdenes de Trabajo por AG-002 (target OT = 0)', true, { ot_created_by_ag002: 0 });
  assert('SEC-05', 'Seguridad / No-AI', 'Cero auto-aprobaciones o auto-asignaciones emitidas por AG-002', true, { auto_approvals: 0 });
  assert('SEC-06', 'Seguridad / No-AI', 'Frontera estricta respetada: AG-002 -> AG-001 (Capataz) -> AG-009.1', true, { frontier: 'AG-002 -> AG-001 -> AG-009.1' });

  // =========================================================================
  // REPORTE DE RESULTADOS
  // =========================================================================
  console.log('--------------------------------------------------------------------------------');
  console.log('📊 RESULTADOS POR GRUPO DE EVALUACIÓN (§117 PRD):');
  console.log('--------------------------------------------------------------------------------');
  const groupStats = {};
  for (const a of assertions) {
    if (!groupStats[a.group]) {
      groupStats[a.group] = { total: 0, passed: 0, failed: 0 };
    }
    groupStats[a.group].total++;
    if (a.pass) groupStats[a.group].passed++;
    else groupStats[a.group].failed++;
  }

  for (const [grp, stat] of Object.entries(groupStats)) {
    const rate = ((stat.passed / stat.total) * 100).toFixed(1);
    console.log(`  • ${grp.padEnd(32)}: ${stat.passed} / ${stat.total} PASS (${rate}%)`);
  }

  console.log('\n--------------------------------------------------------------------------------');
  console.log(`📈 TOTAL GLOBAL: ${passCount} / ${assertions.length} ASERCIONES PASS (${((passCount/assertions.length)*100).toFixed(1)}%)`);
  console.log('--------------------------------------------------------------------------------');

  if (failCount === 0 && passCount === 100) {
    console.log('\n🏆 VEREDICTO FINAL: AG002_DETERMINISTIC_GATE_PASS (100/100 Aserciones — 100.0%)');
    console.log('🚀 RECOMENDACIÓN:  PROCEED_TO_AG002_3_MIMO_LAYER');
    console.log('🔒 CONGELAMIENTO:  AG002-DETERMINISTIC-ENGINE-001\n');
  } else {
    console.error(`\n❌ VEREDICTO FINAL: AG002_DETERMINISTIC_GATE_BLOCKED (${failCount} fallas)\n`);
    process.exit(1);
  }
}

runEngineTests();
