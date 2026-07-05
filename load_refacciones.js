// load_refacciones.js — Carga refacciones_por_maquina.xlsx a Supabase
const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');
const path = require('path');

// ── Config ────────────────────────────────────────────────────────────────────
const SUPABASE_URL     = 'https://xqfpsavkefhrxfbtqzec.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_6iHpR6R2yCdqy-YsvCWkSQ_YWg9my_i';
const ARCHIVO          = path.join(__dirname, 'importar_excel', 'refacciones_por_maquina.xlsx');
const CHUNK_SIZE       = 500;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── Helpers ───────────────────────────────────────────────────────────────────
function excelSerialToISO(serial) {
  if (!serial && serial !== 0) return null;
  if (typeof serial === 'string' && serial.includes('-')) return serial.trim();
  const n = Number(serial);
  if (isNaN(n)) return null;
  const d = new Date(Math.round((n - 25569) * 86400 * 1000));
  return d.toISOString().split('T')[0];
}

async function chunkedUpsert(table, rows, onConflict) {
  let total = 0;
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);
    const { error } = await supabase.from(table).upsert(chunk, { onConflict });
    if (error) {
      console.error(`  ✗ Error chunk ${i}-${i + chunk.length} en ${table}:`, error.message);
    } else {
      total += chunk.length;
      process.stdout.write(`\r  → ${table}: ${total}/${rows.length} filas`);
    }
  }
  console.log();
  return total;
}

async function chunkedInsert(table, rows) {
  let total = 0;
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);
    const { error } = await supabase.from(table).insert(chunk);
    if (error) {
      console.error(`  ✗ Error chunk ${i}-${i + chunk.length} en ${table}:`, error.message);
    } else {
      total += chunk.length;
      process.stdout.write(`\r  → ${table}: ${total}/${rows.length} filas`);
    }
  }
  console.log();
  return total;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n📦 Leyendo Excel:', ARCHIVO);
  const wb   = XLSX.readFile(ARCHIVO);
  const ws   = wb.Sheets[wb.SheetNames[0]];
  const raw  = XLSX.utils.sheet_to_json(ws);
  console.log(`   Hoja: ${wb.SheetNames[0]} | Filas: ${raw.length}`);

  // ── 1. Mapear filas ──────────────────────────────────────────────────────
  const idCarga = crypto.randomUUID ? crypto.randomUUID() : require('crypto').randomUUID();
  const fechaCarga = new Date().toISOString();

  const stgRows = raw
    .filter(r => r['CLAVE'] && r['Código de artículo'])
    .map(r => ({
      fecha:               excelSerialToISO(r['Fecha']),
      maquina_id:          String(r['CLAVE'] || '').trim(),
      destino:             r['Destino'] != null ? String(r['Destino']).trim() : null,
      codigo_articulo:     String(r['Código de artículo'] || '').trim(),
      nombre_articulo:     String(r['Nombre del artículo'] || '').trim(),
      cantidad_estandar:   r['Cantidad'] != null   ? String(r['Cantidad'])         : null,
      precio_costo_unitario: r['Precio de costo'] != null ? String(r['Precio de costo']) : null,
      importe_costo_origen:  r['Importe de costo'] != null ? String(r['Importe de costo']) : null,
      archivo_origen:      'refacciones_por_maquina.xlsx',
      id_carga:            idCarga,
      fecha_carga:         fechaCarga
    }));

  console.log(`\n   Filas válidas: ${stgRows.length} (filtradas: ${raw.length - stgRows.length})`);

  // ── 2. Limpiar staging previo de este archivo ────────────────────────────
  console.log('\n🗑️  Limpiando datos anteriores del Excel...');
  const { error: delStgErr } = await supabase
    .from('stg_refacciones_por_maquina_excel')
    .delete()
    .eq('archivo_origen', 'refacciones_por_maquina.xlsx');
  if (delStgErr) console.warn('  ⚠ No se pudo limpiar staging:', delStgErr.message);

  const { error: delProdErr } = await supabase
    .from('refacciones_por_maquina')
    .delete()
    .eq('origen', 'Excel');
  if (delProdErr) console.warn('  ⚠ No se pudo limpiar producción:', delProdErr.message);

  // ── 3. Cargar staging ────────────────────────────────────────────────────
  console.log('\n⬆️  Cargando staging...');
  await chunkedInsert('stg_refacciones_por_maquina_excel', stgRows);

  // ── 4. Poblar cat_refacciones con códigos nuevos ─────────────────────────
  console.log('\n📚 Poblando cat_refacciones (upsert)...');
  const catRefMap = new Map();
  stgRows.forEach(r => {
    if (r.codigo_articulo && !catRefMap.has(r.codigo_articulo)) {
      catRefMap.set(r.codigo_articulo, {
        codigo_articulo:  r.codigo_articulo,
        nombre_articulo:  r.nombre_articulo || r.codigo_articulo,
        activo:           true,
        fecha_carga:      fechaCarga
      });
    }
  });
  const catRows = Array.from(catRefMap.values());
  await chunkedUpsert('cat_refacciones', catRows, 'codigo_articulo');

  // ── 5. Obtener máquinas válidas de cat_maquinas ──────────────────────────
  console.log('\n🔍 Obteniendo máquinas válidas de cat_maquinas...');
  const { data: maquinas, error: maqErr } = await supabase
    .from('cat_maquinas')
    .select('equipo_towell');
  if (maqErr) { console.error('  ✗ Error al leer cat_maquinas:', maqErr.message); process.exit(1); }
  const maquinasSet = new Set(maquinas.map(m => m.equipo_towell));
  console.log(`   Máquinas en catálogo: ${maquinasSet.size}`);

  // ── 6. Construir filas para refacciones_por_maquina ─────────────────────
  const prodRows = [];
  let skipped = 0;

  for (const r of stgRows) {
    if (!maquinasSet.has(r.maquina_id)) { skipped++; continue; }

    const cantidad  = parseFloat(r.cantidad_estandar)        || 0;
    const precio    = parseFloat(r.precio_costo_unitario)    || 0;
    const importe   = parseFloat(r.importe_costo_origen)     || 0;

    prodRows.push({
      fecha:                    r.fecha,
      maquina_id:               r.maquina_id,
      destino:                  r.destino,
      codigo_articulo:          r.codigo_articulo,
      nombre_articulo:          r.nombre_articulo,
      cantidad_estandar:        cantidad,
      precio_costo_unitario:    precio,
      importe_costo_origen:     importe,
      importe_costo_calculado:  (cantidad && precio) ? Math.round(cantidad * precio * 10000) / 10000 : null,
      diferencia_importe:       (importe && cantidad && precio)
                                  ? Math.round((importe - cantidad * precio) * 10000) / 10000
                                  : null,
      origen:                   'Excel',
      fecha_carga:              fechaCarga
    });
  }

  console.log(`\n   Filas a insertar: ${prodRows.length} | Omitidas (maquina no válida): ${skipped}`);

  // ── 7. Insertar en refacciones_por_maquina ───────────────────────────────
  console.log('\n⬆️  Insertando en refacciones_por_maquina...');
  await chunkedInsert('refacciones_por_maquina', prodRows);

  console.log('\n✅ ¡Carga completada!');
  console.log(`   id_carga: ${idCarga}`);
}

main().catch(err => { console.error('\n💥 Error fatal:', err); process.exit(1); });
