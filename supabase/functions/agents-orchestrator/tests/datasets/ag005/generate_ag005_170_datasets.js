// supabase/functions/agents-orchestrator/tests/datasets/ag005/generate_ag005_170_datasets.js
// Generator script for 170 AG-005 Evaluation Cases (60% Train / 20% Val / 20% Holdout)

const fs = require('fs');
const path = require('path');

const SOURCES = ['MAQUINAS', 'TELEGRAM', 'REFACCIONES', 'FALLAS', 'SEGUNDAS'];
const MACHINES = ['TOW-TEL201-TEJI', 'TOW-TEL202-TEJI', 'TOW-LOG1-COST', 'TOW-TIN1-TINT', 'TOW-AUX1-AUX', 'TEL-01', 'TEL-201'];
const DEPTS = ['PF', 'CF', 'TF', 'AF'];

function makeValidRows(source, count) {
  const rows = [];
  for (let i = 1; i <= count; i++) {
    if (source === 'MAQUINAS') {
      rows.push({ "EQUIPO TOWELL": `TOW-TEL20${i}-TEJI`, "Clave": `TEL20${i}` });
    } else if (source === 'TELEGRAM') {
      rows.push({
        "id": 1000 + i,
        "folio": `TG-PF000${String(i).padStart(2, '0')}`,
        "estatus": "Cerrada",
        "fecha": `2026-08-${String((i % 28) + 1).padStart(2, '0')}`,
        "depto": DEPTS[i % DEPTS.length],
        "maquina_id": MACHINES[i % MACHINES.length],
        "falla": `Falla generada de prueba ${i}`
      });
    } else if (source === 'REFACCIONES') {
      rows.push({
        "Fecha": `2026-08-${String((i % 28) + 1).padStart(2, '0')}`,
        "Destino": MACHINES[i % MACHINES.length],
        "Código de Artículo": `REF-${String(i).padStart(3, '0')}`,
        "Nombre del Artículo": `Artículo Refacción ${i}`,
        "Cantidad": i,
        "Precio de Costo": 100.0 * i,
        "Importe de Costo": 100.0 * i * i
      });
    } else if (source === 'FALLAS') {
      rows.push({
        "Descripción": `Descripción de falla histórica ${i}`,
        "Creada": `2026-08-${String((i % 28) + 1).padStart(2, '0')}T10:00:00Z`
      });
    } else if (source === 'SEGUNDAS') {
      rows.push({
        "produccion": `PROD-2026-${i}`,
        "fecha": `2026-08-${String((i % 28) + 1).padStart(2, '0')}`,
        "numero_serie": `SER-900${i}`,
        "codigo_defecto": `DEF-0${(i % 5) + 1}`,
        "cantidad": i,
        "defecto": `Defecto de calidad en rollo ${i}`
      });
    }
  }
  return rows;
}

function getHeaders(source) {
  if (source === 'MAQUINAS') return ["EQUIPO TOWELL", "Clave"];
  if (source === 'TELEGRAM') return ["id", "folio", "estatus", "fecha", "hora", "depto", "maquina_id", "tipofallaid", "falla", "horafin", "cveempl", "nomempl", "turno", "cveatendio", "nomatendio", "turnoatendio", "obs", "ordentrabajo", "descripcion", "enviado", "obscierre", "calidad", "fechafin"];
  if (source === 'REFACCIONES') return ["Fecha", "Destino", "Código de Artículo", "Nombre del Artículo", "Cantidad", "Precio de Costo", "Importe de Costo"];
  if (source === 'FALLAS') return ["Descripción", "Creada"];
  if (source === 'SEGUNDAS') return ["produccion", "fecha", "codigo_bodega", "codigo_articulo", "nombre_articulo", "configuracion", "tamano", "color", "nombre", "almacen", "numero_lote", "localidad", "salon", "numero_serie", "id_flog", "nombre_flog", "calidad_flog", "pzas_rollo", "kg_rollo", "mts_rollo", "no_tiras", "medida_1", "medida_2", "turno_tejido", "codigo_defecto", "cantidad", "defecto"];
  return [];
}

function getRequiredHeaders(source) {
  if (source === 'MAQUINAS') return ["EQUIPO TOWELL"];
  if (source === 'TELEGRAM') return ["folio", "fecha", "maquina_id", "depto", "falla"];
  if (source === 'REFACCIONES') return ["Código de Artículo", "Nombre del Artículo", "Cantidad", "Precio de Costo"];
  if (source === 'FALLAS') return ["Descripción", "Creada"];
  if (source === 'SEGUNDAS') return ["produccion", "fecha", "numero_serie", "codigo_defecto", "cantidad", "defecto"];
  return [];
}

const allCases = [];
let caseCounter = 1;

// 1. Archivos válidos (30 casos)
for (let i = 1; i <= 30; i++) {
  const source = SOURCES[(i - 1) % SOURCES.length];
  allCases.push({
    case_id: `AG005-CASE-${String(caseCounter++).padStart(3, '0')}`,
    category: "VALID_FILE",
    source_type: source,
    payload: {
      source_type: source,
      nombre_archivo: `valid_${source.toLowerCase()}_${i}.xlsx`,
      headers: getHeaders(source),
      rows: makeValidRows(source, 2)
    },
    expected: { status: "VALIDATION_SUCCESS", can_promote: true, schema_id: source },
    critical: false
  });
}

// 2. Estructura incorrecta (25 casos)
for (let i = 1; i <= 25; i++) {
  const source = SOURCES[(i - 1) % SOURCES.length];
  const reqCols = getRequiredHeaders(source);
  const targetReq = reqCols[0]; // explicitly remove a required column
  const headers = getHeaders(source).filter(h => h.toLowerCase() !== targetReq.toLowerCase());
  
  allCases.push({
    case_id: `AG005-CASE-${String(caseCounter++).padStart(3, '0')}`,
    category: "INVALID_STRUCTURE",
    source_type: source,
    payload: {
      source_type: source,
      nombre_archivo: `invalid_struct_${source.toLowerCase()}_${i}.xlsx`,
      headers: headers,
      rows: makeValidRows(source, 1)
    },
    expected: { status: "VALIDATION_REJECTED", can_promote: false, code: "MISSING_REQUIRED_COLUMN" },
    critical: true
  });
}

// 3. Datos inválidos (30 casos)
for (let i = 1; i <= 30; i++) {
  const source = SOURCES[(i - 1) % SOURCES.length];
  const rows = makeValidRows(source, 1);
  if (source === 'REFACCIONES') {
    rows[0]["Cantidad"] = "INVALID_NUMBER_XYZ";
  } else if (source === 'FALLAS') {
    rows[0]["Creada"] = "INVALID_DATE_XYZ";
  } else if (source === 'TELEGRAM') {
    rows[0]["fecha"] = "FECHA_INVALIDA_2026";
  } else if (source === 'SEGUNDAS') {
    rows[0]["cantidad"] = "CANTIDAD_NUL_ABC";
  } else if (source === 'MAQUINAS') {
    rows[0]["EQUIPO TOWELL"] = null; // empty required
  }
  allCases.push({
    case_id: `AG005-CASE-${String(caseCounter++).padStart(3, '0')}`,
    category: "INVALID_DATA",
    source_type: source,
    payload: {
      source_type: source,
      nombre_archivo: `invalid_data_${source.toLowerCase()}_${i}.xlsx`,
      headers: getHeaders(source),
      rows: rows
    },
    expected: { status: "VALIDATION_REJECTED", can_promote: false },
    critical: true
  });
}

// 4. Relaciones / catálogos (25 casos)
for (let i = 1; i <= 25; i++) {
  const source = SOURCES[(i - 1) % SOURCES.length];
  const rows = makeValidRows(source, 1);
  if (source === 'TELEGRAM') {
    rows[0]["maquina_id"] = `MAQ-INEXISTENTE-${i}`;
  } else if (source === 'REFACCIONES') {
    rows[0]["Destino"] = `MAQ-DESCONOCIDA-${i}`;
  } else if (source === 'SEGUNDAS') {
    rows[0]["localidad"] = `MAQ-INEXISTENTE-BODEGA-${i}`;
  } else {
    rows[0]["EQUIPO TOWELL"] = `EQUIPO-INEXISTENTE-${i}`;
  }
  allCases.push({
    case_id: `AG005-CASE-${String(caseCounter++).padStart(3, '0')}`,
    category: "CATALOG_MISSING",
    source_type: source,
    payload: {
      source_type: source,
      nombre_archivo: `missing_catalog_${source.toLowerCase()}_${i}.xlsx`,
      headers: getHeaders(source),
      rows: rows
    },
    expected: { status: "VALIDATION_REJECTED", can_promote: false, code: "MACHINE_NOT_FOUND" },
    critical: true
  });
}

// 5. Duplicados / idempotencia (25 casos)
for (let i = 1; i <= 25; i++) {
  const source = SOURCES[(i - 1) % SOURCES.length];
  const validRows = makeValidRows(source, 1);
  const rows = [validRows[0], validRows[0]]; // duplicate row
  allCases.push({
    case_id: `AG005-CASE-${String(caseCounter++).padStart(3, '0')}`,
    category: "DUPLICATE_ROW",
    source_type: source,
    payload: {
      source_type: source,
      nombre_archivo: `duplicate_rows_${source.toLowerCase()}_${i}.xlsx`,
      headers: getHeaders(source),
      rows: rows
    },
    expected: { status: "VALIDATION_WITH_WARNINGS", can_promote: true, code: "DUPLICATE_EXACT" },
    critical: true
  });
}

// 6. Casos ambiguos / schema desconocido (20 casos)
for (let i = 1; i <= 20; i++) {
  allCases.push({
    case_id: `AG005-CASE-${String(caseCounter++).padStart(3, '0')}`,
    category: "UNKNOWN_SCHEMA",
    source_type: "UNKNOWN",
    payload: {
      nombre_archivo: `ambiguous_schema_${i}.xlsx`,
      headers: [`columna_ambigua_${i}_a`, `columna_ambigua_${i}_b`],
      rows: [{ [`columna_ambigua_${i}_a`]: "valor_ambiguo" }]
    },
    expected: { status: "UNKNOWN_SCHEMA", can_promote: false },
    critical: false
  });
}

// 7. Seguridad / manipulación (15 casos)
const attackFlags = ['skip_validation', 'force_insert', 'destination_table', 'override_schema', 'allow_invalid_machines'];
for (let i = 1; i <= 15; i++) {
  const source = SOURCES[(i - 1) % SOURCES.length];
  const flag = attackFlags[(i - 1) % attackFlags.length];
  const payload = {
    source_type: source,
    nombre_archivo: `security_attack_${i}.xlsx`,
    headers: getHeaders(source),
    rows: makeValidRows(source, 1)
  };
  payload[flag] = true;

  allCases.push({
    case_id: `AG005-CASE-${String(caseCounter++).padStart(3, '0')}`,
    category: "SECURITY_ATTACK",
    source_type: source,
    payload: payload,
    expected: { status: "INVALID_PAYLOAD", can_promote: false, code: "INVALID_PAYLOAD" },
    critical: true
  });
}

console.log(`Generated total cases: ${allCases.length}`);

const trainingCases = allCases.slice(0, 102);
const validationCases = allCases.slice(102, 136);
const holdoutCases = allCases.slice(136, 170);

const targetDir = __dirname;
fs.writeFileSync(path.join(targetDir, 'ag005-training.json'), JSON.stringify(trainingCases, null, 2), 'utf8');
fs.writeFileSync(path.join(targetDir, 'ag005-validation.json'), JSON.stringify(validationCases, null, 2), 'utf8');
fs.writeFileSync(path.join(targetDir, 'ag005-final-evaluation.json'), JSON.stringify(holdoutCases, null, 2), 'utf8');

console.log(`✅ Datasets written successfully:`);
console.log(` - Training (60%): ${trainingCases.length} cases`);
console.log(` - Validation (20%): ${validationCases.length} cases`);
console.log(` - Holdout (20%): ${holdoutCases.length} cases`);
