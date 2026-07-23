const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://xqfpsavkefhrxfbtqzec.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_6iHpR6R2yCdqy-YsvCWkSQ_YWg9my_i';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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

async function check() {
  const { data, error } = await supabase.from('cat_estatus_orden').upsert(estatus, { onConflict: 'codigo_estatus' }).select();
  if (error) {
    console.error('UPSERT ERROR:', error);
  } else {
    console.log('UPSERT SUCCESS:', data);
  }
}
check();
