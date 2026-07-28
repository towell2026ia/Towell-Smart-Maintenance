const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://xqfpsavkefhrxfbtqzec.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxZnBzYXZrZWZocnhmYnRxemVjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjE0MzU5NywiZXhwIjoyMDk3NzE5NTk3fQ.o7GCLoa5YoDFWOxfvPayokuJhVYQvd2s5YtEq8DAs2U';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function run() {
  console.log('🚀 Actualizando clasificación personalizada enviada por el usuario...');

  // Asignaciones explícitas indicadas por el usuario:
  const afMachines = [
    'TOW-COM15HP-PT',
    'TOW-COMP30HP-CRUD',
    'TOW-COMP50HP-CRUD',
    'TOW-BOMCIST-PT',
    'TOW-SELL1-PT',
    'TOW-SELL2-PT',
    'TOW-SELL3-PT',
    'TOW-SELL4-PT',
    'TOW-SELL5-PT'
  ];

  const cfMachines = [
    'TOW-DETMET1-PT'
  ];

  // 1. Actualizar cat_maquinas
  console.log(`💾 Actualizando ${afMachines.length} máquinas en área AF...`);
  await supabase.from('cat_maquinas').update({ departamento_codigo: 'AF', area: 'AF' }).in('equipo_towell', afMachines);

  console.log(`💾 Actualizando ${cfMachines.length} máquinas en área CF...`);
  await supabase.from('cat_maquinas').update({ departamento_codigo: 'CF', area: 'CF' }).in('equipo_towell', cfMachines);

  // 2. Actualizar ordenes_trabajo
  const { data: ordenes } = await supabase.from('ordenes_trabajo').select('id_orden, maquina_id');
  if (ordenes) {
    const afOtIds = ordenes.filter(o => afMachines.includes(o.maquina_id)).map(o => o.id_orden);
    const cfOtIds = ordenes.filter(o => cfMachines.includes(o.maquina_id)).map(o => o.id_orden);

    if (afOtIds.length > 0) {
      await supabase.from('ordenes_trabajo').update({ area: 'AF' }).in('id_orden', afOtIds);
    }
    if (cfOtIds.length > 0) {
      await supabase.from('ordenes_trabajo').update({ area: 'CF' }).in('id_orden', cfOtIds);
    }
  }

  // 3. Imprimir listado actualizado completo de AF
  const { data: allAf } = await supabase.from('cat_maquinas').select('equipo_towell').eq('departamento_codigo', 'AF');
  console.log('\n============================================================');
  console.log(`📌 LISTADO FINAL ACTUALIZADO DE MÁQUINAS EN AF (TOTAL: ${allAf ? allAf.length : 0})`);
  console.log('============================================================');
  (allAf || []).sort((a,b) => a.equipo_towell.localeCompare(b.equipo_towell)).forEach((m, idx) => {
    console.log(`${idx + 1}. ${m.equipo_towell}`);
  });

  console.log('\n🎉 Actualización completada con éxito.');
}

run();
