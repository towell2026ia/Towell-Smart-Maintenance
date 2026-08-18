const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://xqfpsavkefhrxfbtqzec.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxZnBzYXZrZWZocnhmYnRxemVjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjE0MzU5NywiZXhwIjoyMDk3NzE5NTk3fQ.o7GCLoa5YoDFWOxfvPayokuJhVYQvd2s5YtEq8DAs2U';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function inspectAllSolicitantes() {
  const { data: users, error } = await supabase
    .from('cat_usuarios_roles')
    .select('*')
    .ilike('rol', '%SOLICITANTE%');

  if (error) {
    console.error('Error fetching solicitantes:', error.message);
    return;
  }

  console.log(`Found ${users.length} users with rol containing 'SOLICITANTE':`);
  users.forEach((u, i) => {
    console.log(`${i + 1}. ${u.nombre_completo} | Correo: ${u.correo} | Activo: ${u.activo} | Clave: ${u.cve_empleado || 'N/A'}`);
  });
}

inspectAllSolicitantes();
