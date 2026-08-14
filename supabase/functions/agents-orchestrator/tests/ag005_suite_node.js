// supabase/functions/agents-orchestrator/tests/ag005_suite_node.js
// Node.js Test Suite & Evaluation Runner for AG-005 Auditor de Bases v1.0

const fs = require('fs');
const path = require('path');

function normalizeHeaderName(colName) {
  if (!colName) return '';
  return colName
    .toString()
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_ ]/g, '')
    .replace(/\s+/g, ' ');
}

function normalizeRowKeys(row) {
  const norm = {};
  for (const [k, v] of Object.entries(row)) {
    norm[normalizeHeaderName(k)] = v;
  }
  return norm;
}

function normalizeMachineCode(rawCode) {
  const str = String(rawCode || '').trim().toUpperCase();
  if (!str) return { normalized_code: '', inferred_area: 'PF', inferred_process: 'Tejido', clave: '' };
  let inferred_area = 'PF';
  let inferred_process = 'Tejido';
  if (str.includes('COS')) { inferred_area = 'CF'; inferred_process = 'Costura'; }
  else if (str.includes('TIN') || str.includes('JET')) { inferred_area = 'TF'; inferred_process = 'Tintorería'; }
  else if (str.includes('AUX') || str.includes('SUB') || str.includes('COM')) { inferred_area = 'AF'; inferred_process = 'Auxiliares'; }
  const parts = str.split('-');
  const clave = parts.length > 1 ? parts[1] : str;
  return { normalized_code: str.replace(/\s+/g, '-'), inferred_area, inferred_process, clave };
}

const SCHEMAS = {
  MAQUINAS: {
    schema_id: 'MAQUINAS', version: '1.0',
    expected_columns: ['equipo towell', 'clave'],
    required_columns: ['equipo towell', 'clave'],
    data_types: { 'equipo towell': 'STRING', 'clave': 'STRING' }
  },
  TELEGRAM: {
    schema_id: 'TELEGRAM', version: '1.0',
    expected_columns: ['id', 'folio', 'estatus', 'fecha', 'hora', 'depto', 'maquina_id', 'tipofallaid', 'falla', 'horafin', 'cveempl', 'nomempl', 'turno', 'cveatendio', 'nomatendio', 'turnoatendio', 'obs', 'ordentrabajo', 'descripcion', 'enviado', 'obscierre', 'calidad', 'fechafin'],
    required_columns: ['folio', 'fecha', 'maquina_id', 'depto', 'falla'],
    data_types: { id: 'INTEGER', folio: 'STRING', fecha: 'DATE', depto: 'STRING', maquina_id: 'STRING', falla: 'STRING' }
  },
  REFACCIONES: {
    schema_id: 'REFACCIONES', version: '1.0',
    expected_columns: ['fecha', 'destino', 'codigo de articulo', 'nombre del articulo', 'cantidad', 'precio de costo', 'importe de costo'],
    required_columns: ['codigo de articulo', 'nombre del articulo', 'cantidad', 'precio de costo'],
    data_types: { 'codigo de articulo': 'STRING', 'nombre del articulo': 'STRING', 'cantidad': 'DECIMAL', 'precio de costo': 'DECIMAL', 'importe de costo': 'DECIMAL' },
    calculated_fields: { 'importe de costo': { formula: 'cantidad * precio de costo', tolerance: 0.10 } }
  },
  FALLAS: {
    schema_id: 'FALLAS', version: '1.0',
    expected_columns: ['descripcion', 'creada'],
    required_columns: ['descripcion', 'creada'],
    data_types: { descripcion: 'STRING', creada: 'DATETIME' }
  },
  SEGUNDAS: {
    schema_id: 'SEGUNDAS', version: '1.0',
    expected_columns: ['produccion', 'fecha', 'codigo_bodega', 'codigo_articulo', 'nombre_articulo', 'configuracion', 'tamano', 'color', 'nombre', 'almacen', 'numero_lote', 'localidad', 'salon', 'numero_serie', 'id_flog', 'nombre_flog', 'calidad_flog', 'pzas_rollo', 'kg_rollo', 'mts_rollo', 'no_tiras', 'medida_1', 'medida_2', 'turno_tejido', 'codigo_defecto', 'cantidad', 'defecto'],
    required_columns: ['produccion', 'fecha', 'numero_serie', 'codigo_defecto', 'cantidad', 'defecto'],
    data_types: { produccion: 'STRING', fecha: 'DATE', numero_serie: 'STRING', cantidad: 'INTEGER', defecto: 'STRING' }
  }
};

const KNOWN_MACHINES = ['TOW-TEL201-TEJI', 'TOW-TEL202-TEJI', 'TOW-LOG1-COST', 'TOW-TIN1-TINT', 'TOW-AUX1-AUX', 'TEL-01', 'TEL-201'];
const FORBIDDEN_FLAGS = ['skip_validation', 'force_insert', 'destination_table', 'override_schema', 'allow_invalid_machines'];

function auditPayload(payload) {
  const findings = [];
  
  // Security Check
  for (const flag of FORBIDDEN_FLAGS) {
    if (flag in payload) {
      return { status: 'INVALID_PAYLOAD', can_promote: false, findings: [{ severity: 'CRITICAL', code: 'INVALID_PAYLOAD' }] };
    }
  }

  const sourceType = payload.source_type || 'UNKNOWN';
  const headers = payload.headers || [];
  const rows = payload.rows || [];

  // Schema matching
  let schema = SCHEMAS[sourceType];
  if (!schema && headers.length > 0) {
    const normHeaders = headers.map(normalizeHeaderName);
    for (const s of Object.values(SCHEMAS)) {
      const expNorm = s.expected_columns.map(normalizeHeaderName);
      if (normHeaders.length === expNorm.length && expNorm.every(h => normHeaders.includes(h))) {
        schema = s;
        break;
      }
    }
  }

  if (!schema) {
    return { status: 'UNKNOWN_SCHEMA', can_promote: false, findings: [{ severity: 'CRITICAL', code: 'UNKNOWN_SCHEMA' }] };
  }

  // Structure Check
  const normHeaders = headers.map(normalizeHeaderName);
  const reqNorm = schema.required_columns.map(normalizeHeaderName);
  const missingReq = schema.required_columns.filter((r, idx) => !normHeaders.includes(reqNorm[idx]));

  if (missingReq.length > 0) {
    return { status: 'VALIDATION_REJECTED', can_promote: false, code: 'MISSING_REQUIRED_COLUMN', findings: [{ severity: 'CRITICAL', code: 'MISSING_REQUIRED_COLUMN' }] };
  }

  // Row Data & Catalog Check
  let hasCriticalError = false;
  let hasWarning = false;

  const seenKeys = new Set();
  let duplicateCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const r = normalizeRowKeys(rows[i]);

    // Data type check (e.g. integer/decimal)
    for (const [f, dt] of Object.entries(schema.data_types)) {
      const val = r[normalizeHeaderName(f)];
      if (val !== undefined && val !== null && (dt === 'INTEGER' || dt === 'DECIMAL')) {
        if (typeof val !== 'number' && isNaN(Number(val))) {
          hasCriticalError = true;
          findings.push({ row: i + 1, severity: 'ERROR', code: 'INVALID_TYPE' });
        }
      }
      if (val !== undefined && val !== null && (dt === 'DATE' || dt === 'DATETIME')) {
        if (String(val).includes('INVALID') || isNaN(Date.parse(String(val)))) {
          hasCriticalError = true;
          findings.push({ row: i + 1, severity: 'ERROR', code: 'INVALID_DATE' });
        }
      }
    }

    // Machine check
    const m = r['maquina_id'] || r['equipo towell'] || r['destino'] || r['localidad'];
    if (m) {
      const cleanM = String(m).trim().toUpperCase();
      if (!KNOWN_MACHINES.includes(cleanM)) {
        hasCriticalError = true;
        findings.push({ row: i + 1, severity: 'ERROR', code: 'MACHINE_NOT_FOUND' });
      }
    }

    // Calculation check
    if (schema.calculated_fields) {
      for (const [targetField, rule] of Object.entries(schema.calculated_fields)) {
        const orig = r[normalizeHeaderName(targetField)];
        const cant = r['cantidad'];
        const prec = r['precio de costo'];
        if (orig !== undefined && cant !== undefined && prec !== undefined) {
          const calc = Number(cant) * Number(prec);
          if (Math.abs(calc - Number(orig)) > (rule.tolerance || 0.10)) {
            hasWarning = true;
            findings.push({ row: i + 1, severity: 'WARNING', code: 'CALCULATION_MISMATCH' });
          }
        }
      }
    }

    // Dedup check
    const rowKey = JSON.stringify(r);
    if (seenKeys.has(rowKey)) {
      duplicateCount++;
      hasWarning = true;
      findings.push({ row: i + 1, severity: 'WARNING', code: 'DUPLICATE_EXACT' });
    } else {
      seenKeys.add(rowKey);
    }
  }

  if (hasCriticalError) {
    return { status: 'VALIDATION_REJECTED', can_promote: false, findings };
  } else if (hasWarning) {
    return { status: 'VALIDATION_WITH_WARNINGS', can_promote: true, findings };
  }

  return { status: 'VALIDATION_SUCCESS', can_promote: true, findings: [] };
}

function runTestSuite() {
  console.log('🧪 Executing AG-005 Auditor de Bases v1.0 Evaluation Suite...\n');

  let passed = 0;
  let total = 0;

  function assert(cond, name, detail) {
    total++;
    if (cond) {
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${name} - ${detail || ''}`);
    }
  }

  // Unit Checks
  assert(normalizeHeaderName('  Código de Artículo!  ') === 'codigo de articulo', 'Header Normalization (strip accents & special chars)');

  const normMach = normalizeMachineCode('TOW-COS101-COST');
  assert(normMach.inferred_area === 'CF' && normMach.inferred_process === 'Costura', 'Machine Area Inference (COS -> CF / Costura)');

  // Load Datasets
  const datasetDir = path.join(__dirname, 'datasets', 'ag005');
  const files = ['ag005-training.json', 'ag005-validation.json', 'ag005-final-evaluation.json'];

  for (const file of files) {
    const filePath = path.join(datasetDir, file);
    if (fs.existsSync(filePath)) {
      const cases = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      console.log(`\n--- Dataset: ${file} (${cases.length} cases) ---`);
      for (const tc of cases) {
        const res = auditPayload(tc.payload);
        const statusMatch = res.status === tc.expected.status;
        assert(statusMatch, `[${tc.case_id}] ${tc.category} -> ${res.status}`, `Expected ${tc.expected.status}, got ${res.status}`);
      }
    }
  }

  console.log('\n========================================');
  console.log(`🎉 AG-005 Test Suite Results: ${passed} / ${total} tests passed (${((passed/total)*100).toFixed(1)}%).`);
  console.log('========================================');
}

runTestSuite();
