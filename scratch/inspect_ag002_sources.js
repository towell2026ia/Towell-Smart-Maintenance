// scratch/inspect_ag002_sources.js
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient("https://xqfpsavkefhrxfbtqzec.supabase.co", "sb_publishable_6iHpR6R2yCdqy-YsvCWkSQ_YWg9my_i");

async function inspectSources() {
  const tables = [
    'cat_maquinas',
    'cat_departamentos',
    'cat_criticidad_maquina',
    'cat_servicios_mantenimiento',
    'checklists_mantenimiento',
    'respuestas_checklist_orden',
    'respuestas_checklist_predictivo',
    'respuestas_checklist_autonomo',
    'cat_refacciones',
    'refacciones_por_maquina',
    'ordenes_trabajo',
    'fallas_por_maquina',
    'stg_telegram_ordenes_telares',
    'stg_fallas_por_maquina_excel',
    'paros_maquina',
    'bitacora_orden_trabajo',
    'bitacora_mantenimiento',
    'calendarios_mantenimiento',
    'calendario_mantenimiento_detalle',
    'planes_mantenimiento_preventivo'
  ];

  console.log('=== INSPECCIÓN DE TABLAS EN SUPABASE ===');
  for (const t of tables) {
    try {
      const { count, error, data } = await supabase.from(t).select('*', { count: 'exact' }).limit(1);
      if (error) {
        console.log(`❌ ${t.padEnd(35)}: ERROR -> ${error.message}`);
      } else {
        const sampleKeys = data && data[0] ? Object.keys(data[0]).join(', ') : 'EMPTY';
        console.log(`✅ ${t.padEnd(35)}: ${String(count).padStart(6)} filas | Campos: ${sampleKeys.substring(0, 80)}...`);
      }
    } catch (err) {
      console.log(`❌ ${t.padEnd(35)}: EXCEPTION -> ${err.message}`);
    }
  }

  console.log('\n=== INSPECCIÓN DE VISTAS EN SUPABASE ===');
  const views = [
    'vw_preventivo_anual',
    'vw_predictivo_mensual',
    'vw_autonomo_semanal',
    'vw_calendario_consolidado',
    'vw_presupuesto_preventivo_anual'
  ];

  for (const v of views) {
    try {
      const { count, error, data } = await supabase.from(v).select('*', { count: 'exact' }).limit(1);
      if (error) {
        console.log(`❌ ${v.padEnd(35)}: ERROR -> ${error.message}`);
      } else {
        const sampleKeys = data && data[0] ? Object.keys(data[0]).join(', ') : 'EMPTY';
        console.log(`✅ ${v.padEnd(35)}: ${String(count).padStart(6)} filas | Campos: ${sampleKeys.substring(0, 80)}...`);
      }
    } catch (err) {
      console.log(`❌ ${v.padEnd(35)}: EXCEPTION -> ${err.message}`);
    }
  }
}

inspectSources();
