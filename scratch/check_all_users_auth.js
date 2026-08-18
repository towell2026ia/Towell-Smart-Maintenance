const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://xqfpsavkefhrxfbtqzec.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxZnBzYXZrZWZocnhmYnRxemVjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjE0MzU5NywiZXhwIjoyMDk3NzE5NTk3fQ.o7GCLoa5YoDFWOxfvPayokuJhVYQvd2s5YtEq8DAs2U';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function checkAllUsers() {
  const { data: dbUsers } = await supabase
    .from('cat_usuarios_roles')
    .select('id_usuario, nombre_completo, correo, rol, cve_tecnico, cve_empleado, activo');

  const { data: authData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const authEmails = new Set((authData.users || []).map(u => (u.email || '').toLowerCase().trim()));

  console.log(`Total DB Users in cat_usuarios_roles: ${dbUsers.length}`);
  console.log(`Total Supabase Auth Users: ${authEmails.size}`);

  const missingInAuth = [];
  const presentInAuth = [];

  dbUsers.forEach(u => {
    const email = (u.correo || '').toLowerCase().trim();
    if (!email || !email.includes('@')) return;
    if (authEmails.has(email)) {
      presentInAuth.push(u);
    } else {
      missingInAuth.push(u);
    }
  });

  console.log(`\n✅ Users present in Auth: ${presentInAuth.length}`);
  console.log(`❌ Users MISSING in Auth: ${missingInAuth.length}`);

  console.log('\nList of missing users in Auth:');
  missingInAuth.forEach((u, i) => {
    console.log(`${i + 1}. [${u.rol}] ${u.nombre_completo} <${u.correo}> (Activo: ${u.activo})`);
  });
}

checkAllUsers();
