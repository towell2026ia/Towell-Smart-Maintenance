const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://xqfpsavkefhrxfbtqzec.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxZnBzYXZrZWZocnhmYnRxemVjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjE0MzU5NywiZXhwIjoyMDk3NzE5NTk3fQ.o7GCLoa5YoDFWOxfvPayokuJhVYQvd2s5YtEq8DAs2U';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

function getExactArea(code) {
  if (!code) return 'PF';
  const u = code.toUpperCase();
  if (u.includes('TINT') || u.includes('JET') || u.includes('BARC') || u.includes('RAMA') || u.includes('SECA') || u.includes('POZO') || u.includes('OVERF')) {
    return 'TF';
  }
  if (u.includes('COST') || u.includes('CONF') || u.includes('RECT') || u.includes('CORT') || u.includes('SELL') || u.includes('SUBL') || u.includes('PLAN') || u.includes('CORBAT') || u.includes('OVERCO') || u.includes('OVERJ')) {
    return 'CF';
  }
  if (u.includes('AUX') || u.includes('SUB') || u.includes('CHIL') || u.includes('CALD') || u.includes('AGUA') || u.includes('ESTA')) {
    return 'AF';
  }
  return 'PF';
}

async function run() {
  console.log('🚀 Iniciando reclasificación rápida por lotes para 135 máquinas...');

  const { data: maquinas } = await supabase.from('cat_maquinas').select('equipo_towell');
  if (!maquinas) return;

  const areaGroups = { PF: [], CF: [], TF: [], AF: [] };

  maquinas.forEach(m => {
    const area = getExactArea(m.equipo_towell);
    areaGroups[area].push(m.equipo_towell);
  });

  for (const [area, list] of Object.entries(areaGroups)) {
    if (list.length > 0) {
      console.log(`💾 Actualizando ${list.length} máquinas en área "${area}"...`);
      await supabase.from('cat_maquinas').update({ departamento_codigo: area, area: area }).in('equipo_towell', list);
    }
  }

  // Actualizar ordenes_trabajo
  const { data: ordenes } = await supabase.from('ordenes_trabajo').select('id_orden, maquina_id');
  const otAreaGroups = { PF: [], CF: [], TF: [], AF: [] };
  (ordenes || []).forEach(o => {
    const area = getExactArea(o.maquina_id);
    otAreaGroups[area].push(o.id_orden);
  });

  for (const [area, list] of Object.entries(otAreaGroups)) {
    if (list.length > 0) {
      await supabase.from('ordenes_trabajo').update({ area: area }).in('id_orden', list);
    }
  }

  console.log('🎉 Reclasificación por lotes completada con éxito.');
}

run();
