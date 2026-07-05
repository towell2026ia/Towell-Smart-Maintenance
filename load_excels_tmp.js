const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const crypto = require('crypto');

function parseExcelDate(value) {
  if (!value) return new Date();
  if (typeof value === 'number') {
    return new Date((value - 25569) * 86400 * 1000);
  }
  const num = Number(value);
  if (!isNaN(num) && value.toString().trim() !== '') {
    return new Date((num - 25569) * 86400 * 1000);
  }
  const parsed = new Date(value);
  if (!isNaN(parsed.getTime())) return parsed;
  if (typeof value === 'string') {
    const parts = value.split(/[-/]/);
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) return d;
    }
  }
  return new Date();
}

async function run() {
  console.log('--- STARTING BULK INGESTION SCRIPT (WITH RETRIES & DATE PARSING) ---');
  
  // 1. Read Supabase configuration
  if (!fs.existsSync('./config.js')) {
    console.error('config.js not found!');
    process.exit(1);
  }
  const configContent = fs.readFileSync('./config.js', 'utf8');
  const urlMatch = configContent.match(/SUPABASE_URL\s*=\s*['"]([^'"]+)['"]/);
  const keyMatch = configContent.match(/SUPABASE_ANON_KEY\s*=\s*['"]([^'"]+)['"]/);
  if (!urlMatch || !keyMatch) {
    console.error('Failed to extract Supabase URL or Anon Key from config.js!');
    process.exit(1);
  }
  const url = urlMatch[1];
  const key = keyMatch[1];
  console.log('Supabase URL:', url);
  
  const supabase = createClient(url, key);

  // Clean up previous staging segundas records to prevent bloating
  console.log('Cleaning up previous failed segundas staging/control records...');
  const { error: delStgErr } = await supabase.from('stg_segundas_por_rollo_excel').delete().neq('id_stg', '00000000-0000-0000-0000-000000000000');
  if (delStgErr) console.warn('Could not clear staging segundas:', delStgErr.message);
  
  const { error: delCtrlErr } = await supabase.from('control_cargas_archivos').delete().eq('fuente', 'EXCEL_SEGUNDAS_X_ROLLO');
  if (delCtrlErr) console.warn('Could not clear control logs:', delCtrlErr.message);

  // Also reset final segundas table to ensure a clean final count
  console.log('Resetting production segundas_por_rollo table for clean reload...');
  const { error: delProdErr } = await supabase.from('segundas_por_rollo').delete().neq('id_segunda_rollo', '00000000-0000-0000-0000-000000000000');
  if (delProdErr) console.warn('Could not clear production segundas:', delProdErr.message);

  // 2. Load Machines Catalog
  console.log('\n--- 1. LOADING MACHINES CATALOG ---');
  if (!fs.existsSync('./importar_excel/stg_maquinas_excel.xlsx')) {
    console.error('stg_maquinas_excel.xlsx not found in ./importar_excel/');
    process.exit(1);
  }
  const wbMach = XLSX.readFile('./importar_excel/stg_maquinas_excel.xlsx');
  const wsMach = wbMach.Sheets[wbMach.SheetNames[0]];
  const rawMachRows = XLSX.utils.sheet_to_json(wsMach);
  console.log(`Read ${rawMachRows.length} rows from stg_maquinas_excel.xlsx`);

  const seen = new Set();
  const machinesToInsert = rawMachRows.map((r, i) => {
    const eqTowel = r['EQUIPO TOWEL'] ? r['EQUIPO TOWEL'].toString().trim() : null;
    const clave = r['CLAVE'] ? r['CLAVE'].toString().trim() : null;
    const ax = r['AX'] ? r['AX'].toString().trim() : null;
    
    if (!clave) {
      console.log(`Skipping machine row ${i} because CLAVE is empty.`);
      return null;
    }
    
    return {
      equipo_towell: clave,  // CLAVE goes to equipo_towell
      clave: eqTowel,        // EQUIPO TOWEL goes to clave
      ax: ax,
      origen: 'Excel Ingestion'
    };
  }).filter(m => {
    if (!m) return false;
    if (seen.has(m.equipo_towell)) return false;
    seen.add(m.equipo_towell);
    return true;
  });

  console.log(`Prepared ${machinesToInsert.length} machine records. Upserting into cat_maquinas...`);
  const { error: machErr } = await supabase.from('cat_maquinas').upsert(machinesToInsert, { onConflict: 'equipo_towell' });
  if (machErr) {
    console.error('Failed to upsert machines:', machErr);
    process.exit(1);
  }
  console.log('Machines catalog loaded successfully!');

  // 3. Load Segundas por Rollo Excel
  console.log('\n--- 2. LOADING SEGUNDAS POR ROLLO ---');
  if (!fs.existsSync('./importar_excel/Segundas_por_Rollo.xlsx')) {
    console.error('Segundas_por_Rollo.xlsx not found in ./importar_excel/');
    process.exit(1);
  }
  const wbSeg = XLSX.readFile('./importar_excel/Segundas_por_Rollo.xlsx');
  const wsSeg = wbSeg.Sheets[wbSeg.SheetNames[0]];
  const rawSegRows = XLSX.utils.sheet_to_json(wsSeg);
  console.log(`Read ${rawSegRows.length} rows from Segundas_por_Rollo.xlsx`);

  const idCarga = crypto.randomUUID();
  const filename = 'Segundas_por_Rollo.xlsx';
  console.log('Generated idCarga:', idCarga);

  // Insert control load entry
  console.log('Creating control load entry...');
  const { error: ctrlErr } = await supabase.from('control_cargas_archivos').insert([{
    id_carga: idCarga,
    nombre_archivo: filename,
    tipo_archivo: 'xlsx',
    fuente: 'EXCEL_SEGUNDAS_X_ROLLO',
    usuario_carga: 'System Load Script',
    registros_leidos: rawSegRows.length,
    estatus_carga: 'Cargando'
  }]);
  if (ctrlErr) {
    console.error('Failed to create control record:', ctrlErr);
    process.exit(1);
  }

  // Map rows with date parsing
  const segundasToInsert = rawSegRows.map(r => {
    const getVal = (possibleKeys) => {
      for (let pk of possibleKeys) {
        if (r[pk] !== undefined) return r[pk];
      }
      return null;
    };
    
    return {
      produccion: getVal(['Producción', 'produccion', 'PRODUCCION']),
      fecha: (() => {
        const rawDate = getVal(['Fecha', 'fecha', 'FECHA']);
        const parsed = parseExcelDate(rawDate);
        return parsed.toISOString().split('T')[0];
      })(),
      codigo_bodega: getVal(['Codigo de Barras', 'codigo_bodega', 'codigo de bodega', 'barras']),
      codigo_articulo: getVal(['Código de artículo', 'codigo_articulo', 'codigo de articulo']),
      nombre_articulo: getVal(['Nombre del artículo', 'nombre_articulo', 'nombre del articulo']),
      configuracion: getVal(['Configuración', 'configuracion']),
      tamano: getVal(['Tamaño', 'tamano', 'tamaño']),
      color: getVal(['Color', 'color']),
      nombre: getVal(['Nombre', 'nombre']),
      almacen: getVal(['Almacén', 'almacen', 'almacén']),
      numero_lote: getVal(['Número de lote', 'numero_lote', 'numero de lote']),
      localidad: getVal(['Localidad', 'localidad']),
      salon: getVal(['Salon', 'salon']),
      numero_serie: getVal(['Número de serie', 'numero_serie', 'numero de serie']),
      id_flog: getVal(['ID_FLOG', 'id_flog', 'id flog']),
      nombre_flog: getVal(['Nombre_1', 'nombre_flog', 'nombre_1', 'nombre flog']),
      calidad_flog: getVal(['CalidadFlog', 'calidad_flog', 'calidadflog']),
      pzas_rollo: getVal(['Pzas Rollo', 'pzas_rollo', 'pzas rollo']),
      kg_rollo: getVal(['Kg Rollo', 'kg_rollo', 'kg rollo']),
      mts_rollo: getVal(['Mts Rollo', 'mts_rollo', 'mts rollo']),
      no_tiras: getVal(['No Tiras', 'no_tiras', 'no tiras']),
      medida_1: getVal(['Medida 1', 'medida_1', 'medida 1']),
      medida_2: getVal(['Medida 2', 'medida_2', 'medida 2']),
      pzas_t1: getVal(['Pzas T1', 'pzas_t1', 'pzas t1']),
      pzas_t2: getVal(['Pzas T2', 'pzas_t2', 'pzas t2']),
      pzas_t3: getVal(['Pzas T3', 'pzas_t3', 'pzas t3']),
      pzas_t4: getVal(['Pzas T4', 'pzas_t4', 'pzas t4']),
      turno_tejido: getVal(['Turno Tejido', 'turno_tejido', 'turno tejido']),
      codigo_defecto: getVal(['Codigo Defecto', 'codigo_defecto', 'codigo defecto']),
      cantidad: getVal(['Cantidad', 'cantidad']),
      defecto: getVal(['Defecto', 'defecto']),
      archivo_origen: filename,
      id_carga: idCarga,
      fecha_carga: new Date().toISOString()
    };
  });

  console.log(`Inserting ${segundasToInsert.length} records into stg_segundas_por_rollo_excel in chunks of 500...`);
  const chunkSize = 500;
  
  const insertChunkWithRetry = async (chunk, startIndex, attempt = 1) => {
    try {
      const { error } = await supabase.from('stg_segundas_por_rollo_excel').insert(chunk);
      if (error) throw error;
    } catch (err) {
      if (attempt <= 5) {
        console.warn(`[Attempt ${attempt}/5 failed at index ${startIndex}]: ${err.message || err}. Retrying in 5s...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
        return insertChunkWithRetry(chunk, startIndex, attempt + 1);
      }
      throw err;
    }
  };

  for (let i = 0; i < segundasToInsert.length; i += chunkSize) {
    const chunk = segundasToInsert.slice(i, i + chunkSize);
    try {
      await insertChunkWithRetry(chunk, i);
    } catch (error) {
      console.error(`Fatal error: Failed to insert chunk at index ${i} after 5 attempts.`, error);
      
      // Update control entry to Error
      await supabase.from('control_cargas_archivos').update({
        estatus_carga: 'Error',
        observaciones: `Error insertando lote en staging en índice ${i}: ${error.message}`
      }).eq('id_carga', idCarga);
      process.exit(1);
    }
    if ((i / chunkSize) % 10 === 0 || i + chunkSize >= segundasToInsert.length) {
      console.log(`Inserted ${Math.min(i + chunkSize, segundasToInsert.length)} / ${segundasToInsert.length} records...`);
    }
  }

  // Update status to Validado so it can be committed
  console.log('Staging insertion complete. Updating control entry status to Validado...Point A');
  await supabase.from('control_cargas_archivos').update({
    estatus_carga: 'Validado',
    observaciones: 'Inserción masiva en staging completada con éxito. Listo para procesar commit.'
  }).eq('id_carga', idCarga);

  // 4. Executing stored procedure commit_segundas_por_rollo
  console.log('\nExecuting server-side stored procedure commit_segundas_por_rollo...');
  const { data: rpcRes, error: rpcErr } = await supabase.rpc('commit_segundas_por_rollo', { p_id_carga: idCarga });
  if (rpcErr) {
    console.error('Error executing stored procedure commit_segundas_por_rollo:', rpcErr);
    process.exit(1);
  }
  console.log('Stored procedure execution complete! Result:', rpcRes);
  console.log('Ingestion completed successfully for both files!');
}

run().catch(err => {
  console.error('Fatal error during execution:', err);
  process.exit(1);
});
