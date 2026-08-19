// test_audit_excel_segundas.js
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const filePath = path.join(__dirname, 'importar_excel', 'Segundas semana 33.xlsx');
const fileBuf = fs.readFileSync(filePath);
const wb = XLSX.read(fileBuf, { type: 'buffer' });

// Inspect exact sheet
const ws = wb.Sheets['SEGUNDAS'];
const matrix = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' });

console.log('Matrix total rows:', matrix.length);
console.log('Headers (Row 0):\n', matrix[0]);
console.log('Row 1:\n', matrix[1]);
console.log('Row 2:\n', matrix[2]);

// Let's create an explicit column dictionary from matrix[0]
const headers = matrix[0].map((h, i) => ({
  idx: i,
  raw: h,
  clean: h ? h.toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[\s\u00A0\uFEFF\u200B]+/g, ' ').replace(/_/g, ' ') : `col_${i}`
}));

console.log('\nColumn Dictionary:');
headers.forEach(h => console.log(`[${h.idx}] "${h.raw}" -> "${h.clean}"`));

// Find column indices
const getColIdx = (aliases) => {
  for (const alias of aliases) {
    const cleanAlias = alias.toLowerCase().trim().replace(/_/g, ' ');
    const found = headers.find(h => h.clean === cleanAlias || h.clean.includes(cleanAlias));
    if (found) return found.idx;
  }
  return -1;
};

const idxMap = {
  produccion: getColIdx(['produccion', 'op']),
  fecha: getColIdx(['fecha', 'dia']),
  codigo_bodega: getColIdx(['codigo de barras', 'codigo bodega', 'codigo barras']),
  codigo_articulo: getColIdx(['codigo de articulo', 'codigo articulo']),
  nombre_articulo: getColIdx(['nombre del articulo', 'nombre articulo']),
  configuracion: getColIdx(['configuracion']),
  tamano: getColIdx(['tamano', 'tamanio']),
  color: getColIdx(['color']),
  nombre_cliente: getColIdx(['nombre']),
  almacen: getColIdx(['almacen']),
  numero_lote: getColIdx(['numero de lote', 'numero lote', 'lote']),
  localidad: getColIdx(['localidad', 'telar']),
  salon: getColIdx(['salon', 'depto']),
  numero_serie: getColIdx(['numero de serie', 'numero serie']),
  id_flog: getColIdx(['id flog', 'id_flog']),
  nombre_flog: 15, // Second 'nombre' column
  calidad_flog: getColIdx(['calidadflog', 'calidad flog']),
  pzas_rollo: getColIdx(['pzas rollo', 'pzas_rollo']),
  kg_rollo: getColIdx(['kg rollo', 'kg_rollo']),
  mts_rollo: getColIdx(['mts rollo', 'mts_rollo']),
  no_tiras: getColIdx(['no tiras', 'no_tiras']),
  medida_1: getColIdx(['medida 1', 'medida_1']),
  medida_2: getColIdx(['medida 2', 'medida_2']),
  pzas_t1: getColIdx(['pzas t1']),
  pzas_t2: getColIdx(['pzas t2']),
  pzas_t3: getColIdx(['pzas t3']),
  pzas_t4: getColIdx(['pzas t4']),
  turno_tejido: getColIdx(['turno tejido', 'turno']),
  codigo_defecto: getColIdx(['codigo defecto']),
  cantidad: getColIdx(['cantidad', 'cant']),
  defecto: getColIdx(['defecto', 'falla'])
};

console.log('\nResolved Column Index Map:\n', idxMap);

// Check if any critical column is -1
for (let k in idxMap) {
  if (idxMap[k] === -1) {
    console.error(`CRITICAL: Column ${k} could not be resolved!`);
  }
}
