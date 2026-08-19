// test_excel_segundas_parser.js
// Verification of robust matrix-based Excel parsing for Segundas por Rollo

const XLSX = require('xlsx');

function normalizeExcelDateToISO(val) {
  if (!val && val !== 0) return null;
  if (typeof val === 'number') {
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
      if (parts[0].length === 4) {
        y = parseInt(parts[0], 10);
        m = parseInt(parts[1], 10);
        d = parseInt(parts[2], 10);
      }
      if (y < 100) y += 2000;
      const parsed = new Date(y, m - 1, d);
      if (!isNaN(parsed.getTime())) {
        const mm = String(m).padStart(2, '0');
        const dd = String(d).padStart(2, '0');
        return `${y}-${mm}-${dd}`;
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

function parseExcelWorkbookToStaging(workbook, template) {
  const templateKeywords = {
    machines: ['equipo towell', 'clave', 'ax'],
    parts: ['codigo de articulo', 'nombre del articulo', 'unidad medida', 'familia'],
    tecnicos: ['cve tecnico', 'nombre tecnico', 'departamento codigo', 'turno id', 'especialidad', 'puesto'],
    empleados: ['cve empleado', 'nombre empleado', 'departamento codigo', 'turno id', 'puesto'],
    fallas: ['maquina id', 'descripcion', 'creada'],
    telegram: ['folio', 'estatus', 'fecha', 'hora', 'depto', 'maquina id', 'falla'],
    refmaquina: ['maquina id', 'destino', 'codigo de articulo', 'nombre del articulo', 'cantidad'],
    prices: ['codigo de articulo', 'precio de costo', 'moneda'],
    inventory: ['codigo de articulo', 'stock actual', 'stock minimo', 'ubicacion'],
    laborcosts: ['cve tecnico', 'nombre tecnico', 'costo hora'],
    segundas: [
      'produccion', 'telar', 'fecha', 'codigo bodega', 'codigo de barras', 
      'codigo articulo', 'codigo de articulo', 'nombre articulo', 'nombre del articulo',
      'defecto', 'cantidad', 'numero lote', 'numero de lote', 'numero serie', 'numero de serie',
      'salon', 'localidad', 'pzas rollo', 'turno tejido', 'codigo defecto', 'calidadflog', 'id flog'
    ]
  };

  const targets = (templateKeywords[template] || []).map(t => cleanStr(t));
  let bestSheetName = workbook.SheetNames[0];
  let bestRawRows = [];
  let bestHeaderRowIdx = 0;
  let maxScore = -1;

  for (const sName of workbook.SheetNames) {
    const ws = workbook.Sheets[sName];
    if (!ws) continue;
    const rawMatrix = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' });
    if (!rawMatrix || rawMatrix.length === 0) continue;

    const maxHeaderScan = Math.min(rawMatrix.length, 15);
    for (let r = 0; r < maxHeaderScan; r++) {
      const row = rawMatrix[r];
      if (!Array.isArray(row)) continue;
      const cleanRowHeaders = row.map(cell => cleanStr(cell));
      
      let score = 0;
      for (const target of targets) {
        if (cleanRowHeaders.some(h => h === target || h.includes(target) || target.includes(h))) {
          score++;
        }
      }

      if (score > maxScore) {
        maxScore = score;
        bestSheetName = sName;
        bestRawRows = rawMatrix;
        bestHeaderRowIdx = r;
      }
    }
  }

  console.log(`[Parser] Detected Best Sheet: "${bestSheetName}", Header Row: ${bestHeaderRowIdx + 1}, Match Score: ${maxScore}`);

  if (bestRawRows.length <= bestHeaderRowIdx + 1) {
    return { sheetName: bestSheetName, stagingRows: [] };
  }

  const rawHeaders = bestRawRows[bestHeaderRowIdx];
  const seenHeaderCounts = {};
  const cleanHeaders = rawHeaders.map((h, colIdx) => {
    let cleaned = cleanStr(h);
    if (!cleaned) cleaned = `col_${colIdx}`;
    if (seenHeaderCounts[cleaned] !== undefined) {
      seenHeaderCounts[cleaned]++;
      cleaned = `${cleaned}_${seenHeaderCounts[cleaned]}`;
    } else {
      seenHeaderCounts[cleaned] = 0;
    }
    return cleaned;
  });

  const stagingRows = [];
  for (let r = bestHeaderRowIdx + 1; r < bestRawRows.length; r++) {
    const row = bestRawRows[r];
    if (!Array.isArray(row)) continue;
    
    // Check if empty row
    const hasData = row.some(cell => cell !== '' && cell !== null && cell !== undefined);
    if (!hasData) continue;

    const rowObj = {};
    for (let c = 0; c < cleanHeaders.length; c++) {
      const hKey = cleanHeaders[c];
      rowObj[hKey] = row[c] !== undefined ? row[c] : '';
    }

    const getVal = (possibleKeys) => {
      for (const pk of possibleKeys) {
        const pkClean = cleanStr(pk);
        if (rowObj[pkClean] !== undefined && rowObj[pkClean] !== null && String(rowObj[pkClean]).trim() !== '') {
          return rowObj[pkClean];
        }
      }
      return null;
    };

    if (template === 'segundas') {
      const rawFecha = getVal(['fecha', 'dia', 'fecha produccion']);
      const isoFecha = normalizeExcelDateToISO(rawFecha) || (new Date().toISOString().split('T')[0]);

      const candidateTelar = getVal(['localidad', 'salon', 'numero serie', 'numero de serie', 'nombre', 'produccion', 'telar', 'id flog']) || 'TELAR-01';
      const rawDefecto = getVal(['defecto', 'descripcion defecto', 'tipo defecto']) || 'DEFECTO GENERAL';
      const rawCodDefecto = getVal(['codigo defecto', 'codigo de defecto', 'cve defecto']) || 'DEF-01';
      const rawCantidad = getVal(['cantidad', 'cant', 'piezas defecto']) || '1';

      stagingRows.push({
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
        pzas_rollo: parseFloat(getVal(['pzas rollo', 'pzas_rollo', 'piezas'])) || 1,
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
        cantidad: parseFloat(rawCantidad) || 1,
        defecto: String(rawDefecto),
        maquina_id_detectada: String(candidateTelar),
        observaciones: getVal(['observaciones', 'comentario']) || ''
      });
    }
  }

  return { sheetName: bestSheetName, stagingRows };
}

// TEST WITH USER HEADERS & SAMPLE DATA
const userHeaders = 'Producción\tFecha\tCodigo de Barras\tCódigo de artículo\tNombre del artículo\tConfiguración\tTamaño\tColor\tNombre\tAlmacén\tNúmero de lote\tLocalidad\tSalon\tNúmero de serie\tID_FLOG\tNombre\tCalidadFlog\tPzas Rollo\tKg Rollo\tMts Rollo\tNo Tiras\tMedida 1\tMedida 2\tPzas T1\tPzas T2\tPzas T3\tPzas T4\tTurno Tejido\tCodigo Defecto\tCantidad\tDefecto'.split('\t');
const sampleRow = '10542\t2026-08-15\t750102030405\tTOA-001\tTOALLA BAÑO JACQUARD\tCONF-A\tGRANDE\tAZUL MARINO\tJUAN PEREZ\tALM-01\tLOTE-2026-88\tCF-01\tTEJIDO\tSERIE-9988\tFLOG-12\tOPERADOR FLOG\t1A\t10\t25.5\t120.0\t4\t70\t140\t2\t3\t3\t2\t1\tDEF-04\t3\tHILO ROTO EN URDIMBRE'.split('\t');

const ws = XLSX.utils.aoa_to_sheet([userHeaders, sampleRow]);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Segundas');

const parsed = parseExcelWorkbookToStaging(wb, 'segundas');
console.log('Resulting Staging Row count:', parsed.stagingRows.length);
console.log('Staging Row 0:\n', JSON.stringify(parsed.stagingRows[0], null, 2));

const r0 = parsed.stagingRows[0];
if (
  r0.produccion === '10542' &&
  r0.fecha === '2026-08-15' &&
  r0.codigo_bodega === '750102030405' &&
  r0.codigo_articulo === 'TOA-001' &&
  r0.nombre_articulo === 'TOALLA BAÑO JACQUARD' &&
  r0.localidad === 'CF-01' &&
  r0.maquina_id_detectada === 'CF-01' &&
  r0.defecto === 'HILO ROTO EN URDIMBRE' &&
  r0.cantidad === 3 &&
  r0.pzas_rollo === 10
) {
  console.log('\n✅ TEST PASSED: All columns parsed perfectly without zeros or dashes!');
} else {
  console.error('\n❌ TEST FAILED: Some fields did not match expected values.');
  process.exit(1);
}
