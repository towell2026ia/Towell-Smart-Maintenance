const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://xqfpsavkefhrxfbtqzec.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxZnBzYXZrZWZocnhmYnRxemVjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjE0MzU5NywiZXhwIjoyMDk3NzE5NTk3fQ.o7GCLoa5YoDFWOxfvPayokuJhVYQvd2s5YtEq8DAs2U';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function run() {
  const { data: ordenes, error } = await supabase.from('ordenes_trabajo').select('*');
  console.log('Total ordenes_trabajo:', ordenes ? ordenes.length : 0);
  if (error) console.error(error);
  (ordenes || []).forEach(o => {
    console.log(`OT: ${o.id_orden || o.folio || o.id} | Máquina: ${o.maquina_id || o.equipo_towell} | Area: "${o.area}" | Departamento: "${o.departamento_codigo}"`);
  });
}

run();
