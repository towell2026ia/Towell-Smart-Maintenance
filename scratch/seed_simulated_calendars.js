const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://xqfpsavkefhrxfbtqzec.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxZnBzYXZrZWZocnhmYnRxemVjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjE0MzU5NywiZXhwIjoyMDk3NzE5NTk3fQ.o7GCLoa5YoDFWOxfvPayokuJhVYQvd2s5YtEq8DAs2U';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function run() {
  console.log('🚀 Generando Calendarios Simulados (Preventivo y Autónomo)...');

  // 1. Obtener todas las máquinas activas del catálogo
  const { data: maquinas, error: mErr } = await supabase
    .from('cat_maquinas')
    .select('equipo_towell, departamento_codigo, area');

  if (mErr || !maquinas || maquinas.length === 0) {
    console.error('❌ Error al obtener máquinas:', mErr);
    return;
  }

  console.log(`📋 Se encontraron ${maquinas.length} máquinas activas.`);

  // Limpiar calendarios anteriores de simulación para evitar duplicados en la vista previa
  const { data: existingCals } = await supabase
    .from('calendarios_mantenimiento')
    .select('id_calendario');

  if (existingCals && existingCals.length > 0) {
    const ids = existingCals.map(c => c.id_calendario);
    await supabase.from('calendario_mantenimiento_detalle').delete().in('id_calendario', ids);
    await supabase.from('calendarios_mantenimiento').delete().in('id_calendario', ids);
    console.log('🧹 Se limpiaron calendarios simulados previos.');
  }

  // ============================================================
  // 2. CREAR CALENDARIO PREVENTIVO ANUAL SIMULADO 2026
  // ============================================================
  console.log('📅 Creando Cabecera de Calendario PREVENTIVO Anual 2026...');
  const { data: calPrevHeader, error: hPrevErr } = await supabase
    .from('calendarios_mantenimiento')
    .insert([{
      tipo_calendario: 'PREVENTIVO',
      anio: 2026,
      fecha_inicio_periodo: '2026-01-01',
      fecha_fin_periodo: '2026-12-31',
      estatus_calendario: 'PROPUESTO',
      observaciones: 'Calendario Preventivo Anual Simulado para 135 Máquinas'
    }])
    .select();

  if (hPrevErr || !calPrevHeader) {
    console.error('❌ Error creando cabecera preventivo:', hPrevErr);
    return;
  }

  const idCalPrev = calPrevHeader[0].id_calendario;
  const preventivoDetails = [];

  // Distribuir las 135 máquinas uniformemente a lo largo de los 12 meses de 2026
  maquinas.forEach((m, idx) => {
    const month = (idx % 12) + 1;
    const day = Math.min(1 + Math.floor((idx / 12) * 2), 28);
    const monthStr = String(month).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const fechaProg = `2026-${monthStr}-${dayStr}`;

    const isItema = m.equipo_towell.includes('TEL') || m.equipo_towell.includes('300') || m.equipo_towell.includes('ITEMA');
    const actividad = isItema ? 'Preventivo Mecánico ITEMA 300' : `Preventivo Anual - ${m.equipo_towell}`;
    const descripcion = isItema ? 'Mantenimiento Preventivo Mecánico para Telar ITEMA (MPE_MECA_ITEMA)' : `Mantenimiento Preventivo Programado Anual para equipo ${m.equipo_towell}`;

    preventivoDetails.push({
      id_calendario: idCalPrev,
      maquina_id: m.equipo_towell,
      tipo_mantenimiento: 'PREVENTIVO',
      actividad_sugerida: actividad,
      fecha_programada: fechaProg,
      prioridad: idx % 5 === 0 ? 'ALTA' : 'MEDIA',
      estatus_detalle: 'PROPUESTO',
      observaciones: descripcion
    });
  });

  console.log(`💾 Insertando ${preventivoDetails.length} detalles de Preventivo Anual...`);
  const { error: dPrevErr } = await supabase
    .from('calendario_mantenimiento_detalle')
    .insert(preventivoDetails);

  if (dPrevErr) console.error('❌ Error insertando detalles preventivo:', dPrevErr);
  else console.log('✅ Calendario Preventivo Anual 2026 creado con éxito.');

  // ============================================================
  // 3. CREAR CALENDARIO AUTÓNOMO SEMANAL SIMULADO 2026
  // ============================================================
  console.log('📅 Creando Cabecera de Calendario AUTÓNOMO Semanal 2026...');
  const { data: calAutoHeader, error: hAutoErr } = await supabase
    .from('calendarios_mantenimiento')
    .insert([{
      tipo_calendario: 'AUTONOMO',
      anio: 2026,
      mes: 8,
      semana: 31,
      fecha_inicio_periodo: '2026-08-01',
      fecha_fin_periodo: '2026-08-31',
      estatus_calendario: 'PROPUESTO',
      observaciones: 'Calendario Autónomo Semanal Simulado para Inspección de 5 Bloques'
    }])
    .select();

  if (hAutoErr || !calAutoHeader) {
    console.error('❌ Error creando cabecera autónomo:', hAutoErr);
    return;
  }

  const idCalAuto = calAutoHeader[0].id_calendario;
  const autonomoDetails = [];

  // Seleccionar una muestra de máquinas por semana para inspección autónoma
  maquinas.forEach((m, idx) => {
    if (idx % 2 === 0) { // Muestra representativa de máquinas
      const day = (idx % 25) + 1;
      const dayStr = String(day).padStart(2, '0');
      const fechaProg = `2026-08-${dayStr}`;

      autonomoDetails.push({
        id_calendario: idCalAuto,
        maquina_id: m.equipo_towell,
        tipo_mantenimiento: 'AUTONOMO',
        actividad_sugerida: `Inspección Autónoma - ${m.equipo_towell}`,
        fecha_programada: fechaProg,
        prioridad: 'MEDIA',
        estatus_detalle: 'PROPUESTO',
        observaciones: 'Revisión autónoma programada: Vibración (mm/s, Hz), Limpieza, Lubricación, Temperatura (°C) y Cableado.'
      });
    }
  });

  console.log(`💾 Insertando ${autonomoDetails.length} detalles de Autónomo Semanal...`);
  const { error: dAutoErr } = await supabase
    .from('calendario_mantenimiento_detalle')
    .insert(autonomoDetails);

  if (dAutoErr) console.error('❌ Error insertando detalles autónomo:', dAutoErr);
  else console.log('✅ Calendario Autónomo Semanal 2026 creado con éxito.');

  console.log('🎉 Simulación completada. Ambos calendarios están listos en la interfaz y en Supabase.');
}

run();
