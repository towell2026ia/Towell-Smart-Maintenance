const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://xqfpsavkefhrxfbtqzec.supabase.co";
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxZnBzYXZrZWZocnhmYnRxemVjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjE0MzU5NywiZXhwIjoyMDk3NzE5NTk3fQ.o7GCLoa5YoDFWOxfvPayokuJhVYQvd2s5YtEq8DAs2U';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function findAndProvisionMissingAuthUsers() {
  // 1. Fetch all users from cat_usuarios_roles
  const { data: dbUsers, error: dbErr } = await supabase
    .from('cat_usuarios_roles')
    .select('*');

  // 2. Fetch all users from auth.users (with pagination)
  let allAuthUsers = [];
  let page = 1;
  while (true) {
    const { data: authData, error: authErr } = await supabase.auth.admin.listUsers({ page, perPage: 100 });
    if (authErr || !authData || authData.users.length === 0) break;
    allAuthUsers = allAuthUsers.concat(authData.users);
    if (authData.users.length < 100) break;
    page++;
  }

  console.log(`Total DB users in cat_usuarios_roles: ${dbUsers.length}`);
  console.log(`Total Auth users in auth.users: ${allAuthUsers.length}`);

  const authEmailMap = new Map();
  allAuthUsers.forEach(u => {
    if (u.email) authEmailMap.set(u.email.toLowerCase().trim(), u);
  });

  const missing = [];
  for (const u of dbUsers) {
    if (!u.correo) continue;
    const cleanEmail = u.correo.toLowerCase().trim();
    if (!authEmailMap.has(cleanEmail)) {
      missing.push(u);
    }
  }

  console.log(`\n❌ Total users missing in auth.users: ${missing.length}`);
  for (const u of missing) {
    console.log(`Provisioning auth account for: ${u.nombre_completo} (${u.correo})...`);
    // Create the user in auth.users with email_confirm: true and a temporary random password
    const tempPassword = 'TSM_' + Math.random().toString(36).slice(-8) + 'A1!';
    const { data: newAuthUser, error: createErr } = await supabase.auth.admin.createUser({
      email: u.correo.toLowerCase().trim(),
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        nombre_completo: u.nombre_completo,
        rol: u.rol,
        cve_tecnico: u.cve_tecnico,
        cve_empleado: u.cve_empleado
      }
    });

    if (createErr) {
      console.error(`  ❌ Error creating ${u.correo}:`, createErr.message);
    } else {
      console.log(`  ✅ Successfully created in auth.users (ID: ${newAuthUser.user.id})`);
    }
  }
}

findAndProvisionMissingAuthUsers();
