// scratch/inspect_details_ag002.js
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient("https://xqfpsavkefhrxfbtqzec.supabase.co", "sb_publishable_6iHpR6R2yCdqy-YsvCWkSQ_YWg9my_i");

async function inspectDetails() {
  console.log('--- 1. MÁQUINAS POR DEPARTAMENTO / ÁREA ---');
  const { data: machines } = await supabase.from('cat_maquinas').select('equipo_towell, departamento_codigo, area, clave, ax');
  const deptCounts = {};
  for (const m of (machines || [])) {
    const d = m.departamento_codigo || m.area || 'DESCONOCIDO';
    deptCounts[d] = (deptCounts[d] || 0) + 1;
  }
  console.log('Distribución de máquinas:', deptCounts);
  console.log('Total máquinas:', machines?.length);

  console.log('\n--- 2. CRITICIDAD DE MÁQUINAS ---');
  const { data: crit } = await supabase.from('cat_criticidad_maquina').select('nivel_criticidad, count(*)').limit(10);
  const { data: critSample } = await supabase.from('cat_criticidad_maquina').select('maquina_id, nivel_criticidad, descripcion_criticidad').limit(5);
  console.log('Muestra de criticidad:', critSample);

  console.log('\n--- 3. FALLAS POR MÁQUINA (Rango de Fechas & Columnas) ---');
  const { data: fallasSample } = await supabase.from('fallas_por_maquina').select('id_falla, maquina_id, descripcion_falla, fecha_creada, fecha_hora_creada, origen, categoria_falla, es_recurrente').limit(5);
  console.log('Muestra de fallas:', fallasSample);

  console.log('\n--- 4. TELEGRAM (Muestra de Registros) ---');
  const { data: tgSample } = await supabase.from('stg_telegram_ordenes_telares').select('id, folio, fecha, hora, depto, maquina_id, falla, descripcion, cve_atendio').limit(5);
  console.log('Muestra de Telegram:', tgSample);

  console.log('\n--- 5. BITÁCORA MANTENIMIENTO ---');
  const { data: bitacoraSample } = await supabase.from('bitacora_mantenimiento').select('id_bitacora, cve_tecnico, area, maquina_id, fecha_hora_inicio, fecha_hora_fin, descripcion_actividad').limit(5);
  console.log('Muestra de Bitácora:', bitacoraSample);
}

inspectDetails();
