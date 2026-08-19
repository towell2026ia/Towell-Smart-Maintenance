// test_precision_extractor.js
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const filePath = path.join(__dirname, 'importar_excel', 'Segundas semana 33.xlsx');
const fileBuf = fs.readFileSync(filePath);
const wb = XLSX.read(fileBuf, { type: 'buffer' });

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

function cleanStr(str) {
  if (!str && str !== 0) return '';
  return str.toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[\s\u00A0\uFEFF\u200B]+/g, ' ')
    .replace(/_/g, ' ');
}

function parseSegundasFromMatrix(matrix, filename, idCarga) {
  if (!matrix || matrix.length < 2) return [];

  // Find header row by exact match
  let headerRowIdx = 0;
  for (let r = 0; r < Math.min(matrix.length, 10); r++) {
    const row = matrix[r];
    if (!Array.isArray(row)) continue;
    const cleanCells = row.map(c => cleanStr(c));
    if (cleanCells.includes('produccion') && cleanCells.includes('fecha') && cleanCells.includes('defecto')) {
      headerRowIdx = r;
      break;
    }
  }

  const rawHeaders = matrix[headerRowIdx];
  const colIndex = {};
  
  // Exact mapping by position or name
  rawHeaders.forEach((h, idx) => {
    const c = cleanStr(h);
    if (c === 'produccion') colIndex.produccion = idx;
    else if (c === 'fecha') colIndex.fecha = idx;
    else if (c === 'codigo de barras' || c === 'codigo bodega') colIndex.codigo_bodega = idx;
    else if (c === 'codigo de articulo' || c === 'codigo articulo') colIndex.codigo_articulo = idx;
    else if (c === 'nombre del articulo' || c === 'nombre articulo') colIndex.nombre_articulo = idx;
    else if (c === 'configuracion') colIndex.configuracion = idx;
    else if (c === 'tamano' || c === 'tamanio') colIndex.tamano = idx;
    else if (c === 'color') colIndex.color = idx;
    else if (c === 'nombre' && colIndex.nombre === undefined) colIndex.nombre = idx; // 1st Nombre (Articulo/Color description)
    else if (c === 'almacen') colIndex.almacen = idx;
    else if (c === 'numero de lote' || c === 'numero lote' || c === 'lote') colIndex.numero_lote = idx;
    else if (c === 'localidad') colIndex.localidad = idx;
    else if (c === 'salon' || c === 'depto') colIndex.salon = idx;
    else if (c === 'numero de serie' || c === 'numero serie' || c === 'serie') colIndex.numero_serie = idx;
    else if (c === 'id flog' || c === 'id_flog') colIndex.id_flog = idx;
    else if (c === 'nombre' && colIndex.nombre !== undefined) colIndex.nombre_flog = idx; // 2nd Nombre (FLOG / Operador)
    else if (c === 'calidadflog' || c === 'calidad flog') colIndex.calidad_flog = idx;
    else if (c === 'pzas rollo' || c === 'pzas_rollo') colIndex.pzas_rollo = idx;
    else if (c === 'kg rollo' || c === 'kg_rollo') colIndex.kg_rollo = idx;
    else if (c === 'mts rollo' || c === 'mts_rollo') colIndex.mts_rollo = idx;
    else if (c === 'no tiras' || c === 'no_tiras') colIndex.no_tiras = idx;
    else if (c === 'medida 1' || c === 'medida_1') colIndex.medida_1 = idx;
    else if (c === 'medida 2' || c === 'medida_2') colIndex.medida_2 = idx;
    else if (c === 'pzas t1' || c === 'pzast1') colIndex.pzas_t1 = idx;
    else if (c === 'pzas t2' || c === 'pzast2') colIndex.pzas_t2 = idx;
    else if (c === 'pzas t3' || c === 'pzast3') colIndex.pzas_t3 = idx;
    else if (c === 'pzas t4' || c === 'pzast4') colIndex.pzas_t4 = idx;
    else if (c === 'turno tejido' || c === 'turno') colIndex.turno_tejido = idx;
    else if (c === 'codigo defecto' || c === 'codigo_defecto') colIndex.codigo_defecto = idx;
    else if (c === 'cantidad' || c === 'cant') colIndex.cantidad = idx;
    else if (c === 'defecto') colIndex.defecto = idx;
  });

  console.log('Exact Resolved Column Map:\n', colIndex);

  const getValAt = (row, idx) => {
    if (idx === undefined || idx < 0 || idx >= row.length) return '';
    const v = row[idx];
    return v !== undefined && v !== null ? String(v).trim() : '';
  };

  const stagingRows = [];
  for (let r = headerRowIdx + 1; r < matrix.length; r++) {
    const row = matrix[r];
    if (!Array.isArray(row)) continue;
    
    // Check if row has any content
    const hasData = row.some(c => c !== '' && c !== null && c !== undefined);
    if (!hasData) continue;

    const rawLocalidad = getValAt(row, colIndex.localidad);
    const rawSalon = getValAt(row, colIndex.salon) || 'Jacquard';
    const rawProduccion = getValAt(row, colIndex.produccion);
    const rawFecha = getValAt(row, colIndex.fecha);
    const rawDefecto = getValAt(row, colIndex.defecto);
    const rawCodDefecto = getValAt(row, colIndex.codigo_defecto) || 'DEF-01';
    const rawCantidad = getValAt(row, colIndex.cantidad);
    const rawPzasRollo = getValAt(row, colIndex.pzas_rollo);

    const isoFecha = normalizeExcelDateToISO(rawFecha) || '2026-08-11';
    
    // Machine identification: Jacquard / Tejido loom (e.g. 202 -> TELAR-202)
    const machineId = rawLocalidad ? (rawLocalidad.startsWith('TEL') || rawLocalidad.startsWith('TOW') ? rawLocalidad : `TELAR-${rawLocalidad}`) : 'TELAR-GENERICO';

    stagingRows.push({
      produccion: rawProduccion,
      fecha: isoFecha,
      codigo_bodega: getValAt(row, colIndex.codigo_bodega),
      codigo_articulo: getValAt(row, colIndex.codigo_articulo),
      nombre_articulo: getValAt(row, colIndex.nombre_articulo),
      configuracion: getValAt(row, colIndex.configuracion),
      tamano: getValAt(row, colIndex.tamano),
      color: getValAt(row, colIndex.color),
      nombre: getValAt(row, colIndex.nombre),
      almacen: getValAt(row, colIndex.almacen),
      numero_lote: getValAt(row, colIndex.numero_lote),
      localidad: rawLocalidad,
      salon: rawSalon,
      numero_serie: getValAt(row, colIndex.numero_serie),
      id_flog: getValAt(row, colIndex.id_flog),
      nombre_flog: getValAt(row, colIndex.nombre_flog),
      calidad_flog: getValAt(row, colIndex.calidad_flog),
      pzas_rollo: parseFloat(rawPzasRollo) || 0,
      kg_rollo: parseFloat(getValAt(row, colIndex.kg_rollo)) || 0,
      mts_rollo: parseFloat(getValAt(row, colIndex.mts_rollo)) || 0,
      no_tiras: parseInt(getValAt(row, colIndex.no_tiras)) || 0,
      medida_1: parseFloat(getValAt(row, colIndex.medida_1)) || 0,
      medida_2: parseFloat(getValAt(row, colIndex.medida_2)) || 0,
      pzas_t1: parseInt(getValAt(row, colIndex.pzas_t1)) || 0,
      pzas_t2: parseInt(getValAt(row, colIndex.pzas_t2)) || 0,
      pzas_t3: parseInt(getValAt(row, colIndex.pzas_t3)) || 0,
      pzas_t4: parseInt(getValAt(row, colIndex.pzas_t4)) || 0,
      turno_tejido: getValAt(row, colIndex.turno_tejido) || '1',
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
const mat = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' });
const parsed = parseSegundasFromMatrix(mat, 'Segundas semana 33.xlsx', 'test-id-carga');
console.log(`\nSuccessfully parsed ${parsed.length} rows.`);
console.log('Row 0:\n', JSON.stringify(parsed[0], null, 2));
console.log('Row 1:\n', JSON.stringify(parsed[1], null, 2));
console.log('Row 2:\n', JSON.stringify(parsed[2], null, 2));
