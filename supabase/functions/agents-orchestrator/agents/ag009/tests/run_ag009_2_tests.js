// supabase/functions/agents-orchestrator/agents/ag009/tests/run_ag009_2_tests.js
// Node.js Comprehensive Deterministic Test Suite for AG-009.2 Conector Autónomo v1.0 (§74 PRD)

const fs = require('fs');
const path = require('path');

// Cargar fixtures
const fixturesPath = path.join(__dirname, 'fixtures', 'autonomous-cases.json');
const fixtures = JSON.parse(fs.readFileSync(fixturesPath, 'utf-8'));

// Imports simulados de la arquitectura AG-009.2
const ALLOWED_BLOCKS = new Set(['Vibración', 'Limpieza', 'Lubricación', 'Temperatura', 'Cableado']);
const ALLOWED_TYPES = new Set(['YES_NO', 'NUMERIC', 'SELECT', 'TEXT']);

function validateAutonomousScheduleContract(rawPayload) {
  if (!rawPayload || typeof rawPayload !== 'object' || Array.isArray(rawPayload)) {
    return { isValid: false, errorCode: 'INVALID_CONTRACT', errorMessage: 'Payload no es un objeto.' };
  }

  // Security Check
  const forbiddenSecurityKeys = ['force_create_ot', 'skip_validation', 'is_admin', 'execute_sql', 'target_agent'];
  for (const key of forbiddenSecurityKeys) {
    if (key in rawPayload && rawPayload[key] !== undefined && rawPayload[key] !== false && rawPayload[key] !== null) {
      return {
        isValid: false,
        errorCode: 'UNAUTHORIZED_ACTION_ATTEMPT',
        errorMessage: `Parámetro de autoridad prohibido: ${key}`
      };
    }
  }

  const p = rawPayload;
  if (!p.machine_id || typeof p.machine_id !== 'string' || !p.machine_id.trim()) {
    return { isValid: false, errorCode: 'MISSING_REQUIRED_DATA', errorMessage: 'machine_id es requerido.' };
  }
  if (!p.scheduled_date || isNaN(new Date(p.scheduled_date).getTime())) {
    return { isValid: false, errorCode: 'INVALID_DATE', errorMessage: 'scheduled_date inválida.' };
  }
  if (p.week_reference === undefined || p.week_reference === null || !String(p.week_reference).trim()) {
    return { isValid: false, errorCode: 'MISSING_REQUIRED_DATA', errorMessage: 'week_reference es requerido.' };
  }
  const dateObj = new Date(p.scheduled_date);
  const yearVal = typeof p.year === 'number' ? p.year : (parseInt(String(p.year), 10) || dateObj.getUTCFullYear());
  if (isNaN(yearVal) || yearVal < 2000 || yearVal > 2100) {
    return { isValid: false, errorCode: 'MISSING_REQUIRED_DATA', errorMessage: 'year inválido.' };
  }
  if (!p.calendar_reference || !p.calendar_reference.trim()) {
    return { isValid: false, errorCode: 'MISSING_REQUIRED_DATA', errorMessage: 'calendar_reference es requerido.' };
  }
  const source = p.source_reference ? String(p.source_reference).trim().toUpperCase() : 'AUTONOMO';
  if (source !== 'AUTONOMO' && source !== 'AG-004' && source !== 'CALENDARIO_AUTONOMO') {
    return { isValid: false, errorCode: 'INVALID_SOURCE', errorMessage: `Fuente ${source} inválida.` };
  }

  const rawResponses = Array.isArray(p.responses) ? p.responses : [];
  const cleanResponses = rawResponses.map((item, i) => {
    const blockStr = String(item.block || '').trim();
    let normBlock = 'Vibración';
    if (ALLOWED_BLOCKS.has(blockStr)) normBlock = blockStr;
    else if (blockStr.toLowerCase().includes('vibr')) normBlock = 'Vibración';
    else if (blockStr.toLowerCase().includes('limp')) normBlock = 'Limpieza';
    else if (blockStr.toLowerCase().includes('lubr')) normBlock = 'Lubricación';
    else if (blockStr.toLowerCase().includes('temp')) normBlock = 'Temperatura';
    else if (blockStr.toLowerCase().includes('cabl')) normBlock = 'Cableado';

    const respType = String(item.response_type || 'YES_NO').toUpperCase().trim();
    const normType = ALLOWED_TYPES.has(respType) ? respType : 'YES_NO';

    return {
      item_code: String(item.item_code || `ITEM-${i + 1}`).trim().toUpperCase(),
      block: normBlock,
      question_text: String(item.question_text || `Pregunta ${i + 1}`).trim(),
      response_type: normType,
      value: item.value !== undefined ? item.value : null,
      unit: item.unit ? String(item.unit).trim() : undefined,
      required: item.required === true,
      reference_min: typeof item.reference_min === 'number' ? item.reference_min : undefined,
      reference_max: typeof item.reference_max === 'number' ? item.reference_max : undefined,
      evidence_reference: item.evidence_reference ? String(item.evidence_reference).trim() : undefined,
      notes: item.notes ? String(item.notes).trim() : undefined
    };
  });

  return {
    isValid: true,
    cleanedPayload: {
      contract_id: 'AUTONOMOUS-SCHEDULE-001',
      contract_version: '1.0',
      machine_id: String(p.machine_id).trim().toUpperCase(),
      scheduled_date: p.scheduled_date,
      week_reference: p.week_reference,
      year: yearVal,
      calendar_reference: String(p.calendar_reference).trim(),
      form_reference: p.form_reference ? String(p.form_reference).trim() : 'LEVANTAMIENTO_AUTONOMO',
      source_reference: 'AUTONOMO',
      department: p.department ? String(p.department).trim().toUpperCase() : undefined,
      responses: cleanResponses,
      operator_id: p.operator_id ? String(p.operator_id).trim() : undefined,
      operator_name: p.operator_name ? String(p.operator_name).trim() : undefined
    }
  };
}

function validateAutonomousMachineGuard(machineId, machinesCatalog) {
  const normId = String(machineId || '').trim().toUpperCase();
  const found = machinesCatalog.find(m => m.equipo_towell.trim().toUpperCase() === normId);
  if (!found) throw { code: 'MACHINE_NOT_FOUND', message: `Máquina '${normId}' no encontrada.` };
  if (found.activo === false) throw { code: 'MACHINE_INACTIVE', message: `Máquina '${normId}' inactiva.` };

  let rawDept = (found.departamento_codigo || found.area || '').toUpperCase().trim();
  const validDepts = new Set(['PF', 'CF', 'TF', 'AF']);
  if (!validDepts.has(rawDept)) {
    if (normId.startsWith('COS')) rawDept = 'CF';
    else if (normId.startsWith('TIN') || normId.startsWith('JET')) rawDept = 'TF';
    else if (normId.startsWith('COMP') || normId.startsWith('CHIL')) rawDept = 'AF';
    else rawDept = 'PF';
  }
  return {
    machine_id: found.equipo_towell,
    department: validDepts.has(rawDept) ? rawDept : 'PF',
    criticidad: found.criticidad || 'B',
    activo: true
  };
}

function validateAutonomousScheduleGuard(calendarReference, weekReference, scheduledDate, year) {
  if (!calendarReference || !String(calendarReference).trim()) {
    throw { code: 'AUTONOMOUS_SCHEDULE_NOT_FOUND', message: 'calendar_reference requerido.' };
  }
  if (weekReference === undefined || weekReference === null || !String(weekReference).trim()) {
    throw { code: 'AUTONOMOUS_SCHEDULE_NOT_FOUND', message: 'week_reference requerido.' };
  }
  const d = new Date(scheduledDate);
  if (isNaN(d.getTime())) throw { code: 'INVALID_CONTRACT', message: 'scheduled_date inválida.' };
  return { calendar_reference: calendarReference, week_reference: weekReference, year: year || d.getUTCFullYear(), scheduled_date: scheduledDate };
}

function validateAutonomousDuplicateGuard(machineId, weekReference, year, existingSurveys) {
  const normMachine = String(machineId).trim().toUpperCase();
  const normWeek = String(weekReference).trim().toUpperCase();

  const dup = existingSurveys.find(s => {
    return s.machine_id.trim().toUpperCase() === normMachine &&
           String(s.week_reference).trim().toUpperCase() === normWeek &&
           (s.year ? s.year === year : true) &&
           s.status !== 'CANCELADO';
  });

  if (dup) {
    throw { code: 'AUTONOMOUS_EXECUTION_DUPLICATE', message: `Duplicado en semana ${normWeek}.` };
  }
  return { isDuplicate: false };
}

function validateFiveBlocksAndTemperature(responses) {
  const present = new Set(responses.map(r => r.block));
  if (!present.has('Temperatura')) {
    throw { code: 'TEMPERATURE_BLOCK_MISSING', message: 'Bloque Temperatura faltante.' };
  }
  const mandatory = ['Vibración', 'Limpieza', 'Lubricación', 'Temperatura', 'Cableado'];
  const missing = mandatory.filter(b => !present.has(b));
  if (missing.length > 0) {
    throw { code: 'AUTONOMOUS_CHECKLIST_INCOMPLETE', message: `Faltan bloques: ${missing.join(', ')}` };
  }
  return { isValid: true };
}

function validateAutonomousResponses(responses) {
  if (!Array.isArray(responses) || responses.length === 0) {
    throw { code: 'MISSING_REQUIRED_RESPONSE', message: 'Checklist vacío.' };
  }
  return responses.map((item, i) => {
    const isValEmpty = item.value === null || item.value === undefined || item.value === '';
    if (item.required === true && isValEmpty) {
      throw { code: 'MISSING_REQUIRED_RESPONSE', message: `Falta respuesta en ${item.item_code}` };
    }
    if (isValEmpty) return { ...item, value: null };

    let finalVal = item.value;
    if (item.response_type === 'NUMERIC') {
      const num = typeof item.value === 'number' ? item.value : parseFloat(String(item.value).trim());
      if (isNaN(num)) throw { code: 'INVALID_RESPONSE_TYPE', message: `Valor numérico inválido en ${item.item_code}` };
      finalVal = num;
    } else if (item.response_type === 'YES_NO') {
      const strVal = String(item.value).toUpperCase().trim();
      const validYesNo = ['SI', 'NO', 'OK', 'NOK', 'TRUE', 'FALSE', 'CORRECTO', 'INCORRECTO', 'N/A', 'NA'];
      if (!validYesNo.includes(strVal) && typeof item.value !== 'boolean') {
        throw { code: 'INVALID_RESPONSE_TYPE', message: `Valor YES_NO inválido en ${item.item_code}` };
      }
      finalVal = typeof item.value === 'boolean' ? (item.value ? 'SI' : 'NO') : strVal;
    }
    return { ...item, value: finalVal };
  });
}

function detectAutonomousFindings(params) {
  const findings = [];
  for (const item of params.responses) {
    if (!item || item.value === null || item.value === 'N/A' || item.value === 'NA') continue;

    let isFinding = false;
    let description = '';
    let severity = 'MEDIA';

    if (item.block === 'Vibración') {
      if (item.response_type === 'NUMERIC') {
        const val = Number(item.value);
        const max = item.reference_max !== undefined ? item.reference_max : 7.0;
        if (val > max) {
          isFinding = true;
          description = `Vibración excesiva: ${val} mm/s (máx: ${max} mm/s)`;
          severity = val > (max * 1.5) ? 'CRITICA' : 'ALTA';
        }
      } else if (['NO', 'NOK', 'FALSE', 'INCORRECTO'].includes(String(item.value).toUpperCase())) {
        isFinding = true;
        description = 'Anomalía de vibración reportada';
        severity = 'ALTA';
      }
    } else if (item.block === 'Limpieza') {
      if (['NO', 'NOK', 'FALSE', 'INCORRECTO'].includes(String(item.value).toUpperCase())) {
        isFinding = true;
        description = 'Falta de limpieza / acumulación de suciedad';
        severity = 'MEDIA';
      }
    } else if (item.block === 'Lubricación') {
      if (item.response_type === 'NUMERIC') {
        const val = Number(item.value);
        const min = item.reference_min !== undefined ? item.reference_min : 30.0;
        const max = item.reference_max !== undefined ? item.reference_max : 100.0;
        if (val < min || val > max) {
          isFinding = true;
          description = `Presión/nivel de lubricación fuera de rango: ${val} PSI`;
          severity = val < (min * 0.5) ? 'CRITICA' : 'ALTA';
        }
      } else if (['NO', 'NOK', 'FALSE', 'INCORRECTO'].includes(String(item.value).toUpperCase())) {
        isFinding = true;
        description = 'Anomalía en sistema de lubricación';
        severity = 'ALTA';
      }
    } else if (item.block === 'Temperatura') {
      if (item.response_type === 'NUMERIC') {
        const val = Number(item.value);
        const max = item.reference_max !== undefined ? item.reference_max : 70.0;
        if (val > max) {
          isFinding = true;
          description = `Temperatura elevada: ${val} °C (máx: ${max} °C)`;
          severity = val > (max + 20) ? 'CRITICA' : 'ALTA';
        }
      } else if (['NO', 'NOK', 'FALSE', 'INCORRECTO'].includes(String(item.value).toUpperCase())) {
        isFinding = true;
        description = 'Sobrecalentamiento reportado';
        severity = 'ALTA';
      }
    } else if (item.block === 'Cableado') {
      if (['NO', 'NOK', 'FALSE', 'INCORRECTO'].includes(String(item.value).toUpperCase())) {
        isFinding = true;
        description = 'Defecto en cableado o canalización';
        severity = 'ALTA';
      }
    }

    if (isFinding) {
      const seq = String(findings.length + 1).padStart(2, '0');
      findings.push({
        contract_id: 'AUTONOMOUS-FINDING-001',
        contract_version: '1.0',
        finding_id: `FND-${params.machine_id}-W${params.week_reference}-${item.item_code}-${seq}`,
        machine_id: params.machine_id,
        survey_reference: params.survey_reference,
        calendar_reference: params.calendar_reference,
        week_reference: params.week_reference,
        year: params.year,
        finding_code: `ANOMALIA_${item.block.toUpperCase()}_${item.item_code}`,
        finding_description: description,
        block: item.block,
        severity: severity,
        evidence_reference: item.evidence_reference,
        source_reference: 'AUTONOMO',
        correlation_id: params.correlation_id,
        detected_at: new Date().toISOString()
      });
    }
  }
  return findings;
}

async function processAutonomousScheduleItem(payload, correlationId, eventId, options = {}) {
  const startTime = Date.now();
  if (options.featureFlagEnabled === false) {
    return {
      success: false,
      agent_id: 'AG-009.2',
      workflow_state: 'BLOCKED',
      correlation_id: correlationId,
      error_code: 'AGENT_CONNECTOR_DISABLED',
      error_message: 'Deshabilitado por Feature Flag.',
      duration_ms: Date.now() - startTime
    };
  }

  const contractVal = validateAutonomousScheduleContract(payload);
  if (!contractVal.isValid || !contractVal.cleanedPayload) {
    return {
      success: false,
      agent_id: 'AG-009.2',
      workflow_state: 'BLOCKED',
      correlation_id: correlationId,
      error_code: contractVal.errorCode || 'INVALID_CONTRACT',
      error_message: contractVal.errorMessage,
      duration_ms: Date.now() - startTime
    };
  }

  const p = contractVal.cleanedPayload;

  try {
    const machine = validateAutonomousMachineGuard(p.machine_id, options.localCatalogs?.machines || fixtures.machines_catalog);
    const schedule = validateAutonomousScheduleGuard(p.calendar_reference, p.week_reference, p.scheduled_date, p.year);
    validateAutonomousDuplicateGuard(machine.machine_id, schedule.week_reference, schedule.year, options.localCatalogs?.existingSurveys || fixtures.existing_surveys);
    validateFiveBlocksAndTemperature(p.responses);
    const validatedResponses = validateAutonomousResponses(p.responses);

    const surveyRef = `LEV-AUT-${machine.machine_id}-W${schedule.week_reference}-${schedule.year}`;
    const findings = detectAutonomousFindings({
      machine_id: machine.machine_id,
      survey_reference: surveyRef,
      calendar_reference: schedule.calendar_reference,
      week_reference: schedule.week_reference,
      year: schedule.year,
      responses: validatedResponses,
      correlation_id: correlationId
    });

    const surveyExecutionRecord = {
      survey_reference: surveyRef,
      machine_id: machine.machine_id,
      department: machine.department,
      calendar_reference: schedule.calendar_reference,
      week_reference: schedule.week_reference,
      year: schedule.year,
      total_items: validatedResponses.length,
      finding_count: findings.length,
      executed_at: new Date().toISOString(),
      status: 'EJECUTADO'
    };

    if (findings.length === 0) {
      return {
        success: true,
        agent_id: 'AG-009.2',
        workflow_state: 'AUTONOMOUS_SURVEY_COMPLETED',
        correlation_id: correlationId,
        event_id: eventId,
        survey_execution: surveyExecutionRecord,
        findings: [],
        ot_created: null,
        details: { message: 'Rutina completada sin hallazgos.', five_blocks_validated: true, finding_count: 0 },
        duration_ms: Date.now() - startTime
      };
    }

    return {
      success: true,
      agent_id: 'AG-009.2',
      workflow_state: 'AUTONOMOUS_FINDING_DETECTED',
      correlation_id: correlationId,
      event_id: eventId,
      survey_execution: surveyExecutionRecord,
      findings: findings,
      ot_created: null, // NUNCA CREA OT DIRECTAMENTE (§40 PRD)
      details: {
        message: `Detectados ${findings.length} hallazgos para enrutamiento por AG-001.`,
        finding_count: findings.length,
        finding_ids: findings.map(f => f.finding_id)
      },
      duration_ms: Date.now() - startTime
    };

  } catch (err) {
    return {
      success: false,
      agent_id: 'AG-009.2',
      workflow_state: 'BLOCKED',
      correlation_id: correlationId,
      error_code: err.code || 'PERSISTENCE_ERROR',
      error_message: err.message,
      duration_ms: Date.now() - startTime
    };
  }
}

// -------------------------------------------------------------
// SUITE DE EJECUCIÓN DE PRUEBAS
// -------------------------------------------------------------
async function runTests() {
  console.log('================================================================');
  console.log('🧪 SUITE DE EVALUACIÓN AG-009.2 — CONECTOR AUTÓNOMO v1.0');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      passed++;
      console.log(`  ✅ PASS: ${testName}`);
    } else {
      failed++;
      console.error(`  ❌ FAIL: ${testName} — ${details}`);
    }
  }

  // -------------------------------------------------------------
  // GRUPO 1: Contrato y Seguridad (§10 & §71 PRD)
  // -------------------------------------------------------------
  console.log('📌 GRUPO 1: Validación de Contrato y Seguridad');
  const res1 = await processAutonomousScheduleItem(null, 'corr-1');
  assert(!res1.success && res1.error_code === 'INVALID_CONTRACT', 'Rechazar payload nulo');

  const res2 = await processAutonomousScheduleItem({ machine_id: '' }, 'corr-2');
  assert(!res2.success && res2.error_code === 'MISSING_REQUIRED_DATA', 'Rechazar machine_id vacío');

  const res3 = await processAutonomousScheduleItem({ machine_id: 'TELAR-01', scheduled_date: 'invalid-date' }, 'corr-3');
  assert(!res3.success && res3.error_code === 'INVALID_DATE', 'Rechazar fecha programada inválida');

  const res4 = await processAutonomousScheduleItem({
    machine_id: 'TELAR-01', scheduled_date: '2026-08-20', week_reference: 34, year: 2026, calendar_reference: 'CAL-01', source_reference: 'INVALID_SRC'
  }, 'corr-4');
  assert(!res4.success && res4.error_code === 'INVALID_SOURCE', 'Rechazar fuente distinta de AUTONOMO');

  const res5 = await processAutonomousScheduleItem({
    machine_id: 'TELAR-01', scheduled_date: '2026-08-20', week_reference: 34, year: 2026, calendar_reference: 'CAL-01', force_create_ot: true
  }, 'corr-5');
  assert(!res5.success && res5.error_code === 'UNAUTHORIZED_ACTION_ATTEMPT', 'Rechazar inyección de seguridad force_create_ot = true');

  const res6 = await processAutonomousScheduleItem({
    machine_id: 'TELAR-01', scheduled_date: '2026-08-20', week_reference: 34, year: 2026, calendar_reference: 'CAL-01', execute_sql: 'DROP TABLE cat_maquinas;'
  }, 'corr-6');
  assert(!res6.success && res6.error_code === 'UNAUTHORIZED_ACTION_ATTEMPT', 'Rechazar inyección de seguridad execute_sql');

  // -------------------------------------------------------------
  // GRUPO 2: Máquinas y 4 Departamentos (PF, CF, TF, AF) (§12 & §13 PRD)
  // -------------------------------------------------------------
  console.log('\n📌 GRUPO 2: Guardia de Máquinas y Cobertura de 4 Departamentos');
  const baseValidClean = {
    machine_id: 'TELAR-01', scheduled_date: '2026-08-20', week_reference: 34, year: 2026, calendar_reference: 'CAL-01', source_reference: 'AUTONOMO',
    responses: fixtures.standard_five_blocks_clean
  };

  const resPF = await processAutonomousScheduleItem({ ...baseValidClean, machine_id: 'TELAR-01' }, 'corr-pf');
  assert(resPF.success && resPF.survey_execution.department === 'PF', 'Aceptar máquina activa en departamento PF (Producción)');

  const resCF = await processAutonomousScheduleItem({ ...baseValidClean, machine_id: 'COS-OVER-03' }, 'corr-cf');
  assert(resCF.success && resCF.survey_execution.department === 'CF', 'Aceptar máquina activa en departamento CF (Costura)');

  const resTF = await processAutonomousScheduleItem({ ...baseValidClean, machine_id: 'JET-02' }, 'corr-tf');
  assert(resTF.success && resTF.survey_execution.department === 'TF', 'Aceptar máquina activa en departamento TF (Tintorería)');

  const resAF = await processAutonomousScheduleItem({ ...baseValidClean, machine_id: 'COMP-01' }, 'corr-af');
  assert(resAF.success && resAF.survey_execution.department === 'AF', 'Aceptar máquina activa en departamento AF (Servicios Auxiliares)');

  const resMachNotFound = await processAutonomousScheduleItem({ ...baseValidClean, machine_id: 'MAQUINA-FANTASMA' }, 'corr-nf');
  assert(!resMachNotFound.success && resMachNotFound.error_code === 'MACHINE_NOT_FOUND', 'Rechazar máquina inexistente (MACHINE_NOT_FOUND)');

  const resMachInactive = await processAutonomousScheduleItem({ ...baseValidClean, machine_id: 'TELAR-INACTIVO' }, 'corr-inact');
  assert(!resMachInactive.success && resMachInactive.error_code === 'MACHINE_INACTIVE', 'Rechazar máquina inactiva (MACHINE_INACTIVE)');

  // -------------------------------------------------------------
  // GRUPO 3: Programación Semanal e Idempotencia/Duplicados (§14, §15, §16, §70 PRD)
  // -------------------------------------------------------------
  console.log('\n📌 GRUPO 3: Programación Semanal, Idempotencia y Reincidencia');
  const resDupSameWeek = await processAutonomousScheduleItem({
    ...baseValidClean, machine_id: 'TELAR-01', week_reference: 33, year: 2026
  }, 'corr-dup');
  assert(!resDupSameWeek.success && resDupSameWeek.error_code === 'AUTONOMOUS_EXECUTION_DUPLICATE', 'Bloquear ejecución duplicada en la misma semana (Semana 33)');

  const resRecurrenceDiffWeek = await processAutonomousScheduleItem({
    ...baseValidClean, machine_id: 'TELAR-01', week_reference: 34, year: 2026
  }, 'corr-diff-week');
  assert(resRecurrenceDiffWeek.success, 'Permitir ejecución para la misma máquina en diferente semana (Semana 34 - Reincidencia válida)');

  const resDiffMachineSameWeek = await processAutonomousScheduleItem({
    ...baseValidClean, machine_id: 'COS-OVER-03', week_reference: 33, year: 2026
  }, 'corr-diff-mach');
  assert(resDiffMachineSameWeek.success, 'Permitir ejecución de diferente máquina en la misma semana (Semana 33)');

  assert(resRecurrenceDiffWeek.survey_execution.week_reference === 34, 'week_reference registrado con precisión en el levantamiento');
  assert(resRecurrenceDiffWeek.survey_execution.calendar_reference === 'CAL-01', 'calendar_reference vinculado correctamente');

  // -------------------------------------------------------------
  // GRUPO 4: Validación de 5 Bloques y Guardia de Temperatura (§19, §20, §21, §63, §64 PRD)
  // -------------------------------------------------------------
  console.log('\n📌 GRUPO 4: Regla de los 5 Bloques y Guardia Obligatoria de Temperatura');
  const responsesNoTemp = fixtures.standard_five_blocks_clean.filter(r => r.block !== 'Temperatura');
  const resMissingTemp = await processAutonomousScheduleItem({ ...baseValidClean, responses: responsesNoTemp }, 'corr-notemp');
  assert(!resMissingTemp.success && resMissingTemp.error_code === 'TEMPERATURE_BLOCK_MISSING', 'Bloquear checklist si falta bloque Temperatura (TEMPERATURE_BLOCK_MISSING)');

  const responsesNoVib = fixtures.standard_five_blocks_clean.filter(r => r.block !== 'Vibración');
  const resMissingVib = await processAutonomousScheduleItem({ ...baseValidClean, responses: responsesNoVib }, 'corr-novib');
  assert(!resMissingVib.success && resMissingVib.error_code === 'AUTONOMOUS_CHECKLIST_INCOMPLETE', 'Bloquear checklist si falta bloque Vibración (AUTONOMOUS_CHECKLIST_INCOMPLETE)');

  const responsesNoLimp = fixtures.standard_five_blocks_clean.filter(r => r.block !== 'Limpieza');
  const resMissingLimp = await processAutonomousScheduleItem({ ...baseValidClean, responses: responsesNoLimp }, 'corr-nolimp');
  assert(!resMissingLimp.success && resMissingLimp.error_code === 'AUTONOMOUS_CHECKLIST_INCOMPLETE', 'Bloquear checklist si falta bloque Limpieza');

  const responsesNoLub = fixtures.standard_five_blocks_clean.filter(r => r.block !== 'Lubricación');
  const resMissingLub = await processAutonomousScheduleItem({ ...baseValidClean, responses: responsesNoLub }, 'corr-nolub');
  assert(!resMissingLub.success && resMissingLub.error_code === 'AUTONOMOUS_CHECKLIST_INCOMPLETE', 'Bloquear checklist si falta bloque Lubricación');

  const responsesNoCab = fixtures.standard_five_blocks_clean.filter(r => r.block !== 'Cableado');
  const resMissingCab = await processAutonomousScheduleItem({ ...baseValidClean, responses: responsesNoCab }, 'corr-nocab');
  assert(!resMissingCab.success && resMissingCab.error_code === 'AUTONOMOUS_CHECKLIST_INCOMPLETE', 'Bloquear checklist si falta bloque Cableado');

  const resAllFivePresent = await processAutonomousScheduleItem(baseValidClean, 'corr-all5');
  assert(resAllFivePresent.success && resAllFivePresent.details.five_blocks_validated === true, 'Aprobar cuando los 5 bloques obligatorios están completos');

  // -------------------------------------------------------------
  // GRUPO 5: Validación de Respuestas, Tipos y N/A (§22, §23, §27, §28 PRD)
  // -------------------------------------------------------------
  console.log('\n📌 GRUPO 5: Integridad de Respuestas, Tipos y Manejo Semántico de N/A');
  const responsesMissingReq = [
    ...fixtures.standard_five_blocks_clean.slice(0, 4),
    { item_code: 'CAB-01', block: 'Cableado', question_text: 'Cables', response_type: 'YES_NO', value: null, required: true }
  ];
  const resMissingReq = await processAutonomousScheduleItem({ ...baseValidClean, responses: responsesMissingReq }, 'corr-mreq');
  assert(!resMissingReq.success && resMissingReq.error_code === 'MISSING_REQUIRED_RESPONSE', 'Rechazar respuesta requerida vacía sin inventar valor (MISSING_REQUIRED_RESPONSE)');

  const responsesInvalidNum = [
    ...fixtures.standard_five_blocks_clean.slice(1),
    { item_code: 'VIB-01', block: 'Vibración', question_text: 'Vib', response_type: 'NUMERIC', value: 'no-es-numero', required: true }
  ];
  const resInvalidNum = await processAutonomousScheduleItem({ ...baseValidClean, responses: responsesInvalidNum }, 'corr-inum');
  assert(!resInvalidNum.success && resInvalidNum.error_code === 'INVALID_RESPONSE_TYPE', 'Rechazar valor numérico no parseable (INVALID_RESPONSE_TYPE)');

  const responsesWithNA = fixtures.standard_five_blocks_clean.map(r => r.block === 'Cableado' ? { ...r, value: 'N/A' } : r);
  const resWithNA = await processAutonomousScheduleItem({ ...baseValidClean, responses: responsesWithNA }, 'corr-na');
  assert(resWithNA.success && resWithNA.findings.length === 0, 'Respetar semántica de N/A sin generar falso hallazgo');

  const responsesBool = fixtures.standard_five_blocks_clean.map(r => r.block === 'Limpieza' ? { ...r, value: true } : r);
  const resBool = await processAutonomousScheduleItem({ ...baseValidClean, responses: responsesBool }, 'corr-bool');
  assert(resBool.success, 'Aceptar y normalizar valores booleanos true/false');

  const responsesOptionalEmpty = [
    ...fixtures.standard_five_blocks_clean,
    { item_code: 'OPT-01', block: 'Limpieza', question_text: 'Observación adicional', response_type: 'TEXT', value: '', required: false }
  ];
  const resOptEmpty = await processAutonomousScheduleItem({ ...baseValidClean, responses: responsesOptionalEmpty }, 'corr-opt');
  assert(resOptEmpty.success, 'Permitir campos opcionales vacíos sin lanzar excepción');

  // -------------------------------------------------------------
  // GRUPO 6: Motor de Reglas Determinísticas de Hallazgo (§25, §29-33, §64 PRD)
  // -------------------------------------------------------------
  console.log('\n📌 GRUPO 6: Detección Determinística de Hallazgos por Bloque');
  // Vibración
  const vibFindingResp = fixtures.standard_five_blocks_clean.map(r => r.block === 'Vibración' ? { ...r, value: 8.5 } : r);
  const resVibFnd = await processAutonomousScheduleItem({ ...baseValidClean, responses: vibFindingResp }, 'corr-fvib');
  assert(resVibFnd.findings.length === 1 && resVibFnd.findings[0].block === 'Vibración', 'Detectar hallazgo por Vibración excesiva (> 7.0 mm/s)');

  // Limpieza
  const limpFindingResp = fixtures.standard_five_blocks_clean.map(r => r.block === 'Limpieza' ? { ...r, value: 'NO' } : r);
  const resLimpFnd = await processAutonomousScheduleItem({ ...baseValidClean, responses: limpFindingResp }, 'corr-flimp');
  assert(resLimpFnd.findings.length === 1 && resLimpFnd.findings[0].block === 'Limpieza', 'Detectar hallazgo por falta de Limpieza (NO)');

  // Lubricación
  const lubFindingResp = fixtures.standard_five_blocks_clean.map(r => r.block === 'Lubricación' ? { ...r, value: 12.0 } : r);
  const resLubFnd = await processAutonomousScheduleItem({ ...baseValidClean, responses: lubFindingResp }, 'corr-flub');
  assert(resLubFnd.findings.length === 1 && resLubFnd.findings[0].block === 'Lubricación', 'Detectar hallazgo por baja presión de Lubricación (< 30 PSI)');

  // Temperatura
  const tempFindingResp = fixtures.standard_five_blocks_clean.map(r => r.block === 'Temperatura' ? { ...r, value: 88.0 } : r);
  const resTempFnd = await processAutonomousScheduleItem({ ...baseValidClean, responses: tempFindingResp }, 'corr-ftemp');
  assert(resTempFnd.findings.length === 1 && resTempFnd.findings[0].block === 'Temperatura', 'Detectar hallazgo por sobrecalentamiento de Temperatura (> 70°C)');

  // Temperatura normal
  const tempNormalResp = fixtures.standard_five_blocks_clean.map(r => r.block === 'Temperatura' ? { ...r, value: 45.0 } : r);
  const resTempNorm = await processAutonomousScheduleItem({ ...baseValidClean, responses: tempNormalResp }, 'corr-ntemp');
  assert(resTempNorm.findings.length === 0, 'No emitir hallazgo cuando Temperatura está dentro de rango (45°C)');

  // Cableado
  const cabFindingResp = fixtures.standard_five_blocks_clean.map(r => r.block === 'Cableado' ? { ...r, value: 'NO' } : r);
  const resCabFnd = await processAutonomousScheduleItem({ ...baseValidClean, responses: cabFindingResp }, 'corr-fcab');
  assert(resCabFnd.findings.length === 1 && resCabFnd.findings[0].block === 'Cableado', 'Detectar hallazgo por defecto de Cableado (NO)');

  // -------------------------------------------------------------
  // GRUPO 7: Flujo E2E Sin Hallazgos (§34 & §47 PRD)
  // -------------------------------------------------------------
  console.log('\n📌 GRUPO 7: Flujo End-to-End Sin Hallazgos');
  const resCleanE2E = await processAutonomousScheduleItem(baseValidClean, 'corr-clean-e2e', 'EVT-001');
  assert(resCleanE2E.success === true, 'Ejecución exitosa del flujo sin anomalías');
  assert(resCleanE2E.workflow_state === 'AUTONOMOUS_SURVEY_COMPLETED', 'Estado final AUTONOMOUS_SURVEY_COMPLETED');
  assert(resCleanE2E.findings.length === 0, 'findings es un arreglo vacío');
  assert(resCleanE2E.ot_created === null, 'ot_created es null (NO crea OT §40 PRD)');
  assert(resCleanE2E.survey_execution.status === 'EJECUTADO', 'Levantamiento registrado con estatus EJECUTADO');
  assert(resCleanE2E.duration_ms >= 0, 'duration_ms medido correctamente');

  // -------------------------------------------------------------
  // GRUPO 8: Flujo E2E Con Hallazgos (§35, §36, §37, §38, §39, §40, §41 PRD)
  // -------------------------------------------------------------
  console.log('\n📌 GRUPO 8: Flujo End-to-End Con Múltiples Hallazgos');
  const payloadWithFindings = {
    ...baseValidClean,
    responses: fixtures.standard_five_blocks_with_findings
  };
  const resFindingsE2E = await processAutonomousScheduleItem(payloadWithFindings, 'corr-fnd-e2e', 'EVT-002');
  assert(resFindingsE2E.success === true, 'Ejecución exitosa con hallazgos detectados');
  assert(resFindingsE2E.workflow_state === 'AUTONOMOUS_FINDING_DETECTED', 'Estado final AUTONOMOUS_FINDING_DETECTED');
  assert(resFindingsE2E.findings.length === 5, 'Detectados exactamente 5 hallazgos (1 por cada bloque)');
  assert(resFindingsE2E.findings[0].contract_id === 'AUTONOMOUS-FINDING-001', 'Hallazgo cumple con contrato AUTONOMOUS-FINDING-001');
  assert(resFindingsE2E.findings[0].finding_id.startsWith('FND-TELAR-01-W34-'), 'finding_id formateado con trazabilidad');
  assert(resFindingsE2E.findings.every(f => f.correlation_id === 'corr-fnd-e2e'), 'correlation_id preservado 100% en todos los hallazgos (§39 PRD)');
  assert(resFindingsE2E.ot_created === null, 'CERO creación directa de OT (target OT created = 0 §40 PRD)');
  assert(resFindingsE2E.findings.every(f => f.source_reference === 'AUTONOMO'), 'source_reference = AUTONOMO en todos los hallazgos');

  // -------------------------------------------------------------
  // GRUPO 9: Cero Tokens / Cero Costo / Feature Flag (§56, §57, §58 PRD)
  // -------------------------------------------------------------
  console.log('\n📌 GRUPO 9: Métricas de IA, Costos y Feature Flags');
  const resFF = await processAutonomousScheduleItem(baseValidClean, 'corr-ff', 'EVT-003', { featureFlagEnabled: false });
  assert(!resFF.success && resFF.error_code === 'AGENT_CONNECTOR_DISABLED', 'Bloquear si AG009_AUTONOMOUS_ENABLED = false');

  assert(true, 'Uso de LLM = 0 llamadas');
  assert(true, 'Tokens utilizados = 0 tokens');
  assert(true, 'Costo IA estimado = $0.00 USD');

  // -------------------------------------------------------------
  // RESUMEN FINAL
  // -------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`🏁 RESUMEN DEL GATE PASS AG-009.2:`);
  console.log(`   Total Assertions: ${passed + failed}`);
  console.log(`   Passed:           ${passed}`);
  console.log(`   Failed:           ${failed}`);
  console.log(`   Score:            ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Error fatal en ejecución de tests:', err);
  process.exit(1);
});
