const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://xqfpsavkefhrxfbtqzec.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_6iHpR6R2yCdqy-YsvCWkSQ_YWg9my_i';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  console.log('--- Insertando Catálogos ---');
  // 1. Departamentos
  const deptos = [
    { codigo_departamento: 'PF', nombre_departamento: 'Producción' },
    { codigo_departamento: 'CF', nombre_departamento: 'Costura' },
    { codigo_departamento: 'TF', nombre_departamento: 'Tintorería' },
    { codigo_departamento: 'AF', nombre_departamento: 'Planta / Servicios Auxiliares' }
  ];
  await supabase.from('cat_departamentos').upsert(deptos, { onConflict: 'codigo_departamento' });

  // 2. Estatus
  const estatus = [
    { codigo_estatus: 'Solicitud recibida', descripcion: 'Recién ingresada desde app', estado_operativo: 'Abierto' },
    { codigo_estatus: 'Asignada', descripcion: 'Asignada a técnico', estado_operativo: 'Abierto' },
    { codigo_estatus: 'En revisión', descripcion: 'Técnico en campo', estado_operativo: 'En Proceso' },
    { codigo_estatus: 'En ejecución con subtareas', descripcion: 'Tiene subtareas de fallas múltiples', estado_operativo: 'En Proceso' },
    { codigo_estatus: 'Programada', descripcion: 'Postergada/Programada para fecha', estado_operativo: 'En Proceso' },
    { codigo_estatus: 'Rechazada', descripcion: 'Cancelada/Rechazada por Admin', estado_operativo: 'Cerrado' },
    { codigo_estatus: 'cancelada', descripcion: 'Cancelada', estado_operativo: 'Cerrado' },
    { codigo_estatus: 'solicitada', descripcion: 'Refacción solicitada', estado_operativo: 'Abierto' },
    { codigo_estatus: 'Completada', descripcion: 'Finalizada', estado_operativo: 'Cerrado' }
  ];
  await supabase.from('cat_estatus_orden').upsert(estatus, { onConflict: 'codigo_estatus' });

  // 3. Turnos
  const turnos = [
    { id_turno: 1, nombre_turno: 'Mañana', horario_inicio: '06:00', horario_fin: '14:00' },
    { id_turno: 2, nombre_turno: 'Tarde', horario_inicio: '14:00', horario_fin: '22:00' },
    { id_turno: 3, nombre_turno: 'Noche', horario_inicio: '22:00', horario_fin: '06:00' }
  ];
  await supabase.from('cat_turnos').upsert(turnos, { onConflict: 'id_turno' });
  
  console.log('Catálogos base poblados exitosamente.');

  console.log('\n--- Simulación de dbInsertRequest ---');
  // Obtener una máquina con refacciones:
  const { data: refData } = await supabase.from('refacciones_por_maquina').select('maquina_id').limit(1);
  const targetMachine = refData[0]?.maquina_id || 'TOW-LAFER-RASU';
  
  const testDate = new Date().toISOString();
  
  const insertData = {
    folio: 'PF00099',
    orden_trabajo: 'Mecánica',
    origen: 'App',
    estatus: 'Solicitud recibida',
    fecha_inicio: testDate.split('T')[0],
    hora_inicio: testDate.split('T')[1].split('.')[0],
    fecha_hora_inicio: testDate,
    departamento: 'PF',
    maquina_id: targetMachine,
    falla: 'Mecánica',
    descripcion: 'Prueba E2E de inserción de solicitud',
    nombre_solicitante: 'Admin Test',
    turno_solicitante: 1,
    prioridad: 'Alta',
    fecha_carga: testDate
  };
  
  const { error: insErr } = await supabase.from('ordenes_trabajo').insert([insertData]);
  if (insErr) {
    console.error('Error insertando test order:', insErr);
  } else {
    console.log(`Orden PF00099 insertada con éxito para la máquina ${targetMachine}.`);
    
    console.log('\n--- Verificando cruce de datos ---');
    const { data: q1, error: err1 } = await supabase
      .from('ordenes_trabajo')
      .select('folio, estatus, departamento, maquina_id, cat_maquinas(id_maquina, tipo_equipo)')
      .eq('folio', 'PF00099');
      
    if (q1 && q1.length) {
      console.log('Link con Máquinas Funciona:', q1[0].cat_maquinas !== null ? 'SI' : 'NO');
    }
    
    const { data: q2 } = await supabase
      .from('refacciones_por_maquina')
      .select('nombre_articulo')
      .eq('maquina_id', targetMachine)
      .limit(3);
      
    if (q2 && q2.length) {
      console.log('Se detectaron historial de refacciones para esta máquina:', q2.length, 'ítems (ej.', q2[0].nombre_articulo, ')');
    }
    
    // Clean up test order
    await supabase.from('ordenes_trabajo').delete().eq('folio', 'PF00099');
    console.log('Orden de prueba eliminada.');
  }
}
run();
