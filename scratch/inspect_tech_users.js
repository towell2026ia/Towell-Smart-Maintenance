const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://xqfpsavkefhrxfbtqzec.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxZnBzYXZrZWZocnhmYnRxemVjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjE0MzU5NywiZXhwIjoyMDk3NzE5NTk3fQ.o7GCLoa5YoDFWOxfvPayokuJhVYQvd2s5YtEq8DAs2U';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function inspectUsers() {
  const { data: users, error } = await supabase
    .from('cat_usuarios_roles')
    .select('*');

  if (error) {
    console.error('Error fetching users:', error.message);
    return;
  }

  console.log(`Found ${users.length} total users in cat_usuarios_roles:`);
  users.forEach((u, i) => {
    console.log(`${i+1}. [${u.rol}] ${u.nombre_completo} | Email: ${u.correo} | ID: ${u.id_usuario} | Activo: ${u.activo} | cve_tecnico: ${u.cve_tecnico}`);
  });
}

inspectUsers();
