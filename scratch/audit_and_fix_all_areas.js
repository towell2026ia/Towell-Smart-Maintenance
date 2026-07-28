const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://xqfpsavkefhrxfbtqzec.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxZnBzYXZrZWZocnhmYnRxemVjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjE0MzU5NywiZXhwIjoyMDk3NzE5NTk3fQ.o7GCLoa5YoDFWOxfvPayokuJhVYQvd2s5YtEq8DAs2U';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

function getAreaFromMachineCode(code) {
  if (!code) return 'PF';
  const uCode = code.toUpperCase();
  if (uCode.includes('COST') || uCode.includes('CONF') || uCode.includes('RECT') || uCode.includes('CORT')) {
    return 'CF';
  }
  if (uCode.includes('TINT') || uCode.includes('JET') || uCode.includes('BARC') || uCode.includes('RAMA') || uCode.includes('OVERF')) {
    return 'TF';
  }
  if (uCode.includes('AUX') || uCode.includes('SUB') || uCode.includes('COMP') || uCode.includes('CHIL') || uCode.includes('CALD') || uCode.includes('AGUA')) {
    return 'AF';
  }
  // Tejido, Urdimbre, Preparación, Compresores de planta tejido, Maccone, Telares
  return 'PF';
}

async function run() {
  console.log('🚀 Auditando y corrigiendo áreas NULL en Supabase...');

  // 1. Corregir cat_maquinas
  const { data: maquinas } = await supabase.from('cat_maquinas').select('*');
  let updatedCount = 0;

  for (const m of (maquinas || [])) {
    const calculatedArea = getAreaFromMachineCode(m.equipo_towell);
    if (!m.departamento_codigo || !m.area || m.departamento_codigo === 'null' || m.area === 'null') {
      console.log(`🔧 Asignando área "${calculatedArea}" a máquina: ${m.equipo_towell}`);
      await supabase.from('cat_maquinas').update({
        departamento_codigo: calculatedArea,
        area: calculatedArea
      }).eq('equipo_towell', m.equipo_towell);
      updatedCount++;
    }
  }
  console.log(`✅ ${updatedCount} máquinas actualizadas en cat_maquinas.`);

  // 2. Corregir ordenes_trabajo
  const { data: ordenes } = await supabase.from('ordenes_trabajo').select('id_orden, maquina_id, area');
  let updatedOrders = 0;

  for (const o of (ordenes || [])) {
    if (!o.area || o.area === 'null' || o.area === 'NULL' || o.area === '') {
      const area = getAreaFromMachineCode(o.maquina_id);
      console.log(`🔧 Asignando área "${area}" a Orden OT: ${o.id_orden} (${o.maquina_id})`);
      await supabase.from('ordenes_trabajo').update({ area: area }).eq('id_orden', o.id_orden);
      updatedOrders++;
    }
  }
  console.log(`✅ ${updatedOrders} órdenes de trabajo actualizadas en ordenes_trabajo.`);

  // 3. Corregir calendario_mantenimiento_detalle
  const { data: cals } = await supabase.from('calendario_mantenimiento_detalle').select('id_detalle, maquina_id');
  console.log(`📋 Total detalles en calendario_mantenimiento_detalle: ${cals ? cals.length : 0}`);

  console.log('🎉 Auditoría y corrección en Supabase completada con éxito.');
}

run();
