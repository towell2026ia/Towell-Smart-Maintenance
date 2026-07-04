const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

// --- DIRECTORIOS ---
const DIRECTORY_IMPORT = path.join(__dirname, 'importar_excel');
const DIRECTORY_PROCESSED = path.join(DIRECTORY_IMPORT, 'procesados');

// --- NORMALIZACIÓN DE STRINGS ---
function normalizarColumna(col) {
  if (typeof col !== 'string') return '';
  return col.toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Eliminar tildes
    .replace(/[^a-z0-9_ ]/g, "")     // Eliminar caracteres especiales
    .replace(/\s+/g, ' ');           // Espacios simples
}

// --- CONFIGURACIÓN DE ESQUEMAS ESPERADOS ---
// Columnas normalizadas que deben coincidir exactamente (ni más, ni menos)
const ESQUEMAS = {
  MAQUINAS: {
    nombre: 'Catálogo de Máquinas',
    tabla: 'cat_maquinas',
    columnas: ['equipo towell', 'clave'],
    mapeo: (row) => {
      const eqTowell = row['EQUIPO TOWELL'] || row['equipo towell'] || row['Equipo Towell'] || row['EQUIPO_TOWELL'];
      const clave = row['Clave'] || row['clave'] || row['CLAVE'] || row['CLAVE_MAQUINA'];
      
      let area = 'PF';
      if (eqTowell.includes('COS')) area = 'CF';
      else if (eqTowell.includes('TIN') || eqTowell.includes('JET')) area = 'TF';
      else if (eqTowell.includes('AUX') || eqTowell.includes('SUB') || eqTowell.includes('COM')) area = 'AF';
      
      return {
        equipo_towell: eqTowell,
        clave: clave || eqTowell.split('-')[1] || eqTowell,
        area: area,
        proceso: area === 'PF' ? 'Tejido' : area === 'CF' ? 'Costura' : 'Tintorería',
        tipo_equipo: 'Maquinaria',
        activo: true,
        origen: 'Excel Batch Import'
      };
    },
    upsertConflict: 'equipo_towell'
  },
  TELEGRAM: {
    nombre: 'Órdenes de Telegram',
    tabla: 'stg_telegram_ordenes_telares', // También sube a 'ordenes_trabajo'
    columnas: [
      'id', 'folio', 'estatus', 'fecha', 'hora', 'depto', 'maquina_id', 'tipofallaid', 
      'falla', 'horafin', 'cveempl', 'nomempl', 'turno', 'cveatendio', 'nomatendio', 
      'turnoatendio', 'obs', 'ordentrabajo', 'descripcion', 'enviado', 'obscierre', 
      'calidad', 'fechafin'
    ],
    mapeo: (row, index) => {
      const id = parseInt(row['Id'] || row['id'] || row['ID']) || index + 1;
      const folio = row['Folio'] || row['folio'] || row['FOLIO'];
      const estatus = row['Estatus'] || row['estatus'] || row['ESTATUS'] || 'Solicitud recibida';
      const fecha = parseExcelDate(row['Fecha'] || row['fecha'] || row['FECHA']);
      const hora = row['Hora'] || row['hora'] || row['HORA'] || '12:00:00';
      const depto = row['Depto'] || row['depto'] || row['DEPTO'];
      const maquina_id = row['MaquinaId'] || row['maquina_id'] || row['Maquinaid'] || row['MAQUINAID'] || row['maquina'];
      const tipo_falla_id = row['TipoFallaId'] || row['tipofallaid'] || row['tipo_falla_id'];
      const falla = row['Falla'] || row['falla'] || row['FALLA'];
      const hora_fin = row['HoraFin'] || row['horafin'] || row['hora_fin'];
      const cve_empl = row['CveEmpl'] || row['cveempl'] || row['cve_empl'];
      const nom_empl = row['NomEmpl'] || row['nomempl'] || row['nom_empl'];
      const turno = parseInt(row['Turno'] || row['turno'] || row['TURNO']) || 1;
      const cve_atendio = row['CveAtendio'] || row['cveatendio'] || row['cve_atendio'];
      const nom_atendio = row['NomAtendio'] || row['nomatendio'] || row['nom_atendio'];
      const turno_atendio = parseInt(row['TurnoAtendio'] || row['turnoatendio'] || row['turno_atendio']) || null;
      const obs = row['Obs'] || row['obs'] || row['OBS'];
      const orden_trabajo = row['OrdenTrabajo'] || row['ordentrabajo'] || row['orden_trabajo'];
      const descripcion = row['Descripcion'] || row['descripción'] || row['descripcion'] || row['DESCRIPCION'];
      const enviado = row['Enviado'] || row['enviado'] || row['ENVIADO'] || false;
      const obs_cierre = row['ObsCierre'] || row['obscierre'] || row['obs_cierre'];
      const calidad = parseInt(row['Calidad'] || row['calidad'] || row['CALIDAD']) || null;
      const fecha_fin_val = row['FechaFin'] || row['fechafin'] || row['fecha_fin'];
      const fecha_fin = fecha_fin_val ? parseExcelDate(fecha_fin_val) : null;
      
      let depPrefix = 'PF';
      const depNormalized = (depto || '').toLowerCase();
      if (depNormalized.includes('cost') || depNormalized.includes('conf')) {
        depPrefix = 'CF';
      } else if (depNormalized.includes('tint') || depNormalized.includes('tinte') || depNormalized.includes('jet')) {
        depPrefix = 'TF';
      } else if (depNormalized.includes('serv') || depNormalized.includes('aux') || depNormalized.includes('planta')) {
        depPrefix = 'AF';
      }
      const tgFolio = folio || `TG-${depPrefix}${String(id).padStart(5, '0')}`;

      const stgRecord = {
        id, folio: tgFolio, estatus, fecha: fecha.toISOString().split('T')[0], hora, depto, maquina_id, tipo_falla_id,
        falla, hora_fin, cve_empl, nom_empl, turno, cve_atendio, nom_atendio, turno_atendio, obs,
        orden_trabajo, descripcion, enviado: enviado === 'True' || enviado === true, obs_cierre, calidad,
        fecha_fin: fecha_fin ? fecha_fin.toISOString().split('T')[0] : null,
        fecha_carga: new Date().toISOString()
      };
      
      const mainRecord = {
        id_original: id,
        folio: tgFolio,
        orden_trabajo: orden_trabajo || 'MC',
        origen: 'Telegram',
        estatus: estatus,
        fecha_inicio: fecha.toISOString().split('T')[0],
        hora_inicio: hora,
        fecha_hora_inicio: new Date(fecha.toISOString().split('T')[0] + 'T' + (hora.includes(':') ? hora : '12:00:00')).toISOString(),
        departamento: depto,
        maquina_id: maquina_id,
        tipo_falla_id: tipo_falla_id,
        falla: falla,
        descripcion: descripcion || obs,
        observacion_inicial: obs,
        cve_solicitante: cve_empl,
        nombre_solicitante: nom_empl,
        turno_solicitante: turno,
        cve_atendio: cve_atendio,
        nombre_atendio: nom_atendio,
        turno_atendio: turno_atendio,
        fecha_fin: fecha_fin ? fecha_fin.toISOString().split('T')[0] : null,
        hora_fin: hora_fin,
        fecha_hora_fin: fecha_fin && hora_fin ? new Date(fecha_fin.toISOString().split('T')[0] + 'T' + (hora_fin.includes(':') ? hora_fin : '12:00:00')).toISOString() : null,
        tiempo_atencion_min: fecha_fin && fecha ? Math.round((fecha_fin - fecha) / (1000 * 60)) : null,
        observacion_cierre: obs_cierre,
        calidad: calidad,
        enviado: enviado === 'True' || enviado === true,
        prioridad: 'Media',
        fecha_carga: new Date().toISOString()
      };
      
      return { stgRecord, mainRecord };
    }
  },
  REFACCIONES: {
    nombre: 'Refacciones por Máquina',
    columnas: [
      'fecha', 'destino', 'codigo de articulo', 'nombre del articulo', 'cantidad', 
      'precio de costo', 'importe de costo'
    ],
    mapeo: (row) => {
      const fechaStr = row['Fecha'] || row['fecha'] || row['FECHA'];
      const fecha = parseExcelDate(fechaStr);
      const destino = row['Destino'] || row['destino'] || row['DESTINO'];
      const codArt = row['Código de Artículo'] || row['código de artículo'] || row['Codigo de Articulo'] || row['codigo'] || row['Código'];
      const nomArt = row['Nombre del Artículo'] || row['nombre del artículo'] || row['Nombre'] || row['nombre'];
      const cant = parseFloat(row['Cantidad'] || row['cantidad'] || row['CANTIDAD']) || 1.0;
      const precio = parseFloat(row['Precio de Costo'] || row['precio de costo'] || row['Precio'] || row['precio']) || 0.0;
      const importe = parseFloat(row['Importe de Costo'] || row['importe de costo'] || row['Importe'] || row['importe']) || 0.0;
      
      const calcImporte = cant * precio;
      const dif = calcImporte - importe;
      
      const part = {
        codigo_articulo: codArt,
        nombre_articulo: nomArt,
        unidad_medida: 'PZ',
        familia: 'General',
        activo: true
      };
      
      const consumption = {
        fecha: fecha.toISOString().split('T')[0],
        maquina_id: destino,
        destino: destino,
        codigo_articulo: codArt,
        nombre_articulo: nomArt,
        cantidad_estandar: cant,
        precio_costo_unitario: precio,
        importe_costo_calculado: calcImporte,
        importe_costo_origen: importe,
        diferencia_importe: dif,
        origen: 'Excel Batch Import'
      };
      
      const price = {
        codigo_articulo: codArt,
        fecha: fecha.toISOString().split('T')[0],
        precio_costo_unitario: precio,
        moneda: 'MXN',
        origen: 'Excel Batch Import'
      };
      
      return { part, consumption, price };
    }
  },
  FALLAS: {
    nombre: 'Historial de Fallas',
    columnas: ['descripcion', 'creada'],
    mapeo: (row, index, filename) => {
      const desc = row['Descripción'] || row['descripción'] || row['descripcion'] || row['DESCRIPCION'];
      const creadaStr = row['Creada'] || row['creada'] || row['CREADA'];
      const creada = parseExcelDate(creadaStr);
      
      const maquinaIdFromFilename = filename.split('.')[0] || 'MAQ-UNKNOWN';
      
      const rawFault = {
        maquina_id: maquinaIdFromFilename,
        descripcion: desc,
        creada: creada.toISOString(),
        archivo_origen: filename
      };
      
      const cleanFault = {
        maquina_id: maquinaIdFromFilename,
        descripcion_falla: desc,
        fecha_hora_creada: creada.toISOString(),
        fecha_creada: creada.toISOString().split('T')[0],
        hora_creada: creada.toTimeString().split(' ')[0],
        origen: 'Excel Batch Import',
        archivo_origen: filename,
        categoria_falla: desc.toLowerCase().includes('elec') || desc.toLowerCase().includes('sensor') ? 'Eléctrica' : 'Mecánica',
        es_recurrente: false
      };
      
      return { rawFault, cleanFault };
    }
  }
};

// --- PARSE EXCEL DATE ---
function parseExcelDate(value) {
  if (!value) return new Date();
  if (typeof value === 'number') {
    return new Date((value - 25569) * 86400 * 1000);
  }
  const parsed = new Date(value);
  if (!isNaN(parsed.getTime())) return parsed;
  if (typeof value === 'string') {
    const parts = value.split(/[-/]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        return new Date(parts[0], parts[1] - 1, parts[2]);
      } else {
        return new Date(parts[2], parts[1] - 1, parts[0]);
      }
    }
  }
  return new Date();
}

// --- LEER DE FORMA AUTOMÁTICA CONFIG.JS ---
function readSupabaseCredentials() {
  const configPath = path.join(__dirname, 'config.js');
  if (!fs.existsSync(configPath)) {
    throw new Error('No se encontró el archivo config.js en la raíz del proyecto.');
  }
  
  const content = fs.readFileSync(configPath, 'utf8');
  const urlMatch = content.match(/SUPABASE_URL\s*=\s*["']([^"']+)["']/);
  const keyMatch = content.match(/SUPABASE_ANON_KEY\s*=\s*["']([^"']+)["']/);
  
  if (!urlMatch || !keyMatch) {
    throw new Error('No se pudieron extraer las credenciales SUPABASE_URL o SUPABASE_ANON_KEY del archivo config.js.');
  }
  
  return {
    supabaseUrl: urlMatch[1],
    supabaseKey: keyMatch[1]
  };
}

// --- MAIN RUNNER ---
async function run() {
  console.log('=== INICIANDO IMPORTADOR MASIVO DE EXCEL ===\n');
  
  // 1. Validar e inicializar directorios
  if (!fs.existsSync(DIRECTORY_IMPORT)) {
    fs.mkdirSync(DIRECTORY_IMPORT, { recursive: true });
    console.log(`Creada la carpeta de importación: ${DIRECTORY_IMPORT}`);
  }
  if (!fs.existsSync(DIRECTORY_PROCESSED)) {
    fs.mkdirSync(DIRECTORY_PROCESSED, { recursive: true });
    console.log(`Creada la carpeta de procesados: ${DIRECTORY_PROCESSED}`);
  }
  
  // 2. Extraer credenciales de Supabase
  let credentials;
  try {
    credentials = readSupabaseCredentials();
    console.log(`Conectando a Supabase URL: ${credentials.supabaseUrl}`);
  } catch (err) {
    console.error(`Error de configuración: ${err.message}`);
    process.exit(1);
  }
  
  const supabase = createClient(credentials.supabaseUrl, credentials.supabaseKey);
  
  // 3. Leer archivos en la carpeta de importación
  const files = fs.readdirSync(DIRECTORY_IMPORT).filter(file => {
    const ext = path.extname(file).toLowerCase();
    return (ext === '.xlsx' || ext === '.xls') && fs.statSync(path.join(DIRECTORY_IMPORT, file)).isFile();
  });
  
  if (files.length === 0) {
    console.log('No hay archivos Excel (.xlsx o .xls) en la carpeta "importar_excel".');
    console.log('Por favor, coloca tus bases de datos ahí y vuelve a ejecutar el comando.');
    process.exit(0);
  }
  
  console.log(`Se encontraron ${files.length} archivo(s) para procesar.\n`);
  
  const report = {
    exitosos: [],
    omitidos: []
  };
  
  // 4. Procesar cada archivo
  for (const filename of files) {
    const filePath = path.join(DIRECTORY_IMPORT, filename);
    console.log(`----------------------------------------------------------------------`);
    console.log(`Procesando archivo: "${filename}"`);
    
    let workbook;
    try {
      workbook = XLSX.readFile(filePath);
    } catch (err) {
      console.error(`[ALERTA] No se pudo leer el archivo Excel: ${err.message}`);
      report.omitidos.push({
        archivo: filename,
        razon: `Error al leer archivo: ${err.message}`
      });
      continue;
    }
    
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);
    
    if (jsonData.length === 0) {
      console.log(`[ALERTA] Archivo vacío.`);
      report.omitidos.push({
        archivo: filename,
        razon: 'El archivo Excel no contiene filas de datos.'
      });
      continue;
    }
    
    // Extraer columnas encontradas del primer registro
    const columnasEncontradasOriginales = Object.keys(jsonData[0]);
    const columnasEncontradasNormalizadas = columnasEncontradasOriginales.map(normalizarColumna);
    
    // Identificar esquema de coincidencia exacta (longitud y elementos)
    let esquemaIdentificado = null;
    let coincidenciaMasCercana = null;
    let mayorCoincidencia = -1;
    
    for (const key of Object.keys(ESQUEMAS)) {
      const esquema = ESQUEMAS[key];
      const columnasEsquema = esquema.columnas;
      
      // Contar cuántas coinciden
      const coincidencias = columnasEncontradasNormalizadas.filter(col => columnasEsquema.includes(col)).length;
      if (coincidencias > mayorCoincidencia) {
        mayorCoincidencia = coincidencias;
        coincidenciaMasCercana = esquema;
      }
      
      // Para coincidir exactamente, deben tener la misma longitud de columnas y todos los elementos deben estar presentes
      if (columnasEncontradasNormalizadas.length === columnasEsquema.length &&
          columnasEsquema.every(col => columnasEncontradasNormalizadas.includes(col))) {
        esquemaIdentificado = { key, ...esquema };
        break;
      }
    }
    
    if (!esquemaIdentificado) {
      console.log(`[ALERTA] No coincide exactamente con ningún esquema de base de datos.`);
      
      let mensajeError = '';
      if (coincidenciaMasCercana && mayorCoincidencia > 0) {
        mensajeError = `Parece que querías cargar "${coincidenciaMasCercana.nombre}" pero la estructura difiere. `;
        const faltantes = coincidenciaMasCercana.columnas.filter(col => !columnasEncontradasNormalizadas.includes(col));
        const sobrantes = columnasEncontradasNormalizadas.filter(col => !coincidenciaMasCercana.columnas.includes(col));
        
        if (faltantes.length > 0) {
          mensajeError += `Faltan columnas: [${faltantes.join(', ')}]. `;
        }
        if (sobrantes.length > 0) {
          mensajeError += `Sobran columnas no reconocidas: [${sobrantes.join(', ')}]. `;
        }
      } else {
        mensajeError = `Columnas encontradas: [${columnasEncontradasOriginales.join(', ')}]. No coincide con ningún catálogo esperado.`;
      }
      
      console.log(`Detalle: ${mensajeError}`);
      report.omitidos.push({
        archivo: filename,
        razon: mensajeError
      });
      continue;
    }
    
    console.log(`Coincidencia perfecta: Identificado como "${esquemaIdentificado.nombre}". Cargando...`);
    
    // Crear registro de control de carga inicial
    const logRecord = {
      nombre_archivo: filename,
      tipo_archivo: 'xlsx/xls',
      fuente: 'Excel Batch Import',
      fecha_carga: new Date().toISOString(),
      usuario_carga: 'Batch Script',
      registros_leidos: jsonData.length,
      registros_correctos: 0,
      registros_error: 0,
      estatus_carga: 'Procesando',
      observaciones: `Cargando catálogo masivo desde script.`
    };
    
    let dbCargaId = null;
    try {
      const { data: cData, error: cErr } = await supabase
        .from('control_cargas_archivos')
        .insert([logRecord])
        .select();
      if (!cErr && cData && cData.length > 0) {
        dbCargaId = cData[0].id_carga;
      }
    } catch (err) {
      console.warn(`[Aviso] No se pudo crear log de auditoría en control_cargas_archivos: ${err.message}`);
    }
    
    // 5. Mapear y Subir según el tipo
    let correctCount = 0;
    let errorCount = 0;
    
    try {
      if (esquemaIdentificado.key === 'MAQUINAS') {
        const mapped = jsonData.map(esquemaIdentificado.mapeo);
        const { error: upsertErr } = await supabase
          .from(esquemaIdentificado.tabla)
          .upsert(mapped, { onConflict: esquemaIdentificado.upsertConflict });
          
        if (upsertErr) throw upsertErr;
        correctCount = mapped.length;
        
      } else if (esquemaIdentificado.key === 'TELEGRAM') {
        const mapped = jsonData.map((r, i) => esquemaIdentificado.mapeo(r, i));
        const stgRecords = mapped.map(m => m.stgRecord);
        const mainRecords = mapped.map(m => m.mainRecord);
        
        if (stgRecords.length > 0) {
          const { error: stgErr } = await supabase
            .from('stg_telegram_ordenes_telares')
            .upsert(stgRecords, { onConflict: 'id' });
          if (stgErr) throw stgErr;
        }
        
        if (mainRecords.length > 0) {
          const { error: prodErr } = await supabase
            .from('ordenes_trabajo')
            .upsert(mainRecords, { onConflict: 'folio' });
          if (prodErr) throw prodErr;
        }
        
        correctCount = jsonData.length;
        
      } else if (esquemaIdentificado.key === 'REFACCIONES') {
        const mapped = jsonData.map(esquemaIdentificado.mapeo);
        const parts = mapped.map(m => m.part);
        const consumptions = mapped.map(m => m.consumption);
        const prices = mapped.map(m => m.price);
        
        // Upsert partes únicas para evitar colisión de FK
        const uniqueParts = Array.from(new Map(parts.map(p => [p.codigo_articulo, p])).values());
        const { error: partErr } = await supabase
          .from('cat_refacciones')
          .upsert(uniqueParts, { onConflict: 'codigo_articulo' });
        if (partErr) throw partErr;
        
        const { error: consErr } = await supabase
          .from('refacciones_por_maquina')
          .insert(consumptions);
        if (consErr) throw consErr;
        
        const { error: priceErr } = await supabase
          .from('historico_precios_refacciones')
          .insert(prices);
        if (priceErr) throw priceErr;
        
        correctCount = jsonData.length;
        
      } else if (esquemaIdentificado.key === 'FALLAS') {
        const mapped = jsonData.map((r, i) => esquemaIdentificado.mapeo(r, i, filename));
        const rawFaults = mapped.map(m => m.rawFault);
        const cleanFaults = mapped.map(m => m.cleanFault);
        
        const { error: rawErr } = await supabase
          .from('stg_fallas_por_maquina_excel')
          .insert(rawFaults);
        if (rawErr) throw rawErr;
        
        const { error: cleanErr } = await supabase
          .from('fallas_por_maquina')
          .insert(cleanFaults);
        if (cleanErr) throw cleanErr;
        
        correctCount = jsonData.length;
      }
      
      // Actualizar registro de control de carga
      if (dbCargaId) {
        await supabase
          .from('control_cargas_archivos')
          .update({
            registros_correctos: correctCount,
            registros_error: errorCount,
            estatus_carga: 'Completada',
            observaciones: `Carga masiva exitosa de ${esquemaIdentificado.nombre}.`
          })
          .eq('id_carga', dbCargaId);
      }
      
      console.log(`[EXITO] Se cargaron ${correctCount} registros a Supabase.`);
      
      // Mover archivo a procesados
      const destPath = path.join(DIRECTORY_PROCESSED, filename);
      fs.renameSync(filePath, destPath);
      console.log(`[INFO] Archivo movido a: "importar_excel/procesados/${filename}"`);
      
      report.exitosos.push({
        archivo: filename,
        tipo: esquemaIdentificado.nombre,
        registros: correctCount
      });
      
    } catch (err) {
      console.error(`[ERROR] Ocurrió un error al subir los registros a Supabase: ${err.message}`);
      errorCount = jsonData.length;
      
      if (dbCargaId) {
        await supabase
          .from('control_cargas_archivos')
          .update({
            registros_correctos: 0,
            registros_error: errorCount,
            estatus_carga: 'Error',
            observaciones: `Error en la base de datos: ${err.message}`
          })
          .eq('id_carga', dbCargaId);
      }
      
      report.omitidos.push({
        archivo: filename,
        razon: `Error durante la inserción en Supabase: ${err.message}`
      });
    }
  }
  
  // 6. Imprimir resumen final
  console.log(`\n======================================================================`);
  console.log(`=== RESUMEN FINAL DE LA IMPORTACIÓN MASIVA ===`);
  console.log(`======================================================================`);
  
  console.log(`\nArchivos Procesados y Cargados con Éxito (${report.exitosos.length}):`);
  if (report.exitosos.length === 0) {
    console.log(' - (Ninguno)');
  } else {
    report.exitosos.forEach(item => {
      console.log(` ✓ [${item.tipo}] "${item.archivo}" -> ${item.registros} registros cargados.`);
    });
  }
  
  console.log(`\nArchivos Omitidos o con Error de Formato (${report.omitidos.length}):`);
  if (report.omitidos.length === 0) {
    console.log(' - (Ninguno. ¡Todos los archivos se cargaron correctamente!)');
  } else {
    report.omitidos.forEach(item => {
      console.log(` ✗ "${item.archivo}"`);
      console.log(`   Razón: ${item.razon}`);
    });
  }
  
  console.log(`\n======================================================================`);
  console.log(`Proceso finalizado. Puedes corregir los archivos omitidos en "importar_excel/"`);
  console.log(`y volver a ejecutar "npm run import-excel" en cualquier momento.`);
  console.log(`======================================================================\n`);
}

// Iniciar
run().catch(err => {
  console.error('Fatal error en el script:', err);
  process.exit(1);
});
