const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://xqfpsavkefhrxfbtqzec.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxZnBzYXZrZWZocnhmYnRxemVjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjE0MzU5NywiZXhwIjoyMDk3NzE5NTk3fQ.o7GCLoa5YoDFWOxfvPayokuJhVYQvd2s5YtEq8DAs2U';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function run() {
  console.log('🔍 Buscando máquinas y órdenes con área NULL en todas las tablas...');

  // 1. Obtener todas las máquinas de cat_maquinas
  const { data: maquinas } = await supabase
    .from('cat_maquinas')
    .select('equipo_towell, departamento_codigo, area');

  console.log(`📋 Total de máquinas en cat_maquinas: ${maquinas ? maquinas.length : 0}`);

  const nullMaquinas = (maquinas || []).filter(m => 
    !m.departamento_codigo || !m.area || m.departamento_codigo === 'null' || m.area === 'null'
  );

  console.log(`\n📌 MÁQUINAS EN CATÁLOGO CON ÁREA NULL EN cat_maquinas (${nullMaquinas.length}):`);
  nullMaquinas.forEach(m => {
    console.log(` - Equipo: ${m.equipo_towell} | departamento_codigo: ${m.departamento_codigo} | area: ${m.area}`);
  });

  // 2. Obtener todas las órdenes de trabajo
  const { data: ordenes, error: oErr } = await supabase
    .from('ordenes_trabajo')
    .select('id_orden, maquina_id, area');

  if (oErr) console.error('Error ordenes_trabajo:', oErr);

  const nullOrdenes = (ordenes || []).filter(o => 
    !o.area || o.area === 'null' || o.area === 'NULL' || o.area === ''
  );

  console.log(`\n📌 ÓRDENES DE TRABAJO CON ÁREA NULL O DESCONOCIDA (${nullOrdenes.length}):`);
  nullOrdenes.forEach(o => {
    console.log(` - OT ID: ${o.id_orden} | Máquina: ${o.maquina_id} | área: ${o.area}`);
  });

  // 3. Imprimir el mapa completo de máquinas y su área actual en cat_maquinas
  console.log('\n📊 DETALLE COMPLETO DE MÁQUINAS Y SUS ÁREAS ASIGNADAS EN BD:');
  (maquinas || []).forEach(m => {
    if (!m.area || m.area === 'null' || m.departamento_codigo === 'AF' || m.equipo_towell.includes('MACC') || m.equipo_towell.includes('COM')) {
      console.log(` - ${m.equipo_towell} => dep_codigo: "${m.departamento_codigo}", area: "${m.area}"`);
    }
  });
}

run();
