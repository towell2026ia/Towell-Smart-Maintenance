const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://xqfpsavkefhrxfbtqzec.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxZnBzYXZrZWZocnhmYnRxemVjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjE0MzU5NywiZXhwIjoyMDk3NzE5NTk3fQ.o7GCLoa5YoDFWOxfvPayokuJhVYQvd2s5YtEq8DAs2U';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function inspectDemoUsers() {
  console.log('🔍 Checking cat_usuarios_roles...');
  const { data: dbUsers, error: dbErr } = await supabase.from('cat_usuarios_roles').select('*');
  if (dbErr) {
    console.error('Error fetching cat_usuarios_roles:', dbErr.message);
  } else {
    console.log(`Found ${dbUsers.length} total users in cat_usuarios_roles:`);
    dbUsers.forEach(u => {
      console.log(`  - [${u.id_usuario}] ${u.nombre_completo} | Email: ${u.correo} | Rol: ${u.rol}`);
    });
  }

  console.log('\n🔍 Checking auth.users...');
  const { data: authData, error: authErr } = await supabase.auth.admin.listUsers();
  if (authErr) {
    console.error('Error listing auth.users:', authErr.message);
  } else {
    console.log(`Found ${authData.users.length} total users in auth.users:`);
    authData.users.forEach(u => {
      console.log(`  - [${u.id}] Email: ${u.email}`);
    });
  }
}

inspectDemoUsers();
