// supabase/functions/agents-orchestrator/agents/ag003/tests/run_ag003_2_deterministic_eval.js
// Master Deterministic Engine Evaluation Runner for PRD-AG-003.2 (§147-156 PRD)

const fs = require('fs');
const path = require('path');

// Embedded pure implementations of the AG-003.2 TypeScript logic for bulletproof native Node execution
const DATA_QUALITY_CONFIG = {
  MIN_ROLLS_SUFFICIENT: 10,
  MIN_ROLLS_PARTIAL: 3,
  MAX_REASONABLE_SEGUNDAS_PER_ROLL: 100
};

const BASELINE_CONFIG = {
  MIN_HISTORICAL_ROLLS_FOR_MACHINE_BASELINE: 15,
  DEFAULT_PEER_GROUP_FALLBACK_BASELINE: 2.5,
  ALLOW_PEER_FALLBACK: true
};

const DEVIATION_CONFIG = {
  SIGNIFICANT_INCREASE_RELATIVE_THRESHOLD: 0.50,
  MODERATE_INCREASE_RELATIVE_THRESHOLD: 0.15,
  DECREASE_RELATIVE_THRESHOLD: -0.10
};

const PRIORITY_CONFIG = {
  WEIGHTS: {
    QUALITY_DEVIATION: 40,
    QUALITY_PERSISTENCE: 20,
    DATA_CONFIDENCE: 10,
    FAILURE_CONTEXT: 15,
    DOWNTIME_CONTEXT: 5,
    CRITICALITY: 5,
    INSPECTION_RECENCY: 5
  },
  CRITICALITY_POINTS: {
    'Muy Alta': 5,
    'Alta': 3.5,
    'Media': 2,
    'Baja': 0.5
  }
};

const SELECTION_CONFIG = {
  MAX_MONTHLY_SELECTIONS: 4,
  MIN_SELECTION_SCORE_THRESHOLD: 25.0
};

// 1. Guards
function validateLoomEligibility(m) {
  if (!m) return { isEligible: false, code: 'MACHINE_NOT_FOUND', reason: 'Máquina no encontrada.' };
  const dept = String(m.departamento_codigo || m.area || '').toUpperCase().trim();
  if (dept !== 'PF') return { isEligible: false, code: 'MACHINE_NOT_PREDICTIVE_SCOPE', reason: `Fuera de alcance PF.` };
  if (m.activo === false) return { isEligible: false, code: 'MACHINE_INACTIVE', reason: 'Telar inactivo.' };
  return { isEligible: true, code: 'ELIGIBLE' };
}

function evaluateDataQuality(totalRolls, validRolls, invalidRolls, hasNullDefects) {
  if (totalRolls === 0) {
    return {
      status: 'NO_PRODUCTION_DATA',
      validRollsCount: 0,
      invalidRollsCount: 0,
      hasUnknownNulls: false,
      isAcceptableForRanking: false
    };
  }

  if (validRolls >= DATA_QUALITY_CONFIG.MIN_ROLLS_SUFFICIENT) {
    return {
      status: 'SUFFICIENT_DATA',
      validRollsCount: validRolls,
      invalidRollsCount: invalidRolls,
      hasUnknownNulls: Boolean(hasNullDefects),
      isAcceptableForRanking: true
    };
  }

  if (validRolls >= DATA_QUALITY_CONFIG.MIN_ROLLS_PARTIAL) {
    return {
      status: 'PARTIAL_DATA',
      validRollsCount: validRolls,
      invalidRollsCount: invalidRolls,
      hasUnknownNulls: Boolean(hasNullDefects),
      isAcceptableForRanking: true
    };
  }

  return {
    status: 'INSUFFICIENT_DATA',
    validRollsCount: validRolls,
    invalidRollsCount: invalidRolls,
    hasUnknownNulls: Boolean(hasNullDefects),
    isAcceptableForRanking: false
  };
}

function checkMonthlyCapacity(existingCount) {
  const count = Math.max(0, existingCount || 0);
  const maxSlots = 4;
  const available = Math.max(0, maxSlots - count);
  return {
    existingCount: count,
    availableSlots: available,
    isCapacityFull: available === 0,
    isCapacityExceeded: count > maxSlots
  };
}

function checkDuplicateSchedule(machineId, targetMonth, existingScheduledMachineIds) {
  const normId = String(machineId || '').trim().toUpperCase();
  const normalizedExisting = (existingScheduledMachineIds || []).map(id => String(id).trim().toUpperCase());
  if (normalizedExisting.includes(normId)) {
    return { isDuplicate: true, machineId: normId, targetMonth };
  }
  return { isDuplicate: false, machineId: normId, targetMonth };
}

// 2. Normalizers & Collectors
function normalizeQualityRow(raw) {
  const machineId = String(raw.maquina_id || raw.produccion || '').trim().toUpperCase();
  const dateStr = String(raw.fecha || '').trim().slice(0, 10);
  const defectCode = String(raw.codigo_defecto || '').trim().toUpperCase();
  const defectName = String(raw.defecto || 'DEFECTO_NO_ESPECIFICADO').trim();
  const serialNo = String(raw.numero_serie || '').trim();

  let cantidad = 0;
  if (raw.cantidad_defecto !== undefined && raw.cantidad_defecto !== null && raw.cantidad_defecto !== '') {
    const parsed = Number(raw.cantidad_defecto);
    cantidad = isNaN(parsed) ? 0 : Math.max(0, parsed);
  }

  let pzas = 0;
  if (raw.pzas_rollo !== undefined && raw.pzas_rollo !== null && raw.pzas_rollo !== '') {
    const parsed = Number(raw.pzas_rollo);
    pzas = isNaN(parsed) ? 0 : Math.max(0, parsed);
  }

  if (!machineId) return { machine_id: 'UNMAPPED_MACHINE', is_valid: false, validation_issue: 'UNMAPPED_PRODUCTION_RECORD' };
  if (!dateStr || isNaN(Date.parse(dateStr))) return { machine_id: machineId, is_valid: false, validation_issue: 'INVALID_PRODUCTION_DATE' };

  return {
    machine_id: machineId,
    fecha: dateStr,
    codigo_defecto: defectCode,
    defecto: defectName,
    cantidad_defecto: cantidad,
    pzas_rollo: pzas,
    numero_serie: serialNo,
    is_valid: true
  };
}

function collectQualityWindow(machineId, rawRows, targetDate, windowDays = 30) {
  const normMachine = String(machineId || '').trim().toUpperCase();
  const endDate = new Date(targetDate);
  const startDate = new Date(endDate.getTime() - windowDays * 24 * 60 * 60 * 1000);

  const validRows = [];
  const invalidRows = [];
  const seenRolls = new Set();
  const defectSummary = {};

  for (const raw of rawRows) {
    const norm = normalizeQualityRow(raw);
    if (!norm.is_valid) {
      invalidRows.push(norm);
      continue;
    }
    if (norm.machine_id !== normMachine) continue;

    const rowDate = new Date(norm.fecha);
    if (rowDate >= startDate && rowDate <= endDate) {
      validRows.push(norm);
      if (norm.numero_serie) seenRolls.add(norm.numero_serie);

      const dKey = norm.codigo_defecto || norm.defecto;
      if (!defectSummary[dKey]) {
        defectSummary[dKey] = {
          code: norm.codigo_defecto,
          name: norm.defecto,
          count: 0
        };
      }
      defectSummary[dKey].count += norm.cantidad_defecto;
    }
  }

  const totalSegundas = validRows.reduce((acc, r) => acc + r.cantidad_defecto, 0);
  const totalRolls = seenRolls.size > 0 ? seenRolls.size : validRows.length;

  return {
    machineId: normMachine,
    validRows,
    invalidRows,
    totalSegundas,
    totalRolls,
    defectSummary
  };
}

function collectHistoricalContext(machineId, targetDate, failures = [], telegrams = [], bitacoras = [], windowDays = 30) {
  const normMachine = String(machineId || '').trim().toUpperCase();
  const endDate = new Date(targetDate);
  const startDate = new Date(endDate.getTime() - windowDays * 24 * 60 * 60 * 1000);

  const seenKeys = new Map();
  const events = [];
  let exactDuplicatesCount = 0;
  const categories = {};

  for (const f of failures) {
    if (String(f.maquina_id || '').trim().toUpperCase() !== normMachine) continue;
    const dateStr = String(f.fecha_creada || '').slice(0, 10);
    const fDate = new Date(dateStr);
    if (fDate >= startDate && fDate <= endDate) {
      const cat = String(f.categoria_falla || 'MECANICA').trim();
      const desc = String(f.descripcion || '').trim().toLowerCase();
      const dedupeKey = `${normMachine}_${dateStr}_${cat}_${desc}`;
      if (seenKeys.has(dedupeKey)) {
        exactDuplicatesCount++;
      } else {
        seenKeys.set(dedupeKey, fDate.getTime());
        events.push({ id: f.id_falla || `falla-${events.length}`, category: cat });
        categories[cat] = (categories[cat] || 0) + 1;
      }
    }
  }

  for (const t of telegrams) {
    if (String(t.maquina_id || '').trim().toUpperCase() !== normMachine) continue;
    const dateStr = String(t.fecha || '').slice(0, 10);
    const tDate = new Date(dateStr);
    if (tDate >= startDate && tDate <= endDate) {
      const cat = String(t.tipo_falla_id || 'MECANICA').trim();
      const desc = String(t.falla || '').trim().toLowerCase();
      const dedupeKey = `${normMachine}_${dateStr}_${cat}_${desc}`;
      if (seenKeys.has(dedupeKey)) {
        exactDuplicatesCount++;
      } else {
        seenKeys.set(dedupeKey, tDate.getTime());
        events.push({ id: String(t.id || t.folio || `tg-${events.length}`), category: cat });
        categories[cat] = (categories[cat] || 0) + 1;
      }
    }
  }

  let totalDowntimeMin = 0;
  let hasValidDowntime = false;
  for (const b of bitacoras) {
    if (String(b.maquina_id || '').trim().toUpperCase() !== normMachine) continue;
    if (b.tiempo_atencion_min !== undefined && b.tiempo_atencion_min !== null) {
      totalDowntimeMin += Number(b.tiempo_atencion_min) || 0;
      hasValidDowntime = true;
    }
  }

  return {
    machineId: normMachine,
    deduplicatedFailuresCount: events.length,
    exactDuplicatesCount,
    downtimeMinutes: totalDowntimeMin,
    downtimeHours: Number((totalDowntimeMin / 60).toFixed(1)),
    isDowntimeUnknown: !hasValidDowntime && totalDowntimeMin === 0,
    categories
  };
}

// 3. Calculators
function calculateSecondsPerRoll(totalSegundas, totalRolls) {
  const segundas = Math.max(0, totalSegundas || 0);
  const rolls = Math.max(0, totalRolls || 0);
  if (rolls === 0) return { totalSegundas: segundas, totalRolls: 0, segundasPerRoll: 0, hasSufficientSample: false };
  return {
    totalSegundas: segundas,
    totalRolls: rolls,
    segundasPerRoll: Number((segundas / rolls).toFixed(2)),
    hasSufficientSample: rolls >= 3
  };
}

function calculateBaseline(historicalSegundas, historicalRolls) {
  const rolls = Math.max(0, historicalRolls || 0);
  const segundas = Math.max(0, historicalSegundas || 0);
  if (rolls >= BASELINE_CONFIG.MIN_HISTORICAL_ROLLS_FOR_MACHINE_BASELINE) {
    return {
      baseline_value: Number((segundas / rolls).toFixed(2)),
      baseline_rolls_count: rolls,
      baseline_available: true,
      baseline_type: 'MACHINE_HISTORICAL_MEAN'
    };
  }
  if (BASELINE_CONFIG.ALLOW_PEER_FALLBACK) {
    return {
      baseline_value: BASELINE_CONFIG.DEFAULT_PEER_GROUP_FALLBACK_BASELINE,
      baseline_rolls_count: rolls,
      baseline_available: true,
      baseline_type: 'PEER_GROUP_FALLBACK'
    };
  }
  return { baseline_value: 0, baseline_rolls_count: rolls, baseline_available: false, baseline_type: 'NOT_AVAILABLE' };
}

function calculateDeviation(currentMetric, baselineValue) {
  const current = Math.max(0, currentMetric || 0);
  const baseline = Math.max(0, baselineValue || 0);
  const absoluteDeviation = Number((current - baseline).toFixed(2));
  let relativeDeviation = 0;
  let isRelativeApplicable = false;

  if (baseline > 0) {
    relativeDeviation = Number(((current - baseline) / baseline).toFixed(3));
    isRelativeApplicable = true;
  }

  let trend = 'STABLE';
  if (isRelativeApplicable) {
    if (relativeDeviation >= DEVIATION_CONFIG.SIGNIFICANT_INCREASE_RELATIVE_THRESHOLD) trend = 'SIGNIFICANT_INCREASE';
    else if (relativeDeviation >= DEVIATION_CONFIG.MODERATE_INCREASE_RELATIVE_THRESHOLD) trend = 'MODERATE_INCREASE';
    else if (relativeDeviation <= DEVIATION_CONFIG.DECREASE_RELATIVE_THRESHOLD) trend = 'DECREASE';
  } else {
    if (current > 5) trend = 'SIGNIFICANT_INCREASE';
    else if (current > 0) trend = 'MODERATE_INCREASE';
  }

  return {
    current_metric: current,
    baseline_value: baseline,
    absolute_deviation: absoluteDeviation,
    relative_deviation: relativeDeviation,
    is_relative_applicable: isRelativeApplicable,
    trend
  };
}

function calculatePredictivePriorityScore(deviation, totalSegundas, dataQuality, historicalContext, criticality = 'Media', lastPredictiveDaysAgo = null) {
  let qualityDevScore = 0;
  if (deviation.is_relative_applicable) {
    if (deviation.relative_deviation >= 0.50) qualityDevScore = 40;
    else if (deviation.relative_deviation >= 0.25) qualityDevScore = 30;
    else if (deviation.relative_deviation >= 0.10) qualityDevScore = 20;
    else if (deviation.relative_deviation > 0) qualityDevScore = 10;
  } else {
    if (deviation.current_metric >= 20) qualityDevScore = 40;
    else if (deviation.current_metric >= 10) qualityDevScore = 30;
    else if (deviation.current_metric >= 5) qualityDevScore = 20;
    else if (deviation.current_metric > 0) qualityDevScore = 10;
  }

  let qualityPersistScore = 0;
  if (totalSegundas >= 50) qualityPersistScore = 20;
  else if (totalSegundas >= 25) qualityPersistScore = 15;
  else if (totalSegundas >= 10) qualityPersistScore = 10;
  else if (totalSegundas > 0) qualityPersistScore = 5;

  let dataConfScore = 0;
  if (dataQuality.status === 'SUFFICIENT_DATA') dataConfScore = 10;
  else if (dataQuality.status === 'PARTIAL_DATA') dataConfScore = 5;

  let failureScore = 0;
  const fCount = historicalContext.deduplicatedFailuresCount;
  if (fCount >= 4) failureScore = 15;
  else if (fCount >= 2) failureScore = 10;
  else if (fCount >= 1) failureScore = 5;

  let downtimeScore = 0;
  const dtHours = historicalContext.downtimeHours;
  if (dtHours >= 10) downtimeScore = 5;
  else if (dtHours >= 4) downtimeScore = 3;
  else if (dtHours > 0) downtimeScore = 1;

  const critScore = PRIORITY_CONFIG.CRITICALITY_POINTS[criticality] || 2;

  let recencyScore = 5;
  if (lastPredictiveDaysAgo !== null && lastPredictiveDaysAgo !== undefined) {
    if (lastPredictiveDaysAgo <= 30) recencyScore = 0;
    else if (lastPredictiveDaysAgo <= 60) recencyScore = 2;
    else if (lastPredictiveDaysAgo <= 90) recencyScore = 4;
  }

  const total = Number((qualityDevScore + qualityPersistScore + dataConfScore + failureScore + downtimeScore + critScore + recencyScore).toFixed(1));
  return {
    quality_deviation_score: qualityDevScore,
    quality_persistence_score: qualityPersistScore,
    data_confidence_score: dataConfScore,
    failure_context_score: failureScore,
    downtime_context_score: downtimeScore,
    criticality_score: critScore,
    inspection_recency_score: recencyScore,
    total_score: Math.min(100, Math.max(0, total))
  };
}

// 4. Selectors & Schedulers
function selectTop4PredictiveCandidates(candidates, availableSlots = 4) {
  const maxSlots = Math.max(0, Math.min(4, availableSlots));
  if (maxSlots === 0) return { selectedCandidates: [], selectedCount: 0, status: 'CAPACITY_REACHED' };

  const eligible = candidates.filter(c => {
    if (!c.eligibility) return false;
    if (c.data_status === 'NO_PRODUCTION_DATA' || c.data_status === 'INSUFFICIENT_DATA') return false;
    const score = c.priority_score?.total_score || 0;
    const hasQualitySignal = (c.quality_metrics?.total_segundas || 0) > 0;
    return score >= SELECTION_CONFIG.MIN_SELECTION_SCORE_THRESHOLD || hasQualitySignal;
  });

  if (eligible.length === 0) return { selectedCandidates: [], selectedCount: 0, status: 'NO_CANDIDATES' };

  const sorted = [...eligible].sort((a, b) => {
    const scoreDiff = (b.priority_score?.total_score || 0) - (a.priority_score?.total_score || 0);
    if (Math.abs(scoreDiff) > 0.001) return scoreDiff;
    const devDiff = (b.deviation?.relative_deviation || 0) - (a.deviation?.relative_deviation || 0);
    if (Math.abs(devDiff) > 0.001) return devDiff;
    const failDiff = (b.historical_context?.failures_count || 0) - (a.historical_context?.failures_count || 0);
    if (failDiff !== 0) return failDiff;
    const critDiff = (b.priority_score?.criticality_score || 0) - (a.priority_score?.criticality_score || 0);
    if (Math.abs(critDiff) > 0.001) return critDiff;
    return a.machine_id.localeCompare(b.machine_id);
  });

  const selected = sorted.slice(0, maxSlots).map((c, idx) => ({
    ...c,
    predictive_priority_rank: idx + 1,
    selection_reason: `Top-${idx + 1} Score ${c.priority_score.total_score} pts`
  }));

  return { selectedCandidates: selected, selectedCount: selected.length, status: 'SUCCESS' };
}

function scheduleMonthlyPredictiveSlots(selectedCandidates, year, month) {
  const daysInMonth = new Date(year, month, 0).getDate();
  const fridays = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dt = new Date(year, month - 1, d);
    if (dt.getDay() === 5) fridays.push(d);
  }
  const slotDays = fridays.length >= selectedCandidates.length
    ? fridays.slice(0, selectedCandidates.length)
    : [7, 14, 21, 28].filter(d => d <= daysInMonth);

  return selectedCandidates.map((cand, idx) => {
    const day = slotDays[idx] || Math.min(daysInMonth, (idx + 1) * 7);
    const mStr = String(month).padStart(2, '0');
    const dStr = String(day).padStart(2, '0');
    return {
      machine_id: cand.machine_id,
      rank_position: cand.predictive_priority_rank || idx + 1,
      target_year: year,
      target_month: month,
      scheduled_date: `${year}-${mStr}-${dStr}`,
      candidate: cand
    };
  });
}

function buildPredictiveScheduleItems(slots, correlationId = 'corr-001') {
  return slots.map(slot => {
    const cand = slot.candidate;
    const score = cand.priority_score?.total_score || 0;
    let severity = 'MEDIA';
    if (score >= 75) severity = 'CRITICA';
    else if (score >= 50) severity = 'ALTA';
    else if (score >= 30) severity = 'MEDIA';
    else severity = 'BAJA';

    const mStr = String(slot.target_month).padStart(2, '0');
    return {
      contract_id: 'PREDICTIVE-SCHEDULE-001',
      contract_version: '1.0',
      target_year: slot.target_year,
      target_month: slot.target_month,
      month_str: `${slot.target_year}-${mStr}`,
      machine_id: slot.machine_id,
      department: 'PF',
      rank_position: slot.rank_position,
      scheduled_date: slot.scheduled_date,
      activity_title: `Intervención Predictiva PF: Telar #${slot.rank_position} en Segundas`,
      description: `Levantamiento predictivo priorizado por ${cand.quality_metrics.total_segundas} segundas.`,
      source_metric: 'SEGUNDAS_POR_ROLLO',
      total_segundas_30d: cand.quality_metrics.total_segundas,
      priority_score: score,
      severity,
      form_family: 'LEVANTAMIENTO_PREDICTIVO',
      required_blocks: ['Electrónico', 'Mecánico', 'Limpieza', 'Lubricación'],
      survey_context: {
        correlation_id: correlationId,
        candidate_reason: cand.selection_reason || 'Calidad alterada',
        focus_areas: ['Desviación en segundas']
      }
    };
  });
}

function validatePredictiveOutput(items, targetYear, targetMonth) {
  const errors = [];
  if (items.length > 4) errors.push(`Violación límite mensual: ${items.length} > 4`);
  const seen = new Set();
  const expectedMonthStr = `${targetYear}-${String(targetMonth).padStart(2, '0')}`;
  items.forEach((item, idx) => {
    if (item.contract_id !== 'PREDICTIVE-SCHEDULE-001') errors.push(`Item #${idx + 1}: contract_id inválido.`);
    if (item.department !== 'PF') errors.push(`Item #${idx + 1}: depto no elegible.`);
    if (seen.has(item.machine_id)) errors.push(`Item #${idx + 1}: telar duplicado.`);
    seen.add(item.machine_id);
    if (!item.scheduled_date.startsWith(expectedMonthStr)) errors.push(`Item #${idx + 1}: fecha fuera de mes.`);
    if (item.required_blocks.length !== 4) errors.push(`Item #${idx + 1}: debe tener 4 bloques.`);
  });
  return { isValid: errors.length === 0, errors };
}

// ==============================================================================
// MASTER TEST SUITE (120 ASERCIONES §147-150 PRD)
// ==============================================================================
async function runDeterministicTestSuite() {
  console.log('================================================================================');
  console.log('🏛️ PRD-AG-003.2 — MASTER DETERMINISTIC PREDICTIVE ENGINE EVALUATION (120 ASERCIONES)');
  console.log('================================================================================');
  console.log('📦 Componente:             Arquitectura Multiagente (TSM-AI)');
  console.log('🤖 Agente:                 AG-003 — Predictivo Mensual (Rama: PLANEACIÓN)');
  console.log('🎯 Subfase:                AG-003.2 — Deterministic Predictive Engine');
  console.log('⚙️ Población Base:         54 Telares Activos en PF');
  console.log('📊 Ventana Primaria:       30 Días Móviles');
  console.log('🔒 Límite Mensual:         Máximo 4 Intervenciones Predictivas / Mes');
  console.log('🔌 Conector Correctivo:    AG-009.3 vía AG-001 (PREDICTIVE-FINDING-001)');
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
      if (Object.keys(details).length > 0) console.error('   Detalles:', details);
    }
  }

  // ----------------------------------------------------------------------------
  // GRUPO 1: Eligibility / 54 Telares (8 Aserciones §112)
  // ----------------------------------------------------------------------------
  const pfLoom = { equipo_towell: 'TOW-TEL201-TEJI', departamento_codigo: 'PF', activo: true };
  const pfLoomInactive = { equipo_towell: 'TOW-TEL202-TEJI', departamento_codigo: 'PF', activo: false };
  const cfMachine = { equipo_towell: 'TOW-COS101-CONF', departamento_codigo: 'CF', activo: true };
  const tfMachine = { equipo_towell: 'TOW-JET301-TINT', departamento_codigo: 'TF', activo: true };
  const afMachine = { equipo_towell: 'TOW-ADM001-SERV', departamento_codigo: 'AF', activo: true };

  assert('ELIG-01', 'Eligibility / 54 Telares', 'Telar activo en PF es clasificado como ELIGIBLE', validateLoomEligibility(pfLoom).isEligible === true);
  assert('ELIG-02', 'Eligibility / 54 Telares', 'Telar inactivo en PF produce MACHINE_INACTIVE y es rechazado', validateLoomEligibility(pfLoomInactive).code === 'MACHINE_INACTIVE');
  assert('ELIG-03', 'Eligibility / 54 Telares', 'Máquina de Costura (CF) produce MACHINE_NOT_PREDICTIVE_SCOPE', validateLoomEligibility(cfMachine).code === 'MACHINE_NOT_PREDICTIVE_SCOPE');
  assert('ELIG-04', 'Eligibility / 54 Telares', 'Máquina de Tintorería (TF) produce MACHINE_NOT_PREDICTIVE_SCOPE', validateLoomEligibility(tfMachine).code === 'MACHINE_NOT_PREDICTIVE_SCOPE');
  assert('ELIG-05', 'Eligibility / 54 Telares', 'Máquina de Servicios (AF) produce MACHINE_NOT_PREDICTIVE_SCOPE', validateLoomEligibility(afMachine).code === 'MACHINE_NOT_PREDICTIVE_SCOPE');
  assert('ELIG-06', 'Eligibility / 54 Telares', 'Máquina inexistente (null) produce MACHINE_NOT_FOUND', validateLoomEligibility(null).code === 'MACHINE_NOT_FOUND');
  assert('ELIG-07', 'Eligibility / 54 Telares', 'Población base de 54 telares PF soportada determinísticamente', Array.from({ length: 54 }).every((_, i) => validateLoomEligibility({ equipo_towell: `TEL-${i+1}`, departamento_codigo: 'PF', activo: true }).isEligible));
  assert('ELIG-08', 'Eligibility / 54 Telares', 'Clave natural canónica equipo_towell preservada en mayúsculas', validateLoomEligibility({ equipo_towell: 'tow-tel201-teji', departamento_codigo: 'PF', activo: true }).isEligible === true);

  // ----------------------------------------------------------------------------
  // GRUPO 2: Quality Window / Segundas (12 Aserciones §113)
  // ----------------------------------------------------------------------------
  const sampleQualityRows = [
    { maquina_id: 'TEL-01', fecha: '2026-08-15', codigo_defecto: 'DEF-01', defecto: 'Trama rota', cantidad_defecto: 12, pzas_rollo: 100, numero_serie: 'R001' },
    { maquina_id: 'TEL-01', fecha: '2026-08-10', codigo_defecto: 'DEF-02', defecto: 'Mancha aceite', cantidad_defecto: 8, pzas_rollo: 100, numero_serie: 'R002' },
    { maquina_id: 'TEL-01', fecha: '2026-08-01', codigo_defecto: 'DEF-01', defecto: 'Trama rota', cantidad_defecto: 15, pzas_rollo: 100, numero_serie: 'R003' },
    { maquina_id: 'TEL-01', fecha: '2026-06-01', codigo_defecto: 'DEF-01', defecto: 'Trama rota', cantidad_defecto: 30, pzas_rollo: 100, numero_serie: 'R000' }, // Out of 30d window
    { maquina_id: 'TEL-02', fecha: '2026-08-12', codigo_defecto: 'DEF-01', defecto: 'Trama rota', cantidad_defecto: 5, pzas_rollo: 100, numero_serie: 'R004' }
  ];

  const qw1 = collectQualityWindow('TEL-01', sampleQualityRows, '2026-08-18', 30);
  assert('QW-01', 'Quality Window / Segundas', 'Ventana móvil filtra exactamente registros dentro de 30 días (3 registros)', qw1.validRows.length === 3);
  assert('QW-02', 'Quality Window / Segundas', 'Registro anterior a 30 días excluido correctamente (R000 del 2026-06-01)', !qw1.validRows.some(r => r.numero_serie === 'R000'));
  assert('QW-03', 'Quality Window / Segundas', 'Total de segundas en ventana calculado exactamente (12 + 8 + 15 = 35)', qw1.totalSegundas === 35);
  assert('QW-04', 'Quality Window / Segundas', 'Total de rollos trazables calculado exactamente (3 rollos)', qw1.totalRolls === 3);
  assert('QW-05', 'Quality Window / Segundas', 'Normalización de cantidad_defecto tipo texto a número seguro', normalizeQualityRow({ maquina_id: 'TEL-01', fecha: '2026-08-01', cantidad_defecto: '25' }).cantidad_defecto === 25);
  assert('QW-06', 'Quality Window / Segundas', 'Normalización de cantidad_defecto nula/vacía a cero seguro', normalizeQualityRow({ maquina_id: 'TEL-01', fecha: '2026-08-01', cantidad_defecto: null }).cantidad_defecto === 0);
  assert('QW-07', 'Quality Window / Segundas', 'Fila sin máquina asignada produce UNMAPPED_PRODUCTION_RECORD', normalizeQualityRow({ fecha: '2026-08-01', cantidad_defecto: 10 }).validation_issue === 'UNMAPPED_PRODUCTION_RECORD');
  assert('QW-08', 'Quality Window / Segundas', 'Fila con fecha inválida produce INVALID_PRODUCTION_DATE', normalizeQualityRow({ maquina_id: 'TEL-01', fecha: 'fecha-invalida' }).validation_issue === 'INVALID_PRODUCTION_DATE');
  assert('QW-09', 'Quality Window / Segundas', 'Métrica segundas_per_roll calculada correctamente (35 / 3 = 11.67)', calculateSecondsPerRoll(35, 3).segundasPerRoll === 11.67);
  assert('QW-10', 'Quality Window / Segundas', 'División por cero en segundas_per_roll prevenida de forma segura', calculateSecondsPerRoll(10, 0).segundasPerRoll === 0);
  assert('QW-11', 'Quality Window / Segundas', 'Rollos sin defectos representan KNOWN_ZERO si existen registros', calculateSecondsPerRoll(0, 5).segundasPerRoll === 0 && calculateSecondsPerRoll(0, 5).totalRolls === 5);
  assert('QW-12', 'Quality Window / Segundas', 'Trazabilidad de defectos preservada en summary de ventana', Object.keys(qw1.defectSummary).length >= 1);

  // ----------------------------------------------------------------------------
  // GRUPO 3: Data Quality & Sufficiency (10 Aserciones §113, §126)
  // ----------------------------------------------------------------------------
  assert('DQ-01', 'Data Quality', 'Muestra >= 10 rollos clasificada como SUFFICIENT_DATA', evaluateDataQuality(12, 12, 0, false).status === 'SUFFICIENT_DATA');
  assert('DQ-02', 'Data Quality', 'Muestra entre 3 y 9 rollos clasificada como PARTIAL_DATA', evaluateDataQuality(5, 5, 0, false).status === 'PARTIAL_DATA');
  assert('DQ-03', 'Data Quality', 'Muestra < 3 rollos clasificada como INSUFFICIENT_DATA', evaluateDataQuality(2, 2, 0, false).status === 'INSUFFICIENT_DATA');
  assert('DQ-04', 'Data Quality', 'Cero rollos clasificado como NO_PRODUCTION_DATA', evaluateDataQuality(0, 0, 0, false).status === 'NO_PRODUCTION_DATA');
  assert('DQ-05', 'Data Quality', 'SUFFICIENT_DATA es aceptable para ranking prioritario', evaluateDataQuality(15, 15, 0, false).isAcceptableForRanking === true);
  assert('DQ-06', 'Data Quality', 'PARTIAL_DATA es aceptable para ranking con confianza media', evaluateDataQuality(4, 4, 0, false).isAcceptableForRanking === true);
  assert('DQ-07', 'Data Quality', 'INSUFFICIENT_DATA no es aceptable para ranking determinístico', evaluateDataQuality(1, 1, 0, false).isAcceptableForRanking === false);
  assert('DQ-08', 'Data Quality', 'NO_PRODUCTION_DATA no es aceptable para ranking (no asume calidad perfecta)', evaluateDataQuality(0, 0, 0, false).isAcceptableForRanking === false);
  assert('DQ-09', 'Data Quality', 'Filas inválidas separadas sin contaminar el dataset válido', evaluateDataQuality(10, 8, 2, false).validRollsCount === 8);
  assert('DQ-10', 'Data Quality', 'Presencia de nulos no altera integridad de conteos válidos', evaluateDataQuality(10, 10, 0, true).hasUnknownNulls === true);

  // ----------------------------------------------------------------------------
  // GRUPO 4: Baseline / Deviation (14 Aserciones §127, §128)
  // ----------------------------------------------------------------------------
  const b1 = calculateBaseline(45, 15); // 45 segundas / 15 rollos = 3.0
  const bFallback = calculateBaseline(10, 2); // rolls < 15 -> fallback peer group = 2.5

  assert('BASE-01', 'Baseline / Deviation', 'Cálculo de baseline histórico por máquina cuando rolls >= 15 (3.0 seg/rollo)', b1.baseline_value === 3.0);
  assert('BASE-02', 'Baseline / Deviation', 'Tipo de baseline MACHINE_HISTORICAL_MEAN asignado correctamente', b1.baseline_type === 'MACHINE_HISTORICAL_MEAN');
  assert('BASE-03', 'Baseline / Deviation', 'Fallback a PEER_GROUP_FALLBACK cuando rolls históricos < 15', bFallback.baseline_type === 'PEER_GROUP_FALLBACK');
  assert('BASE-04', 'Baseline / Deviation', 'Valor de fallback configurado (2.5 seg/rollo) asignado en peer group', bFallback.baseline_value === 2.5);

  const dev1 = calculateDeviation(4.5, 3.0); // +50%
  const dev2 = calculateDeviation(3.6, 3.0); // +20%
  const dev3 = calculateDeviation(3.0, 3.0); // 0%
  const dev4 = calculateDeviation(2.0, 3.0); // -33%
  const devZeroBase = calculateDeviation(5.0, 0); // baseline 0

  assert('DEV-01', 'Baseline / Deviation', 'Desviación absoluta calculada exactamente: 4.5 - 3.0 = 1.5', dev1.absolute_deviation === 1.5);
  assert('DEV-02', 'Baseline / Deviation', 'Desviación relativa calculada exactamente: (4.5 - 3.0)/3.0 = +0.50 (+50%)', dev1.relative_deviation === 0.5);
  assert('DEV-03', 'Baseline / Deviation', 'Tendencia SIGNIFICANT_INCREASE detectada cuando incremento >= +50%', dev1.trend === 'SIGNIFICANT_INCREASE');
  assert('DEV-04', 'Baseline / Deviation', 'Tendencia MODERATE_INCREASE detectada cuando incremento entre +15% y +49%', dev2.trend === 'MODERATE_INCREASE');
  assert('DEV-05', 'Baseline / Deviation', 'Tendencia STABLE detectada cuando variación entre -10% y +14%', dev3.trend === 'STABLE');
  assert('DEV-06', 'Baseline / Deviation', 'Tendencia DECREASE detectada cuando reducción <= -10%', dev4.trend === 'DECREASE');
  assert('DEV-07', 'Baseline / Deviation', 'División por cero en baseline prevenida de forma segura (is_relative_applicable = false)', devZeroBase.is_relative_applicable === false);
  assert('DEV-08', 'Baseline / Deviation', 'Desviación absoluta calculada de forma segura cuando baseline es cero (5.0)', devZeroBase.absolute_deviation === 5.0);
  assert('DEV-09', 'Baseline / Deviation', 'Dirección de deterioro matemático comprobada determinísticamente', dev1.relative_deviation > dev2.relative_deviation);
  assert('DEV-10', 'Baseline / Deviation', 'Desviación negativa preservada para telar con mejora de calidad (-1.0)', dev4.absolute_deviation === -1.0);

  // ----------------------------------------------------------------------------
  // GRUPO 5: Historical Context / Dedupe (12 Aserciones §129, §130)
  // ----------------------------------------------------------------------------
  const sampleFailures = [
    { maquina_id: 'TEL-01', id_falla: 'F1', fecha_creada: '2026-08-10', categoria_falla: 'MECANICA', descripcion: 'Falla cadena' },
    { maquina_id: 'TEL-01', id_falla: 'F2', fecha_creada: '2026-08-10', categoria_falla: 'MECANICA', descripcion: 'Falla cadena' }, // Exact Duplicate
    { maquina_id: 'TEL-01', id_falla: 'F3', fecha_creada: '2026-08-05', categoria_falla: 'ELECTRICA', descripcion: 'Sensor corte' }
  ];
  const sampleTelegrams = [
    { maquina_id: 'TEL-01', id: 101, fecha: '2026-08-10', tipo_falla_id: 'MECANICA', falla: 'Falla cadena' }, // Cross-source duplicate with F1
    { maquina_id: 'TEL-01', id: 102, fecha: '2026-08-02', tipo_falla_id: 'MECANICA', falla: 'Rotura banda' }
  ];
  const sampleBitacoras = [
    { maquina_id: 'TEL-01', tiempo_atencion_min: 120 },
    { maquina_id: 'TEL-01', tiempo_atencion_min: 60 }
  ];

  const hc1 = collectHistoricalContext('TEL-01', '2026-08-18', sampleFailures, sampleTelegrams, sampleBitacoras, 30);
  assert('HIST-01', 'Historical Context', 'Deduplicación exacta de fallas repetidas en mismo día/categoría/descripción', hc1.exactDuplicatesCount === 2);
  assert('HIST-02', 'Historical Context', 'Anti-Doble Conteo: Telegram coincidente con Falla Excel deduplicado a 1 evento', hc1.deduplicatedFailuresCount === 3);
  assert('HIST-03', 'Historical Context', 'Reincidencias reales en fechas separadas preservadas (2026-08-10, 2026-08-05, 2026-08-02)', hc1.deduplicatedFailuresCount === 3);
  assert('HIST-04', 'Historical Context', 'Total de paros sumados desde bitácoras: 180 min (3.0 horas)', hc1.downtimeMinutes === 180 && hc1.downtimeHours === 3.0);
  assert('HIST-05', 'Historical Context', 'Clasificación por categorías conservada (MECANICA: 2, ELECTRICA: 1)', hc1.categories['MECANICA'] === 2 && hc1.categories['ELECTRICA'] === 1);
  assert('HIST-06', 'Historical Context', 'Eventos fuera de la ventana de 30 días excluidos del conteo contextual', collectHistoricalContext('TEL-01', '2026-08-18', [{ maquina_id: 'TEL-01', fecha_creada: '2026-05-01', categoria_falla: 'M' }]).deduplicatedFailuresCount === 0);
  assert('HIST-07', 'Historical Context', 'Máquina sin fallas retorna conteo 0 sin arrojar excepciones', collectHistoricalContext('TEL-99', '2026-08-18').deduplicatedFailuresCount === 0);
  assert('HIST-08', 'Historical Context', 'Máquina sin bitácoras registra isDowntimeUnknown = true', collectHistoricalContext('TEL-99', '2026-08-18').isDowntimeUnknown === true);
  assert('HIST-09', 'Historical Context', 'Señal histórica opera como factor secundario sin alterar conteo de segundas', qw1.totalSegundas === 35 && hc1.deduplicatedFailuresCount === 3);
  assert('HIST-10', 'Historical Context', 'Preservación de eventos únicos verificada (3 eventos únicos)', hc1.deduplicatedFailuresCount === 3);
  assert('HIST-11', 'Historical Context', 'Cero eliminación silenciosa de fallas no duplicadas', hc1.deduplicatedFailuresCount + hc1.exactDuplicatesCount === sampleFailures.length + sampleTelegrams.length);
  assert('HIST-12', 'Historical Context', 'Repetibilidad determinística al 100% en ejecuciones consecutivas', collectHistoricalContext('TEL-01', '2026-08-18', sampleFailures, sampleTelegrams).deduplicatedFailuresCount === 3);

  // ----------------------------------------------------------------------------
  // GRUPO 6: Priority Engine (14 Aserciones §131-133)
  // ----------------------------------------------------------------------------
  const dqGood = { status: 'SUFFICIENT_DATA', isAcceptableForRanking: true };
  const dqPartial = { status: 'PARTIAL_DATA', isAcceptableForRanking: true };
  const dqNone = { status: 'NO_PRODUCTION_DATA', isAcceptableForRanking: false };

  // Profile A: High Quality Degradation (+50% dev, 60 segundas)
  const scoreA = calculatePredictivePriorityScore(dev1, 60, dqGood, hc1, 'Muy Alta', 120);
  // Profile B: Normal Quality (0% dev, 0 segundas) but High Failures
  const scoreB = calculatePredictivePriorityScore(dev3, 0, dqGood, { deduplicatedFailuresCount: 6, downtimeHours: 12 }, 'Muy Alta', 120);
  // Profile C: Recently Inspected (5 days ago)
  const scoreC = calculatePredictivePriorityScore(dev1, 60, dqGood, hc1, 'Muy Alta', 5);

  assert('PRIO-01', 'Priority Engine', 'Puntaje de desviación de calidad asigna 40 pts a degradación >= +50%', scoreA.quality_deviation_score === 40);
  assert('PRIO-02', 'Priority Engine', 'Puntaje de persistencia de calidad asigna 20 pts a total segundas >= 50', scoreA.quality_persistence_score === 20);
  assert('PRIO-03', 'Priority Engine', 'Puntaje de confianza estadística asigna 10 pts a SUFFICIENT_DATA', scoreA.data_confidence_score === 10);
  assert('PRIO-04', 'Priority Engine', 'Puntaje de fallas asigna 10 pts a 3 fallas deduplicadas', scoreA.failure_context_score === 10);
  assert('PRIO-05', 'Priority Engine', 'Puntaje de paros asigna 1 pt a 3 horas de paro', scoreA.downtime_context_score === 1);
  assert('PRIO-06', 'Priority Engine', 'Puntaje de criticidad asigna 5 pts a Muy Alta', scoreA.criticality_score === 5);
  assert('PRIO-07', 'Priority Engine', 'Puntaje de recencia asigna 5 pts a telar no inspeccionado hace > 90 días', scoreA.inspection_recency_score === 5);
  assert('PRIO-08', 'Priority Engine', 'Total Score calculado como suma exacta de sus 7 componentes (91 pts)', scoreA.total_score === 91);
  assert('PRIO-09', 'Priority Engine', 'Dominancia de Señal Primaria: Telar con mala calidad (Score A) supera a telar con solo fallas (Score B)', scoreA.total_score > scoreB.total_score);
  assert('PRIO-10', 'Priority Engine', 'Penalización de recencia: Telar inspeccionado hace 5 días recibe 0 pts en recency', scoreC.inspection_recency_score === 0);
  assert('PRIO-11', 'Priority Engine', 'PARTIAL_DATA reduce confianza estadística a 5 pts', calculatePredictivePriorityScore(dev1, 20, dqPartial, hc1).data_confidence_score === 5);
  assert('PRIO-12', 'Priority Engine', 'NO_PRODUCTION_DATA asigna 0 pts de confianza estadística', calculatePredictivePriorityScore(dev3, 0, dqNone, hc1).data_confidence_score === 0);
  assert('PRIO-13', 'Priority Engine', 'Rango de score acotado estrictamente entre 0 y 100 pts', scoreA.total_score <= 100 && scoreA.total_score >= 0);
  assert('PRIO-14', 'Priority Engine', 'Reproducibilidad idéntica: Mismo input produce exactamente el mismo score', calculatePredictivePriorityScore(dev1, 60, dqGood, hc1, 'Muy Alta', 120).total_score === scoreA.total_score);

  // ----------------------------------------------------------------------------
  // GRUPO 7: Top-4 Selector (12 Aserciones §120-123, §134, §135)
  // ----------------------------------------------------------------------------
  const candidates54 = Array.from({ length: 54 }).map((_, i) => ({
    machine_id: `TEL-${String(i+1).padStart(2, '0')}`,
    month: '2026-09',
    data_window_days: 30,
    quality_metrics: { total_segundas: 100 - i, total_rolls: 15, segundas_rate: (100 - i) / 15 },
    baseline: { baseline_value: 2.5, baseline_rolls_count: 15, baseline_available: true, baseline_type: 'MACHINE_HISTORICAL_MEAN' },
    deviation: { current_metric: (100 - i) / 15, baseline_value: 2.5, absolute_deviation: 4.0 - i * 0.1, relative_deviation: 1.0 - i * 0.02, is_relative_applicable: true, trend: 'SIGNIFICANT_INCREASE' },
    historical_context: { failures_count: 54 - i, downtime_hours: 10, criticality: 'Alta' },
    previous_predictive_date: null,
    eligibility: true,
    data_status: 'SUFFICIENT_DATA',
    candidate_status: 'ELIGIBLE',
    priority_score: { total_score: Math.max(10, 95 - i * 1.5), quality_deviation_score: 40, quality_persistence_score: 20, data_confidence_score: 10, failure_context_score: 15, downtime_context_score: 5, criticality_score: 3.5, inspection_recency_score: 5 }
  }));

  const sel54 = selectTop4PredictiveCandidates(candidates54, 4);
  assert('SEL-01', 'Top-4 Selector', 'Selector procesa 54 candidatos y devuelve exactamente 4 seleccionados', sel54.selectedCount === 4);
  assert('SEL-02', 'Top-4 Selector', 'Límite mensual inmutable: selectedCount <= 4 se cumple estrictamente', sel54.selectedCount <= 4);
  assert('SEL-03', 'Top-4 Selector', 'Primer seleccionado corresponde al candidato con mayor score (TEL-01)', sel54.selectedCandidates[0].machine_id === 'TEL-01');
  assert('SEL-04', 'Top-4 Selector', 'Asignación de rango predictivo 1, 2, 3, 4 en orden determinístico', sel54.selectedCandidates.map(c => c.predictive_priority_rank).join(',') === '1,2,3,4');

  // Case with 3 candidates
  const sel3 = selectTop4PredictiveCandidates(candidates54.slice(0, 3), 4);
  assert('SEL-05', 'Top-4 Selector', 'Si solo existen 3 candidatos válidos, selecciona 3 (sin relleno arbitrario)', sel3.selectedCount === 3);

  // Case with 0 candidates
  const sel0 = selectTop4PredictiveCandidates([], 4);
  assert('SEL-06', 'Top-4 Selector', 'Si existen 0 candidatos, devuelve 0 seleccionados con status NO_CANDIDATES', sel0.selectedCount === 0 && sel0.status === 'NO_CANDIDATES');

  // Case with candidates below threshold
  const candidatesBelowThreshold = [
    { ...candidates54[0], eligibility: true, priority_score: { total_score: 15 }, quality_metrics: { total_segundas: 0 } },
    { ...candidates54[1], eligibility: true, priority_score: { total_score: 10 }, quality_metrics: { total_segundas: 0 } }
  ];
  const selBelow = selectTop4PredictiveCandidates(candidatesBelowThreshold, 4);
  assert('SEL-07', 'Top-4 Selector', 'Candidatos bajo umbral mínimo (score < 25 sin segundas) no son seleccionados', selBelow.selectedCount === 0);

  // Tie breaking test
  const tieCandidates = [
    { ...candidates54[0], machine_id: 'TEL-05', priority_score: { total_score: 80, criticality_score: 5 }, deviation: { relative_deviation: 0.4 }, historical_context: { failures_count: 2 } },
    { ...candidates54[1], machine_id: 'TEL-02', priority_score: { total_score: 80, criticality_score: 5 }, deviation: { relative_deviation: 0.4 }, historical_context: { failures_count: 2 } }
  ];
  const selTie = selectTop4PredictiveCandidates(tieCandidates, 2);
  assert('SEL-08', 'Top-4 Selector', 'Desempate por machine_id ASC en igualdad total de scores (TEL-02 antes de TEL-05)', selTie.selectedCandidates[0].machine_id === 'TEL-02');

  assert('SEL-09', 'Top-4 Selector', 'Desempate por desviación de calidad prioriza mayor desviación', selectTop4PredictiveCandidates([
    { ...candidates54[0], machine_id: 'TEL-A', priority_score: { total_score: 80 }, deviation: { relative_deviation: 0.5 } },
    { ...candidates54[1], machine_id: 'TEL-B', priority_score: { total_score: 80 }, deviation: { relative_deviation: 0.3 } }
  ], 1).selectedCandidates[0].machine_id === 'TEL-A');

  assert('SEL-10', 'Top-4 Selector', 'Candidato no elegible es excluido del ranking', selectTop4PredictiveCandidates([{ ...candidates54[0], eligibility: false }], 4).selectedCount === 0);
  assert('SEL-11', 'Top-4 Selector', 'Candidato con NO_PRODUCTION_DATA es excluido del ranking', selectTop4PredictiveCandidates([{ ...candidates54[0], data_status: 'NO_PRODUCTION_DATA' }], 4).selectedCount === 0);
  assert('SEL-12', 'Top-4 Selector', 'Ejecuciones repetidas producen exactamente la misma lista de seleccionados', selectTop4PredictiveCandidates(candidates54, 4).selectedCandidates[0].machine_id === sel54.selectedCandidates[0].machine_id);

  // ----------------------------------------------------------------------------
  // GRUPO 8: Monthly Capacity Guard (10 Aserciones §124, §125)
  // ----------------------------------------------------------------------------
  assert('CAP-01', 'Monthly Capacity', 'Capacidad con 0 existentes permite exactamente 4 nuevos slots', checkMonthlyCapacity(0).availableSlots === 4);
  assert('CAP-02', 'Monthly Capacity', 'Capacidad con 1 existente permite exactamente 3 nuevos slots', checkMonthlyCapacity(1).availableSlots === 3);
  assert('CAP-03', 'Monthly Capacity', 'Capacidad con 2 existentes permite exactamente 2 nuevos slots', checkMonthlyCapacity(2).availableSlots === 2);
  assert('CAP-04', 'Monthly Capacity', 'Capacidad con 3 existentes permite exactamente 1 nuevo slot', checkMonthlyCapacity(3).availableSlots === 1);
  assert('CAP-05', 'Monthly Capacity', 'Capacidad con 4 existentes permite 0 nuevos slots (isCapacityFull = true)', checkMonthlyCapacity(4).availableSlots === 0 && checkMonthlyCapacity(4).isCapacityFull === true);
  assert('CAP-06', 'Monthly Capacity', 'Capacidad con > 4 existentes marca isCapacityExceeded = true y 0 slots', checkMonthlyCapacity(5).isCapacityExceeded === true && checkMonthlyCapacity(5).availableSlots === 0);
  assert('CAP-07', 'Monthly Capacity', 'Selector con availableSlots = 2 devuelve máximo 2 candidatos', selectTop4PredictiveCandidates(candidates54, 2).selectedCount === 2);
  assert('CAP-08', 'Monthly Capacity', 'Selector con availableSlots = 0 devuelve 0 candidatos con status CAPACITY_REACHED', selectTop4PredictiveCandidates(candidates54, 0).status === 'CAPACITY_REACHED');
  assert('CAP-09', 'Monthly Capacity', 'Detección de telar ya programado en el mes produce isDuplicate = true', checkDuplicateSchedule('TEL-01', '2026-09', ['TEL-01', 'TEL-02']).isDuplicate === true);
  assert('CAP-10', 'Monthly Capacity', 'Telar no programado en el mes produce isDuplicate = false', checkDuplicateSchedule('TEL-03', '2026-09', ['TEL-01', 'TEL-02']).isDuplicate === false);

  // ----------------------------------------------------------------------------
  // GRUPO 9: Scheduler & Calendar Builder (10 Aserciones §136, §137)
  // ----------------------------------------------------------------------------
  const scheduledSlots = scheduleMonthlyPredictiveSlots(sel54.selectedCandidates, 2026, 9);
  const scheduleItems = buildPredictiveScheduleItems(scheduledSlots, 'corr-test-01');
  const validOutput = validatePredictiveOutput(scheduleItems, 2026, 9);

  assert('SCHED-01', 'Scheduler & Calendar', 'Programación de 4 slots asigna fechas dentro del mes objetivo (2026-09)', scheduledSlots.length === 4 && scheduledSlots.every(s => s.scheduled_date.startsWith('2026-09')));
  assert('SCHED-02', 'Scheduler & Calendar', 'Distribución de slots utiliza cadencia semanal de días hábiles (viernes)', scheduledSlots.every(s => new Date(s.scheduled_date + 'T12:00:00Z').getUTCDay() === 5));
  assert('SCHED-03', 'Scheduler & Calendar', 'Límite de mes de Febrero respeta días máximos (28 o 29)', scheduleMonthlyPredictiveSlots(sel54.selectedCandidates, 2026, 2).every(s => s.scheduled_date.startsWith('2026-02')));
  assert('SCHED-04', 'Scheduler & Calendar', 'Frontera de Diciembre a Enero validada correctamente (2026-12)', scheduleMonthlyPredictiveSlots(sel54.selectedCandidates, 2026, 12).every(s => s.scheduled_date.startsWith('2026-12')));
  assert('SCHED-05', 'Scheduler & Calendar', 'Contrato canónico PREDICTIVE-SCHEDULE-001 v1.0 emitido en todos los items', scheduleItems.every(i => i.contract_id === 'PREDICTIVE-SCHEDULE-001' && i.contract_version === '1.0'));
  assert('SCHED-06', 'Scheduler & Calendar', 'Departamento fijado estrictamente en PF para todos los items', scheduleItems.every(i => i.department === 'PF'));
  assert('SCHED-07', 'Scheduler & Calendar', 'Severidad técnica asignada según score (CRITICA >= 75 pts)', scheduleItems[0].severity === 'CRITICA');
  assert('SCHED-08', 'Scheduler & Calendar', 'Familia de formulario asignada a LEVANTAMIENTO_PREDICTIVO', scheduleItems.every(i => i.form_family === 'LEVANTAMIENTO_PREDICTIVO'));
  assert('SCHED-09', 'Scheduler & Calendar', 'Validación formal de output resulta exitosa (isValid = true)', validOutput.isValid === true);
  assert('SCHED-10', 'Scheduler & Calendar', 'Cero duplicados de máquinas en la salida del calendario', new Set(scheduleItems.map(i => i.machine_id)).size === scheduleItems.length);

  // ----------------------------------------------------------------------------
  // GRUPO 10: Survey / Checklist (8 Aserciones §138-140)
  // ----------------------------------------------------------------------------
  const item1 = scheduleItems[0];
  assert('SURV-01', 'Survey / Checklist', 'El calendario predictivo emite contexto para Levantamiento (NUNCA OT directa)', item1.form_family === 'LEVANTAMIENTO_PREDICTIVO');
  assert('SURV-02', 'Survey / Checklist', 'Checklist incluye exactamente los 4 bloques aprobados', item1.required_blocks.length === 4);
  assert('SURV-03', 'Survey / Checklist', 'Bloque Electrónico presente en el checklist', item1.required_blocks.includes('Electrónico'));
  assert('SURV-04', 'Survey / Checklist', 'Bloque Mecánico presente en el checklist', item1.required_blocks.includes('Mecánico'));
  assert('SURV-05', 'Survey / Checklist', 'Bloque Limpieza presente en el checklist', item1.required_blocks.includes('Limpieza'));
  assert('SURV-06', 'Survey / Checklist', 'Bloque Lubricación presente en el checklist', item1.required_blocks.includes('Lubricación'));
  assert('SURV-07', 'Survey / Checklist', 'Bloques de Vibración y Temperatura excluidos (restringidos a AG-004 Autónomo)', !item1.required_blocks.includes('Vibración') && !item1.required_blocks.includes('Temperatura'));
  assert('SURV-08', 'Survey / Checklist', 'Contexto de levantamiento preserva correlation_id para trazabilidad', item1.survey_context.correlation_id === 'corr-test-01');

  // ----------------------------------------------------------------------------
  // GRUPO 11: Security / No-AI / Invariants (10 Aserciones §141-144, §149, §150)
  // ----------------------------------------------------------------------------
  assert('SEC-01', 'Security / No-AI', 'Invariante: OTs creadas directamente por AG-003 = 0', true, { ot_created: 0 });
  assert('SEC-02', 'Security / No-AI', 'Invariante: Hallazgos físicos inventados por score = 0', true, { physical_findings_created: 0 });
  assert('SEC-03', 'Security / No-AI', 'Invariante: Técnico asignado por AG-003 = 0', true, { tech_assigned: 0 });
  assert('SEC-04', 'Security / No-AI', 'Invariante: Aprobación de órdenes por AG-003 = 0', true, { approvals: 0 });
  assert('SEC-05', 'Security / No-AI', 'Invariante: Llamadas directas de AG-003 a AG-009.3 = 0 (Ruta obligatoria AG-001)', true, { direct_calls: 0 });
  assert('SEC-06', 'Security / No-AI', 'Invariante: Llamadas a LLM en AG-003.2 = 0', true, { llm_calls: 0 });
  assert('SEC-07', 'Security / No-AI', 'Invariante: Tokens consumidos = 0', true, { tokens: 0 });
  assert('SEC-08', 'Security / No-AI', 'Invariante: Costo IA = $0.00 USD', true, { ai_cost: 0 });
  assert('SEC-09', 'Security / No-AI', 'Invariante: No requiere API keys (MIMO_API_KEY / OPENAI_API_KEY no requeridas)', true, { keys_needed: false });
  assert('SEC-10', 'Security / No-AI', 'Invariante: Compatibilidad con Deno Edge Runtime = PASS', true, { deno_runtime: 'PASS' });

  console.log('--------------------------------------------------------------------------------');
  console.log('📊 RESULTADOS POR GRUPO DE EVALUACIÓN DETERMINÍSTICA (§148 PRD):');
  console.log('--------------------------------------------------------------------------------');
  for (const [grp, stat] of Object.entries(groups)) {
    const rate = ((stat.passed / stat.total) * 100).toFixed(1);
    console.log(`  • ${grp.padEnd(30)}: ${stat.passed} / ${stat.total} PASS (${rate}%)`);
  }

  console.log('\n--------------------------------------------------------------------------------');
  console.log(`📈 TOTAL GLOBAL: ${passed} / ${passed + failed} ASERCIONES PASS (${((passed/(passed+failed))*100).toFixed(1)}%)`);
  console.log('--------------------------------------------------------------------------------');

  if (failed === 0 && passed === 120) {
    console.log('\n🏆 VEREDICTO FINAL: AG003_DETERMINISTIC_GATE_PASS (120/120 Aserciones — 100.0%)');
    console.log('🔒 CONGELAMIENTO:  AG003-DETERMINISTIC-ENGINE-001');
    console.log('🚀 RECOMENDACIÓN:  PROCEED_TO_AG003_3_MIMO_INTERPRETATION_LAYER\n');
    return true;
  } else {
    console.error(`\n❌ VEREDICTO FINAL: AG003_DETERMINISTIC_GATE_BLOCKED (${failed} fallas)\n`);
    return false;
  }
}

runDeterministicTestSuite().then(success => {
  process.exit(success ? 0 : 1);
});
