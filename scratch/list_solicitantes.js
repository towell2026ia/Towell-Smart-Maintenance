const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://xqfpsavkefhrxfbtqzec.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxZnBzYXZrZWZocnhmYnRxemVjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjE0MzU5NywiZXhwIjoyMDk3NzE5NTk3fQ.o7GCLoa5YoDFWOxfvPayokuJhVYQvd2s5YtEq8DAs2U';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function listSolicitantes() {
  console.log('--- Fetching all users from cat_usuarios_roles ---');
  const { data: allUsers, error } = await supabase.from('cat_usuarios_roles').select('*');

  if (error) {
    console.error('Error:', error.message);
    return;
  }

  console.log(`Total users in cat_usuarios_roles: ${allUsers.length}`);

  const rolesFound = {};
  allUsers.forEach(u => {
    const r = u.rol || 'SIN_ROL';
    rolesFound[r] = (rolesFound[r] || 0) + 1;
  });
  console.log('Roles distribution:', rolesFound);

  const solicitantes = allUsers.filter(u => {
    const r = String(u.rol || '').toUpperCase().trim();
    return r.includes('SOLICITANTE') || r.includes('SOLICITUD') || r === 'PRODUCCION' || r === 'CALIDAD' || r === 'OPERADOR';
  });

  console.log(`\nFound ${solicitantes.length} solicitante / matching users:`);
  solicitantes.forEach((s, idx) => {
    console.log(`  ${idx + 1}. [${s.id_usuario}] ${s.nombre_completo} | Correo: ${s.correo} | Rol: ${s.rol} | Activo: ${s.activo} | Area: ${s.area}`);
  });

  // Also check auth.users to see if they exist in Supabase Auth
  console.log('\n--- Checking Supabase Auth Users ---');
  const { data: { users: authUsers }, error: authErr } = await supabase.auth.admin.listUsers();
  if (authErr) {
    console.error('Auth list error:', authErr.message);
  } else {
    console.log(`Total Auth Users in Supabase: ${authUsers.length}`);
    authUsers.forEach(au => {
      console.log(`   - Auth User: ${au.email} (ID: ${au.id}) confirmed: ${au.email_confirmed_at ? 'YES' : 'NO'}`);
    });
  }
}

listSolicitantes();
