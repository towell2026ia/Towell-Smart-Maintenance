// test_dual_strategy_extractor.js
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const fileBuf = fs.readFileSync(path.join(__dirname, 'importar_excel', 'Segundas semana 33.xlsx'));
const wb = XLSX.read(fileBuf, { type: 'buffer' });

function ultraClean(str) {
  if (!str && str !== 0) return '';
  return str.toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/[\x00-\x1F\x7F-\x9F\u00A0\uFEFF\u200B]/g, ' ') // remove non-printable & special spaces
    .toLowerCase()
    .trim()
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ');
}

function normalizeExcelDateToISO(val) {
  if (!val && val !== 0) return null;
  if (typeof val === 'number') {
    const d = new Date(Math.round((val - 25569) * 86400 * 1000));
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  }
  if (val instanceof Date && !isNaN(val.getTime())) {
    return val.toISOString().split('T')[0];
  }
  if (typeof val === 'string') {
    const s = val.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.substring(0, 10);
    const parts = s.split(/[-/]/);
    if (parts.length === 3) {
      let p1 = parseInt(parts[0], 10);
      let p2 = parseInt(parts[1], 10);
      let y = parseInt(parts[2], 10);
      if (parts[0].length === 4) {
        y = parseInt(parts[0], 10);
        p1 = parseInt(parts[1], 10);
        p2 = parseInt(parts[2], 10);
      }
      if (y < 100) y += 2000;
      let month = p1;
      let day = p2;
      if (p1 > 12 && p2 <= 12) {
        day = p1;
        month = p2;
      }
      const parsed = new Date(y, month - 1, day);
      if (!isNaN(parsed.getTime())) {
        return `${y}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    }
  }
  return val ? String(val).trim() : null;
}

function parseSegundasRobust(ws, filename, idCarga) {
  const matrix = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  if (!matrix || matrix.length < 2) return [];

  // Find header row
  let headerRowIdx = 0;
  for (let r = 0; r < Math.min(matrix.length, 10); r++) {
    const row = matrix[r];
    if (!Array.isArray(row)) continue;
    const cleanCells = row.map(c => ultraClean(c));
    if (cleanCells.some(c => c.includes('produc')) && cleanCells.some(c => c.includes('fech')) && cleanCells.some(c => c.includes('defect'))) {
      headerRowIdx = r;
      break;
    }
  }

  const rawHeaders = matrix[headerRowIdx] || [];
  const cleanHeaders = rawHeaders.map(h => ultraClean(h));
  console.log('Detected clean headers:\n', cleanHeaders);

  // Helper to find column index with aliases
  const findCol = (aliases, defaultPos) => {
    for (const alias of aliases) {
      const target = ultraClean(alias);
      const idx = cleanHeaders.findIndex(h => h === target || h.includes(target) || target.includes(h));
      if (idx !== -1) return idx;
    }
    return defaultPos !== undefined ? defaultPos : -1;
  };

  const colIndex = {
    produccion: findCol(['produccion', 'op', 'orden produccion'], 0),
    fecha: findCol(['fecha', 'dia'], 1),
    codigo_bodega: findCol(['codigo de barras', 'codigo bodega', 'codigo barras', 'barras'], 2),
    codigo_articulo: findCol(['codigo de articulo', 'codigo articulo', 'cve articulo'], 3),
    nombre_articulo: findCol(['nombre del articulo', 'nombre articulo', 'descripcion articulo'], 4),
    configuracion: findCol(['configuracion', 'config'], 5),
    tamano: findCol(['tamano', 'tamanio', 'medida'], 6),
    color: findCol(['color'], 7),
    nombre: findCol(['nombre'], 8),
    almacen: findCol(['almacen', 'alm'], 9),
    numero_lote: findCol(['numero de lote', 'numero lote', 'lote'], 10),
    localidad: findCol(['localidad', 'telar', 'loc'], 11),
    salon: findCol(['salon', 'depto', 'departamento'], 12),
    numero_serie: findCol(['numero de serie', 'numero serie', 'serie'], 13),
    id_flog: findCol(['id flog', 'id_flog', 'flog'], 14),
    nombre_flog: 15,
    calidad_flog: findCol(['calidadflog', 'calidad flog', 'calidad'], 16),
    pzas_rollo: findCol(['pzas rollo', 'pzas_rollo', 'piezas rollo'], 17),
    kg_rollo: findCol(['kg rollo', 'kg_rollo', 'kilos'], 18),
    mts_rollo: findCol(['mts rollo', 'mts_rollo', 'metros'], 19),
    no_tiras: findCol(['no tiras', 'no_tiras', 'tiras'], 20),
    medida_1: findCol(['medida 1', 'medida_1'], 21),
    medida_2: findCol(['medida 2', 'medida_2'], 22),
    pzas_t1: findCol(['pzas t1', 'pzast1'], 23),
    pzas_t2: findCol(['pzas t2', 'pzast2'], 24),
    pzas_t3: findCol(['pzas t3', 'pzast3'], 25),
    pzas_t4: findCol(['pzas t4', 'pzast4'], 26),
    turno_tejido: findCol(['turno tejido', 'turno_tejido', 'turno'], 27),
    codigo_defecto: findCol(['codigo defecto', 'codigo_defecto', 'cve defecto'], 28),
    cantidad: findCol(['cantidad', 'cant', 'piezas'], 29),
    defecto: 30 // Defecto is always column 30 in standard sheet
  };

  console.log('\nFinal Resolved colIndex:\n', colIndex);

  const getCell = (row, idx) => {
    if (idx === undefined || idx < 0 || idx >= row.length) return '';
    const v = row[idx];
    return v !== undefined && v !== null ? String(v).trim() : '';
  };

  const stagingRows = [];
  for (let r = headerRowIdx + 1; r < matrix.length; r++) {
    const row = matrix[r];
    if (!Array.isArray(row)) continue;
    const hasData = row.some(c => c !== '' && c !== null && c !== undefined);
    if (!hasData) continue;

    const rawLocalidad = getCell(row, colIndex.localidad);
    const rawSalon = getCell(row, colIndex.salon) || 'Jacquard';
    const rawProduccion = getCell(row, colIndex.produccion);
    const rawFecha = getCell(row, colIndex.fecha);
    const rawDefecto = getCell(row, colIndex.defecto);
    const rawCodDefecto = getCell(row, colIndex.codigo_defecto) || 'DEF-01';
    const rawCantidad = getCell(row, colIndex.cantidad);
    const rawPzasRollo = getCell(row, colIndex.pzas_rollo);

    const isoFecha = normalizeExcelDateToISO(rawFecha) || '2026-08-11';
    const machineId = rawLocalidad ? (rawLocalidad.startsWith('TEL') || rawLocalidad.startsWith('TOW') ? rawLocalidad : `TELAR-${rawLocalidad}`) : 'TELAR-GENERICO';

    stagingRows.push({
      produccion: rawProduccion,
      fecha: isoFecha,
      codigo_bodega: getCell(row, colIndex.codigo_bodega),
      codigo_articulo: getCell(row, colIndex.codigo_articulo),
      nombre_articulo: getCell(row, colIndex.nombre_articulo),
      configuracion: getCell(row, colIndex.configuracion),
      tamano: getCell(row, colIndex.tamano),
      color: getCell(row, colIndex.color),
      nombre: getCell(row, colIndex.nombre),
      almacen: getCell(row, colIndex.almacen),
      numero_lote: getCell(row, colIndex.numero_lote),
      localidad: rawLocalidad,
      salon: rawSalon,
      numero_serie: getCell(row, colIndex.numero_serie),
      id_flog: getCell(row, colIndex.id_flog),
      nombre_flog: getCell(row, colIndex.nombre_flog),
      calidad_flog: getCell(row, colIndex.calidad_flog),
      pzas_rollo: parseFloat(rawPzasRollo) || 0,
      kg_rollo: parseFloat(getCell(row, colIndex.kg_rollo)) || 0,
      mts_rollo: parseFloat(getCell(row, colIndex.mts_rollo)) || 0,
      no_tiras: parseInt(getCell(row, colIndex.no_tiras)) || 0,
      medida_1: parseFloat(getCell(row, colIndex.medida_1)) || 0,
      medida_2: parseFloat(getCell(row, colIndex.medida_2)) || 0,
      pzas_t1: parseInt(getCell(row, colIndex.pzas_t1)) || 0,
      pzas_t2: parseInt(getCell(row, colIndex.pzas_t2)) || 0,
      pzas_t3: parseInt(getCell(row, colIndex.pzas_t3)) || 0,
      pzas_t4: parseInt(getCell(row, colIndex.pzas_t4)) || 0,
      turno_tejido: getCell(row, colIndex.turno_tejido) || '1',
      codigo_defecto: rawCodDefecto,
      cantidad: parseFloat(rawCantidad) || 1,
      defecto: rawDefecto || 'SEGUNDA CALIDAD',
      maquina_id_detectada: machineId,
      observaciones: '',
      id_carga: idCarga,
      archivo_origen: filename
    });
  }

  return stagingRows;
}

const ws = wb.Sheets['SEGUNDAS'];
const res = parseSegundasRobust(ws, 'Segundas semana 33.xlsx', 'test-id-carga');
console.log(`\nParsed ${res.length} rows.`);
console.log('Row 0:\n', JSON.stringify(res[0], null, 2));
console.log('Row 1:\n', JSON.stringify(res[1], null, 2));
console.log('Row 2:\n', JSON.stringify(res[2], null, 2));
