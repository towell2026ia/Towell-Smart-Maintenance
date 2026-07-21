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
    { codigo_estatus: 'solicitud_recibida', nombre_estatus: 'Solicitud Recibida', orden_flujo: 1, es_inicial: true },
    { codigo_estatus: 'asignada', nombre_estatus: 'Asignada', orden_flujo: 2 },
    { codigo_estatus: 'en_proceso', nombre_estatus: 'En Proceso', orden_flujo: 3 },
    { codigo_estatus: 'en_revision', nombre_estatus: 'En Revisión', orden_flujo: 4 },
    { codigo_estatus: 'en_ejecucion_con_subtareas', nombre_estatus: 'En Ejecución con Subtareas', orden_flujo: 5 },
    { codigo_estatus: 'programada', nombre_estatus: 'Programada', orden_flujo: 6 },
    { codigo_estatus: 'lista_para_validacion', nombre_estatus: 'Lista para Validación', orden_flujo: 7 },
    { codigo_estatus: 'ejecutada', nombre_estatus: 'Ejecutada', orden_flujo: 8 },
    { codigo_estatus: 'cerrada', nombre_estatus: 'Cerrada', orden_flujo: 9, es_final: true },
    { codigo_estatus: 'rechazada', nombre_estatus: 'Rechazada', orden_flujo: 10, es_final: true },
    { codigo_estatus: 'cancelada', nombre_estatus: 'Cancelada', orden_flujo: 11, es_final: true },
    { codigo_estatus: 'solicitada', nombre_estatus: 'Refacción Solicitada', orden_flujo: 12 }
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
