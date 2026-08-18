const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://xqfpsavkefhrxfbtqzec.supabase.co";
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxZnBzYXZrZWZocnhmYnRxemVjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjE0MzU5NywiZXhwIjoyMDk3NzE5NTk3fQ.o7GCLoa5YoDFWOxfvPayokuJhVYQvd2s5YtEq8DAs2U';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function checkAllUsersSync() {
  const { data: dbUsers, error: dbErr } = await supabase
    .from('cat_usuarios_roles')
    .select('id_usuario, nombre_completo, correo, rol, activo, debe_cambiar_contrasenia');
  
  const { data: authUsers, error: authErr } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const authMap = new Map();
  authUsers.users.forEach(u => {
    if (u.email) authMap.set(u.email.toLowerCase().trim(), u);
    authMap.set(u.id, u);
  });

  console.log(`Total in cat_usuarios_roles: ${dbUsers.length}`);
  console.log(`Total in auth.users: ${authUsers.users.length}`);

  const missingInAuth = [];
  const mismatchedIds = [];

  for (const u of dbUsers) {
    if (!u.correo) continue;
    const cleanEmail = u.correo.toLowerCase().trim();
    const authUser = authMap.get(cleanEmail);
    if (!authUser) {
      missingInAuth.push(u);
    } else if (authUser.id !== u.id_usuario) {
      mismatchedIds.push({ dbUser: u, authUser });
    }
  }

  console.log(`\n❌ Users in cat_usuarios_roles MISSING in auth.users: ${missingInAuth.length}`);
  missingInAuth.forEach(u => console.log(` - [${u.id_usuario}] ${u.nombre_completo} (${u.correo}) - Rol: ${u.rol}`));

  console.log(`\n⚠️ Users with mismatched UUIDs between DB and Auth: ${mismatchedIds.length}`);
  mismatchedIds.forEach(m => console.log(` - ${m.dbUser.correo}: DB id=${m.dbUser.id_usuario} vs Auth id=${m.authUser.id}`));
}

checkAllUsersSync();
