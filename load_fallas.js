// load_fallas.js — Carga fallas_por_maquina.xlsx a Supabase
const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');
const path = require('path');

// ── Config ────────────────────────────────────────────────────────────────────
const SUPABASE_URL     = 'https://xqfpsavkefhrxfbtqzec.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_6iHpR6R2yCdqy-YsvCWkSQ_YWg9my_i';
const ARCHIVO          = path.join(__dirname, 'importar_excel', 'fallas_por_maquina.xlsx');
const CHUNK_SIZE       = 1000;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── Helpers ───────────────────────────────────────────────────────────────────
function excelSerialToISO(serial) {
  if (!serial && serial !== 0) return null;
  if (typeof serial === 'string' && serial.includes('-')) return serial.trim();
  const n = Number(serial);
  if (isNaN(n)) return null;
  // Convert serial to JS Date (including decimals for time)
  const d = new Date(Math.round((n - 25569) * 86400 * 1000));
  return d.toISOString();
}

async function chunkedInsert(table, rows) {
  let total = 0;
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);
    const { error } = await supabase.from(table).insert(chunk);
    if (error) {
      console.error(`\n  ✗ Error chunk ${i}-${i + chunk.length} en ${table}:`, error.message);
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
  console.log(`   Hoja: ${wb.SheetNames[0]} | Filas leídas: ${raw.length}`);

  const idCarga = crypto.randomUUID ? crypto.randomUUID() : require('crypto').randomUUID();
  const fechaCarga = new Date().toISOString();

  // 1. Parsear datos a Staging
  const stgRows = raw
    .filter(r => r['maquina_ID']) // Solo filas que tengan máquina ID
    .map(r => {
      let isoDate = excelSerialToISO(r['Fecha']);
      return {
        area:            r['Area'] ? String(r['Area']).trim() : null,
        maquina_id:      String(r['maquina_ID'] || '').trim(),
        descripcion:     r['Descripción falla'] ? String(r['Descripción falla']).substring(0,250).trim() : null,
        creada:          isoDate,
        archivo_origen:  'fallas_por_maquina.xlsx',
        id_carga:        idCarga,
        fecha_carga:     fechaCarga
      };
    });

  console.log(`\n   Filas válidas para staging: ${stgRows.length}`);

  console.log('\n🗑️  Limpiando staging de cargas anteriores...');
  const { error: delStgErr } = await supabase
    .from('stg_fallas_por_maquina_excel')
    .delete()
    .eq('archivo_origen', 'fallas_por_maquina.xlsx');
  if (delStgErr) console.warn('  ⚠ No se pudo limpiar staging:', delStgErr.message);

  const { error: delProdErr } = await supabase
    .from('fallas_por_maquina')
    .delete()
    .eq('archivo_origen', 'fallas_por_maquina.xlsx');
  if (delProdErr) console.warn('  ⚠ No se pudo limpiar producción:', delProdErr.message);

  console.log('\n⬆️  Cargando staging...');
  await chunkedInsert('stg_fallas_por_maquina_excel', stgRows);

  console.log('\n🔍 Obteniendo máquinas válidas de cat_maquinas...');
  const { data: maquinas, error: maqErr } = await supabase
    .from('cat_maquinas')
    .select('equipo_towell');
  if (maqErr) { console.error('  ✗ Error al leer cat_maquinas:', maqErr.message); process.exit(1); }
  const maquinasSet = new Set(maquinas.map(m => m.equipo_towell));
  
  // Preparar producción
  let prodRows = [];
  let skipped = 0;

  for (const r of stgRows) {
    if (!maquinasSet.has(r.maquina_id)) { 
      skipped++; 
      continue; 
    }

    const isoDate = r.creada;
    let fechaDate = null;
    let horaTime = null;
    if (isoDate) {
      fechaDate = isoDate.split('T')[0];
      horaTime = isoDate.split('T')[1].substring(0, 8); // 'HH:MM:SS'
    }

    prodRows.push({
      area:               r.area,
      maquina_id:         r.maquina_id,
      descripcion_falla:  r.descripcion,
      fecha_hora_creada:  isoDate,
      fecha_creada:       fechaDate,
      hora_creada:        horaTime,
      origen:             'Excel',
      archivo_origen:     r.archivo_origen,
      fecha_carga:        fechaCarga
    });
  }

  console.log(`\n   Filas a insertar en producción: ${prodRows.length} | Omitidas (máquina no válida): ${skipped}`);
  console.log('\n⬆️  Insertando en fallas_por_maquina (producción)...');
  await chunkedInsert('fallas_por_maquina', prodRows);

  console.log('\n✅ ¡Carga de fallas completada!');
}

main().catch(err => { console.error('\n💥 Error fatal:', err); process.exit(1); });
