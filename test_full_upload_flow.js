// test_full_upload_flow.js
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const filePath = path.join(__dirname, 'importar_excel', 'Segundas semana 33.xlsx');
const fileBuf = fs.readFileSync(filePath);
const wb = XLSX.read(fileBuf, { type: 'buffer' });

function normalizeExcelDateToISO(val) {
  if (!val && val !== 0) return null;
  if (typeof val === 'number') {
    // Excel serial number
    const d = new Date(Math.round((val - 25569) * 86400 * 1000));
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
  }
  if (val instanceof Date) {
    if (!isNaN(val.getTime())) {
      return val.toISOString().split('T')[0];
    }
  }
  if (typeof val === 'string') {
    const s = val.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
      return s.substring(0, 10);
    }
    const parts = s.split(/[-/]/);
    if (parts.length === 3) {
      let d = parseInt(parts[0], 10);
      let m = parseInt(parts[1], 10);
      let y = parseInt(parts[2], 10);
      // Check if M/D/YY like 8/11/26
      if (parts[2].length === 2 || parts[2].length === 4) {
        // In Towell file, parts[0] is month (8), parts[1] is day (11), parts[2] is year (26 or 2026)
        // Let's check both possibilities (M/D/Y vs D/M/Y)
        let month = parseInt(parts[0], 10);
        let day = parseInt(parts[1], 10);
        let year = parseInt(parts[2], 10);
        if (year < 100) year += 2000;
        if (month > 12) { // D/M/Y
          const tmp = month;
          month = day;
          day = tmp;
        }
        const mm = String(month).padStart(2, '0');
        const dd = String(day).padStart(2, '0');
        return `${year}-${mm}-${dd}`;
      }
    }
  }
  return val ? String(val).trim() : null;
}

function cleanHelper(str) {
  if (!str && str !== 0) return '';
  return str.toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[\s\u00A0\uFEFF\u200B]+/g, ' ')
    .replace(/_/g, ' ');
}

// Emulate mapExcelRowToStaging
function mapExcelRowToStaging(rowObj, template) {
  const getVal = (possibleKeys) => {
    for (const pk of possibleKeys) {
      const pkClean = cleanHelper(pk);
      if (rowObj[pkClean] !== undefined && rowObj[pkClean] !== null && String(rowObj[pkClean]).trim() !== '') {
        return rowObj[pkClean];
      }
    }
    return null;
  };

  const rawFecha = getVal(['fecha', 'dia', 'fecha produccion']);
  const isoFecha = normalizeExcelDateToISO(rawFecha) || (new Date().toISOString().split('T')[0]);

  const candidateTelar = getVal(['localidad', 'salon', 'numero serie', 'numero_serie', 'numero de serie', 'nombre', 'produccion', 'telar', 'id flog']) || 'TELAR-01';
  const rawDefecto = getVal(['defecto', 'descripcion defecto', 'tipo defecto']) || 'DEFECTO GENERAL';
  const rawCodDefecto = getVal(['codigo defecto', 'codigo de defecto', 'cve defecto']) || 'DEF-01';
  const rawCantidad = getVal(['cantidad', 'cant', 'piezas defecto']) || '1';

  return {
    produccion: getVal(['produccion', 'telar', 'op']) || String(candidateTelar),
    fecha: isoFecha,
    codigo_bodega: getVal(['codigo de barras', 'codigo bodega', 'codigo_barras', 'codigo barras']) || '',
    codigo_articulo: getVal(['codigo de articulo', 'codigo articulo']) || '',
    nombre_articulo: getVal(['nombre del articulo', 'nombre articulo']) || '',
    configuracion: getVal(['configuracion']) || '',
    tamano: getVal(['tamano', 'tamanio']) || '',
    color: getVal(['color']) || '',
    nombre: getVal(['nombre']) || '',
    almacen: getVal(['almacen']) || '',
    numero_lote: getVal(['numero de lote', 'numero lote', 'lote']) || '',
    localidad: getVal(['localidad']) || String(candidateTelar),
    salon: getVal(['salon', 'depto']) || '',
    numero_serie: getVal(['numero de serie', 'numero serie']) || '',
    id_flog: getVal(['id flog', 'id_flog']) || '',
    nombre_flog: getVal(['nombre 1', 'nombre_1', 'nombre flog', 'nombre_flog']) || getVal(['nombre']) || '',
    calidad_flog: getVal(['calidadflog', 'calidad flog']) || '',
    pzas_rollo: parseFloat(getVal(['pzas rollo', 'pzas_rollo', 'piezas'])) || 0,
    kg_rollo: parseFloat(getVal(['kg rollo', 'kg_rollo'])) || 0,
    mts_rollo: parseFloat(getVal(['mts rollo', 'mts_rollo'])) || 0,
    no_tiras: parseInt(getVal(['no tiras', 'no_tiras'])) || 0,
    medida_1: parseFloat(getVal(['medida 1', 'medida_1'])) || 0,
    medida_2: parseFloat(getVal(['medida 2', 'medida_2'])) || 0,
    pzas_t1: parseInt(getVal(['pzas t1', 'pzas_t1'])) || 0,
    pzas_t2: parseInt(getVal(['pzas t2', 'pzas_t2'])) || 0,
    pzas_t3: parseInt(getVal(['pzas t3', 'pzas_t3'])) || 0,
    pzas_t4: parseInt(getVal(['pzas t4', 'pzas_t4'])) || 0,
    turno_tejido: getVal(['turno tejido', 'turno']) || '1',
    codigo_defecto: String(rawCodDefecto),
    cantidad: parseFloat(rawCantidad) || 0,
    defecto: String(rawDefecto),
    maquina_id_detectada: String(candidateTelar),
    observaciones: getVal(['observaciones', 'comentario']) || ''
  };
}

// Run parser
const rawMatrix = XLSX.utils.sheet_to_json(wb.Sheets['SEGUNDAS'], { header: 1, raw: false, defval: '' });
const rawHeaders = rawMatrix[0];
const cleanHeaders = rawHeaders.map((h, colIdx) => cleanHelper(h));

console.log('Clean Headers from Row 0:\n', cleanHeaders);

const stagingRows = [];
for (let r = 1; r < rawMatrix.length; r++) {
  const row = rawMatrix[r];
  const rowObj = {};
  for (let c = 0; c < cleanHeaders.length; c++) {
    rowObj[cleanHeaders[c]] = row[c] !== undefined ? row[c] : '';
  }
  const mapped = mapExcelRowToStaging(rowObj, 'segundas');
  stagingRows.push(mapped);
}

console.log(`\nParsed ${stagingRows.length} rows.`);
console.log('Sample Row 0:\n', stagingRows[0]);
console.log('Sample Row 1:\n', stagingRows[1]);
console.log('Sample Row 2:\n', stagingRows[2]);
