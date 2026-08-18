const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://xqfpsavkefhrxfbtqzec.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_6iHpR6R2yCdqy-YsvCWkSQ_YWg9my_i";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function audit() {
  console.log('--- 1. AUDIT cat_maquinas ---');
  const { data: machines, error: mErr } = await supabase.from('cat_maquinas').select('*').limit(10);
  if (mErr) console.error('Error cat_maquinas:', mErr);
  else console.log(`Found ${machines.length} machines sample:`, machines.map(m => ({ towell: m.equipo_towell, area: m.area, dept: m.departamento_codigo, desc: m.descripcion })));

  console.log('\n--- 2. AUDIT cat_refacciones ---');
  const { data: parts, error: pErr } = await supabase.from('cat_refacciones').select('*').limit(10);
  if (pErr) console.error('Error cat_refacciones:', pErr);
  else console.log(`Found ${parts.length} parts sample:`, parts.map(p => ({ code: p.codigo_articulo, name: p.nombre_articulo, familia: p.familia, cost: p.costo_unitario })));

  console.log('\n--- 3. AUDIT refacciones_por_maquina ---');
  const { data: rpm, error: rpmErr } = await supabase.from('refacciones_por_maquina').select('*').limit(20);
  if (rpmErr) console.error('Error refacciones_por_maquina:', rpmErr);
  else console.log(`Found ${rpm ? rpm.length : 0} refacciones_por_maquina sample:`, rpm);

  console.log('\n--- 4. AUDIT cat_componentes_maquina ---');
  const { data: comp, error: compErr } = await supabase.from('cat_componentes_maquina').select('*').limit(10);
  if (compErr) console.error('Error cat_componentes_maquina:', compErr);
  else console.log(`Found ${comp ? comp.length : 0} componentes:`, comp);
}

audit();
