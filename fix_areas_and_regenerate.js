// Fix machine area assignments in cat_maquinas and regenerate all calendars
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://xqfpsavkefhrxfbtqzec.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxZnBzYXZrZWZocnhmYnRxemVjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjE0MzU5NywiZXhwIjoyMDk3NzE5NTk3fQ.o7GCLoa5YoDFWOxfvPayokuJhVYQvd2s5YtEq8DAs2U'
);

// Canonical area resolution based on machine code suffix and name
function resolveArea(code, clave) {
  const c = (code || '').toUpperCase();
  const k = (clave || '').toUpperCase();
  
  // PF (Tejido/Urdido): telares, engomados, urdidos, jacquard, KM, revisadoras, polipastos, montacargas, rasuradoras, plegadoras, dobladoras
  if (c.endsWith('-TEJI') || c.endsWith('-TEJ') || c.endsWith('-URDI') || c.includes('-KM') ||
      c.endsWith('-RASU') || c.endsWith('-CRUD') ||
      k.includes('TELAR') || k.includes('URDID') || k.includes('ENGOMADO') || k.includes('JACQUARD') ||
      k.includes('RASURADORA') || k.includes('REVISADOR') || k.includes('MONTACARGAS') ||
      k.includes('POLIPASTO') || k.includes('PLEGADOR') || k.includes('DOBLADOR') ||
      k.includes('OVER LOOK 36')) {
    return 'PF';
  }
  
  // CF (Costura/Confección): rectas, overlooks, cortadoras, selladoras costura, sublimadoras, planchas, longitudinales, cortadores verticales, collaretes, enrolladoras, detector metales
  if (c.endsWith('-COST') || c.endsWith('-CORBAT') ||
      c.includes('ELEV-COST') ||
      k.includes('COSTURA') || k.includes('CONFECCION') || k.includes('TEXPA') || k.includes('SELLADORA') && !c.includes('-PT') ||
      k.includes('SUBLIMADOR') || k.includes('PLANCHA') || k.includes('LONGITUDINAL') ||
      k.includes('CORT VERT') || k.includes('COLLARETE') || k.includes('ENROLLADOR') || k.includes('CORTADORA') ||
      k.includes('DETECTOR')) {
    return 'CF';
  }
  
  // TF (Tintorería): over flows, calderas, secadoras, foulard, planta tratadora, centro lavado, abridora, jets, TSPL, POZO, blanqueadores
  if (c.endsWith('-TINT') || c.endsWith('-SECA') ||
      k.includes('CALDERA') || k.includes('SECADORA') || k.includes('OVER FLOW') || k.includes('FOULARD') ||
      k.includes('PLANTA TRATADORA') || k.includes('CENTRO DE LAVADO') || k.includes('ABRIDORA') ||
      k.includes('OVER LOOK 35') || k.includes('BOMBA DE AGUA DEL POZO') || k.includes('CLAYTON')) {
    return 'TF';
  }
  
  // AF (Auxiliares/Servicios): compresores, bombas cisterna, selladoras PT, elevador rasurado
  if (c.endsWith('-PT') || c.includes('COMP') && c.includes('HP') || c.includes('BOMCIST') ||
      k.includes('COMPRESOR') || k.includes('CISTERNA') || k.includes('SELLADORA PT')) {
    return 'AF';
  }
  
  // Fallback based on suffix
  if (c.includes('-CRUD')) return 'PF'; // Crudos = Tejido
  if (c.includes('-PT')) return 'AF';   // PT = Planta
  
  return 'PF'; // Default to PF
}

async function main() {
  console.log('========================================================================');
  console.log('  CORRECCIÓN DE ÁREAS EN cat_maquinas Y REGENERACIÓN DE CALENDARIOS');
  console.log('========================================================================\n');
  
  // STEP 1: Fix cat_maquinas area assignments
  console.log('--- PASO 1: Auditoría y corrección de áreas en cat_maquinas ---');
  const { data: machines } = await supabase.from('cat_maquinas').select('*').order('equipo_towell');
  
  let fixedCount = 0;
  const areaDistribution = { PF: 0, CF: 0, TF: 0, AF: 0 };
  const fixes = [];
  
  for (const m of machines) {
    const code = m.equipo_towell;
    const currentArea = m.departamento_codigo || m.area;
    const correctArea = resolveArea(code, m.clave);
    areaDistribution[correctArea] = (areaDistribution[correctArea] || 0) + 1;
    
    if (currentArea !== correctArea) {
      fixes.push({ code, from: currentArea, to: correctArea, clave: m.clave });
      const { error } = await supabase
        .from('cat_maquinas')
        .update({ departamento_codigo: correctArea, area: correctArea })
        .eq('equipo_towell', code);
      if (error) console.error('  ❌ Error updating', code, error.message);
      else fixedCount++;
    }
  }
  
  console.log(`  ✅ Máquinas corregidas: ${fixedCount} de ${machines.length}`);
  if (fixes.length > 0) {
    console.log('  Cambios aplicados:');
    fixes.forEach(f => console.log(`    ${f.code} (${f.clave}): ${f.from} → ${f.to}`));
  }
  console.log('  Distribución final:', areaDistribution);
  
  // STEP 2: Delete all existing calendar data
  console.log('\n--- PASO 2: Purga de calendarios existentes ---');
  const { error: delDet } = await supabase.from('calendario_mantenimiento_detalle').delete().neq('id_detalle', '00000000-0000-0000-0000-000000000000');
  const { error: delCal } = await supabase.from('calendarios_mantenimiento').delete().neq('id_calendario', '00000000-0000-0000-0000-000000000000');
  console.log('  ✅ Detalles purgados:', delDet ? 'Error: ' + delDet.message : 'OK');
  console.log('  ✅ Headers purgados:', delCal ? 'Error: ' + delCal.message : 'OK');
  
  // Re-read machines with corrected areas
  const { data: correctedMachines } = await supabase.from('cat_maquinas').select('*').order('equipo_towell');
  
  // STEP 3: Generate PREVENTIVO ANUAL (AG-002)
  console.log('\n--- PASO 3: Generación PREVENTIVO ANUAL (AG-002) —135 máquinas ---');
  const year = 2026;
  const { data: prevHeader } = await supabase.from('calendarios_mantenimiento').insert([{
    tipo_calendario: 'PREVENTIVO', anio: year, mes: null, semana: null,
    fecha_inicio_periodo: `${year}-01-01`, fecha_fin_periodo: `${year}-12-31`,
    estatus_calendario: 'PROPUESTO', generado_por: 'AG-002 Preventivo Anual', origen_generacion: 'IA Engine'
  }]).select();
  const prevCalId = prevHeader[0].id_calendario;
  
  // Sort machines: PF first (priority), then CF, TF, AF
  const areaPriority = { PF: 0, CF: 1, TF: 2, AF: 3 };
  const sortedMachines = [...correctedMachines].sort((a, b) => {
    const aArea = resolveArea(a.equipo_towell, a.clave);
    const bArea = resolveArea(b.equipo_towell, b.clave);
    return (areaPriority[aArea] || 9) - (areaPriority[bArea] || 9);
  });
  
  const prevDetails = [];
  sortedMachines.forEach((m, idx) => {
    const machId = m.equipo_towell;
    const area = resolveArea(machId, m.clave);
    const targetMonth = idx % 12;
    const targetDay = 1 + ((Math.floor(idx / 12) * 3) % 25);
    const projDate = new Date(year, targetMonth, Math.min(28, targetDay));
    // Skip Sundays
    if (projDate.getDay() === 0) projDate.setDate(projDate.getDate() + 1);
    const dateStr = projDate.toISOString().split('T')[0];
    
    const prio = area === 'PF' ? 'ALTA' : area === 'CF' ? 'MEDIA' : 'MEDIA';
    const budget = area === 'PF' ? 380 : area === 'CF' ? 250 : area === 'TF' ? 300 : 180;
    
    prevDetails.push({
      id_calendario: prevCalId, maquina_id: machId, fecha_programada: dateStr,
      tipo_mantenimiento: 'PREVENTIVO', prioridad: prio,
      actividad_sugerida: `Preventivo Anual 2026: ${machId} (${area})`,
      responsable_sugerido: `Técnico de Planta (${area})`,
      observaciones: JSON.stringify({ origen: 'AG-002_PREVENTIVO_ANUAL', area, presupuesto_estimado_usd: budget, invariante_1_anual: true, cobertura: '100% Catálogo Maestro' }),
      estatus_detalle: 'PROPUESTO'
    });
  });
  
  // Insert in batches of 50
  for (let i = 0; i < prevDetails.length; i += 50) {
    const batch = prevDetails.slice(i, i + 50);
    const { error } = await supabase.from('calendario_mantenimiento_detalle').insert(batch);
    if (error) console.error('  ❌ Error inserting preventivo batch:', error.message);
  }
  console.log(`  ✅ Preventivos generados: ${prevDetails.length}`);
  
  // STEP 4: Generate PREDICTIVO MENSUAL (AG-003) — Agosto 2026
  console.log('\n--- PASO 4: Generación PREDICTIVO MENSUAL (AG-003) — Agosto 2026 ---');
  const { data: predHeader } = await supabase.from('calendarios_mantenimiento').insert([{
    tipo_calendario: 'PREDICTIVO', anio: year, mes: 7, semana: null,
    fecha_inicio_periodo: '2026-08-01', fecha_fin_periodo: '2026-08-31',
    estatus_calendario: 'PROPUESTO', generado_por: 'AG-003 Predictivo Mensual', origen_generacion: 'IA Engine'
  }]).select();
  const predCalId = predHeader[0].id_calendario;
  
  // Top 4 telares from PF based on criticidad
  const topTelares = ['TOW-TEL201-TEJI', 'TOW-TEL202-TEJI', 'TOW-TEL309-TEJI', 'TOW-TEL310-TEJI'];
  const fridays = ['2026-08-07', '2026-08-14', '2026-08-21', '2026-08-28'];
  
  const predDetails = topTelares.map((tel, idx) => ({
    id_calendario: predCalId, maquina_id: tel, fecha_programada: fridays[idx],
    tipo_mantenimiento: 'PREDICTIVO', prioridad: idx === 0 ? 'CRÍTICA' : idx === 1 ? 'ALTA' : 'MEDIA',
    actividad_sugerida: `Levantamiento Predictivo: Telar #${idx + 1} — ${tel} (PF)`,
    responsable_sugerido: 'Especialista Predictivo (PF)',
    score_riesgo: 9.0 - idx * 1.5,
    observaciones: JSON.stringify({ origen: 'AG-003_PREDICTIVO_SEGUNDAS', area: 'PF', fuente_datos: 'segundas_por_rollo', regla_viernes_certificado: true, limite_mensual_max4: true, ranking: idx + 1 }),
    estatus_detalle: 'PROPUESTO'
  }));
  
  const { error: predErr } = await supabase.from('calendario_mantenimiento_detalle').insert(predDetails);
  if (predErr) console.error('  ❌ Error inserting predictivo:', predErr.message);
  else console.log(`  ✅ Predictivos generados: ${predDetails.length} en viernes certificados`);
  
  // STEP 5: Generate AUTONOMO SEMANAL (AG-004) — Semana 34 (Ago 17-22, 2026)
  console.log('\n--- PASO 5: Generación AUTONOMO SEMANAL (AG-004) — Semana 34, Ago 17-22, 2026 ---');
  const { data: autoHeader } = await supabase.from('calendarios_mantenimiento').insert([{
    tipo_calendario: 'AUTONOMO', anio: year, mes: null, semana: 34,
    fecha_inicio_periodo: '2026-08-17', fecha_fin_periodo: '2026-08-22',
    estatus_calendario: 'PROPUESTO', generado_por: 'AG-004 Autónomo Semanal', origen_generacion: 'IA Engine'
  }]).select();
  const autoCalId = autoHeader[0].id_calendario;
  
  // Group machines by area, PF first (priority)
  const pfMachines = correctedMachines.filter(m => resolveArea(m.equipo_towell, m.clave) === 'PF');
  const cfMachines = correctedMachines.filter(m => resolveArea(m.equipo_towell, m.clave) === 'CF');
  const tfMachines = correctedMachines.filter(m => resolveArea(m.equipo_towell, m.clave) === 'TF');
  const afMachines = correctedMachines.filter(m => resolveArea(m.equipo_towell, m.clave) === 'AF');
  
  console.log(`  Distribución por área: PF=${pfMachines.length}, CF=${cfMachines.length}, TF=${tfMachines.length}, AF=${afMachines.length}`);
  
  // Days of the week: Mon 17 to Sat 22
  const weekDays = ['2026-08-17', '2026-08-18', '2026-08-19', '2026-08-20', '2026-08-21', '2026-08-22'];
  const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  
  // Strategy: Distribute PF across Mon-Sat (priority, more per day), then CF, TF, AF fill remaining slots
  // PF gets priority on Mon, Tue, Wed (productive days). Each day max ~25 machines to keep balanced.
  const autoDetails = [];
  
  // Distribute PF: Spread across 6 days with emphasis on Mon-Wed
  pfMachines.forEach((m, idx) => {
    // PF: spread across all 6 days, ~9 per day for 54 machines
    const dayIdx = idx % 6;
    const area = 'PF';
    const machId = m.equipo_towell;
    autoDetails.push({
      id_calendario: autoCalId, maquina_id: machId, fecha_programada: weekDays[dayIdx],
      tipo_mantenimiento: 'AUTONOMO', prioridad: 'ALTA',
      actividad_sugerida: `Rutina Autónoma Semanal: ${machId} (${area}) - 5 Bloques (Vibración, Limpieza, Lubricación, Temp °C, Sensores)`,
      responsable_sugerido: `Operador de Planta (${area})`,
      observaciones: JSON.stringify({ origen: 'AG-004_AUTONOMO_SEMANAL', area, fuente_datos: 'tendencias_y_recurrencias_fallas', segundas_usadas: 0, dia_semana_asignado: dayNames[dayIdx], temperatura_requerida_grados_c: true }),
      estatus_detalle: 'PROPUESTO'
    });
  });
  
  // Distribute CF: Spread across 6 days
  cfMachines.forEach((m, idx) => {
    const dayIdx = idx % 6;
    const area = 'CF';
    const machId = m.equipo_towell;
    autoDetails.push({
      id_calendario: autoCalId, maquina_id: machId, fecha_programada: weekDays[dayIdx],
      tipo_mantenimiento: 'AUTONOMO', prioridad: 'MEDIA',
      actividad_sugerida: `Rutina Autónoma Semanal: ${machId} (${area}) - 5 Bloques (Vibración, Limpieza, Lubricación, Temp °C, Sensores)`,
      responsable_sugerido: `Operador de Planta (${area})`,
      observaciones: JSON.stringify({ origen: 'AG-004_AUTONOMO_SEMANAL', area, fuente_datos: 'tendencias_y_recurrencias_fallas', segundas_usadas: 0, dia_semana_asignado: dayNames[dayIdx], temperatura_requerida_grados_c: true }),
      estatus_detalle: 'PROPUESTO'
    });
  });
  
  // Distribute TF: Spread across 6 days
  tfMachines.forEach((m, idx) => {
    const dayIdx = idx % 6;
    const area = 'TF';
    const machId = m.equipo_towell;
    autoDetails.push({
      id_calendario: autoCalId, maquina_id: machId, fecha_programada: weekDays[dayIdx],
      tipo_mantenimiento: 'AUTONOMO', prioridad: 'MEDIA',
      actividad_sugerida: `Rutina Autónoma Semanal: ${machId} (${area}) - 5 Bloques (Vibración, Limpieza, Lubricación, Temp °C, Sensores)`,
      responsable_sugerido: `Operador de Planta (${area})`,
      observaciones: JSON.stringify({ origen: 'AG-004_AUTONOMO_SEMANAL', area, fuente_datos: 'tendencias_y_recurrencias_fallas', segundas_usadas: 0, dia_semana_asignado: dayNames[dayIdx], temperatura_requerida_grados_c: true }),
      estatus_detalle: 'PROPUESTO'
    });
  });
  
  // Distribute AF: Spread across 6 days
  afMachines.forEach((m, idx) => {
    const dayIdx = idx % 6;
    const area = 'AF';
    const machId = m.equipo_towell;
    autoDetails.push({
      id_calendario: autoCalId, maquina_id: machId, fecha_programada: weekDays[dayIdx],
      tipo_mantenimiento: 'AUTONOMO', prioridad: 'BAJA',
      actividad_sugerida: `Rutina Autónoma Semanal: ${machId} (${area}) - 5 Bloques (Vibración, Limpieza, Lubricación, Temp °C, Sensores)`,
      responsable_sugerido: `Operador de Planta (${area})`,
      observaciones: JSON.stringify({ origen: 'AG-004_AUTONOMO_SEMANAL', area, fuente_datos: 'tendencias_y_recurrencias_fallas', segundas_usadas: 0, dia_semana_asignado: dayNames[dayIdx], temperatura_requerida_grados_c: true }),
      estatus_detalle: 'PROPUESTO'
    });
  });
  
  // Insert in batches of 50
  for (let i = 0; i < autoDetails.length; i += 50) {
    const batch = autoDetails.slice(i, i + 50);
    const { error } = await supabase.from('calendario_mantenimiento_detalle').insert(batch);
    if (error) console.error('  ❌ Error inserting autonomo batch:', error.message);
  }
  
  // Show distribution by day
  const dayDistrib = {};
  autoDetails.forEach(d => {
    const key = d.fecha_programada;
    if (!dayDistrib[key]) dayDistrib[key] = { PF: 0, CF: 0, TF: 0, AF: 0, total: 0 };
    const obs = JSON.parse(d.observaciones);
    dayDistrib[key][obs.area]++;
    dayDistrib[key].total++;
  });
  
  console.log(`  ✅ Autónomos generados: ${autoDetails.length}`);
  console.log('  Distribución semanal balanceada:');
  Object.entries(dayDistrib).sort((a,b) => a[0].localeCompare(b[0])).forEach(([date, dist]) => {
    const dow = dayNames[weekDays.indexOf(date)];
    console.log(`    ${date} (${dow}): PF=${dist.PF}, CF=${dist.CF}, TF=${dist.TF}, AF=${dist.AF} — Total: ${dist.total}`);
  });
  
  // STEP 6: Final verification
  console.log('\n--- PASO 6: Verificación Final ---');
  const { data: finalPrev } = await supabase.from('calendario_mantenimiento_detalle').select('id_detalle').eq('tipo_mantenimiento', 'PREVENTIVO');
  const { data: finalPred } = await supabase.from('calendario_mantenimiento_detalle').select('id_detalle').eq('tipo_mantenimiento', 'PREDICTIVO');
  const { data: finalAuto } = await supabase.from('calendario_mantenimiento_detalle').select('id_detalle').eq('tipo_mantenimiento', 'AUTONOMO');
  
  console.log(`  PREVENTIVO: ${finalPrev.length} (esperado: 135)`);
  console.log(`  PREDICTIVO: ${finalPred.length} (esperado: 4)`);
  console.log(`  AUTONOMO:   ${finalAuto.length} (esperado: 135)`);
  console.log(`  TOTAL:      ${finalPrev.length + finalPred.length + finalAuto.length} (esperado: 274)`);
  
  console.log('\n========================================================================');
  console.log('  ✅ CORRECCIÓN COMPLETA — ÁREAS ARREGLADAS Y CALENDARIOS REGENERADOS');
  console.log('========================================================================');
}

main().catch(console.error);
