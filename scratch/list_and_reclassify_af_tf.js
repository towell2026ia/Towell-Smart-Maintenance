const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://xqfpsavkefhrxfbtqzec.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxZnBzYXZrZWZocnhmYnRxemVjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjE0MzU5NywiZXhwIjoyMDk3NzE5NTk3fQ.o7GCLoa5YoDFWOxfvPayokuJhVYQvd2s5YtEq8DAs2U';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

function getExactAreaWithUserRules(code) {
  if (!code) return 'PF';
  const u = code.toUpperCase();

  // Sublimadora -> CF
  if (u.includes('SUBL')) {
    return 'CF';
  }

  // 1. SERVICIOS AUXILIARES (AF): Subestaciones, Compresores, Chillers
  if (u.includes('SUBEST') || u.includes('SUBESTACION') || u.includes('COMP') || u.includes('COM') || u.includes('CHIL')) {
    return 'AF';
  }

  // 2. TINTORERÍA (TF): Incluye Tratamiento de Agua (AGUA, POZO), Calderas (CALD), Overflow, Jets, Ramas, Secadoras
  if (u.includes('TINT') || u.includes('JET') || u.includes('BARC') || u.includes('RAMA') || u.includes('SECA') || u.includes('POZO') || u.includes('OVERF') || u.includes('AGUA') || u.includes('CALD')) {
    return 'TF';
  }

  // 3. CONFECCIÓN / COSTURA (CF): Rectilíneas, Planas, Cortadoras, Selladoras, Sublimadoras, Overlock de Costura
  if (u.includes('COST') || u.includes('CONF') || u.includes('RECT') || u.includes('CORT') || u.includes('SELL') || u.includes('PLAN') || u.includes('CORBAT') || u.includes('OVERCO') || u.includes('OVERJ')) {
    return 'CF';
  }

  // 4. PLANTA FÍSICA / TEJIDO (PF): Telares, Maccone/Urdimbre, Enconadoras, Doblo, etc.
  return 'PF';
}

async function run() {
  console.log('🚀 Reclasificando con reglas de usuario (Calderas/Agua -> TF, Compresores/Subestaciones -> AF)...');

  const { data: maquinas } = await supabase.from('cat_maquinas').select('equipo_towell, clave, origen');
  if (!maquinas) return;

  const areaGroups = { PF: [], CF: [], TF: [], AF: [] };

  maquinas.forEach(m => {
    const area = getExactAreaWithUserRules(m.equipo_towell);
    areaGroups[area].push(m.equipo_towell);
  });

  console.log('\n============================================================');
  console.log(`📌 MÁQUINAS EN SERVICIOS AUXILIARES (AF) - TOTAL: ${areaGroups.AF.length}`);
  console.log('============================================================');
  areaGroups.AF.sort().forEach((eq, idx) => {
    console.log(`${idx + 1}. ${eq}`);
  });

  console.log('\n============================================================');
  console.log(`📌 MÁQUINAS EN TINTORERÍA (TF) - TOTAL: ${areaGroups.TF.length}`);
  console.log('============================================================');
  areaGroups.TF.sort().forEach((eq, idx) => {
    console.log(`${idx + 1}. ${eq}`);
  });

  console.log('\n============================================================');
  console.log(`📌 CONTEO TOTAL RECLASIFICADO POR ÁREA:`);
  console.log(` - PF (Tejido / Urdimbre / Planta Física): ${areaGroups.PF.length}`);
  console.log(` - CF (Confección / Costura / Rectilíneas): ${areaGroups.CF.length}`);
  console.log(` - TF (Tintorería + Calderas + Tratamiento de Agua): ${areaGroups.TF.length}`);
  console.log(` - AF (Servicios Auxiliares: Subestaciones + Compresores + Chillers): ${areaGroups.AF.length}`);
  console.log('============================================================');

  // Actualizar cat_maquinas en Supabase por lotes
  for (const [area, list] of Object.entries(areaGroups)) {
    if (list.length > 0) {
      await supabase.from('cat_maquinas').update({ departamento_codigo: area, area: area }).in('equipo_towell', list);
    }
  }

  // Actualizar ordenes_trabajo
  const { data: ordenes } = await supabase.from('ordenes_trabajo').select('id_orden, maquina_id');
  const otAreaGroups = { PF: [], CF: [], TF: [], AF: [] };
  (ordenes || []).forEach(o => {
    const area = getExactAreaWithUserRules(o.maquina_id);
    otAreaGroups[area].push(o.id_orden);
  });

  for (const [area, list] of Object.entries(otAreaGroups)) {
    if (list.length > 0) {
      await supabase.from('ordenes_trabajo').update({ area: area }).in('id_orden', list);
    }
  }

  console.log('🎉 Reclasificación en Supabase finalizada con éxito.');
}

run();
