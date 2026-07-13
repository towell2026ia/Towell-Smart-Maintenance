const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://xqfpsavkefhrxfbtqzec.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxZnBzYXZrZWZocnhmYnRxemVjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjE0MzU5NywiZXhwIjoyMDk3NzE5NTk3fQ.o7GCLoa5YoDFWOxfvPayokuJhVYQvd2s5YtEq8DAs2U';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function main() {
  console.log('🤖 Starting Supabase Auth user registration...');

  // 1. Fetch all users from public.cat_usuarios_roles
  const { data: users, error: fetchErr } = await supabase
    .from('cat_usuarios_roles')
    .select('correo, rol, nombre_completo')
    .eq('activo', true);

  if (fetchErr) {
    console.error('❌ Error fetching users from cat_usuarios_roles:', fetchErr);
    return;
  }

  console.log(`📋 Found ${users.length} active users in cat_usuarios_roles.`);

  // 2. Loop through and create each in Supabase Auth
  for (const user of users) {
    const email = user.correo.toLowerCase().trim();
    const isSuperAdmin = user.rol === 'SUPER_ADMINISTRADOR';
    const defaultPassword = isSuperAdmin ? 'admin123' : 'tech123';

    console.log(`👤 Registering: ${user.nombre_completo} (${email}) as ${user.rol}...`);

    try {
      // Create user using the Supabase Admin Auth API
      const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
        email: email,
        password: defaultPassword,
        email_confirm: true, // Auto-confirm email so they don't need to click a link
        user_metadata: {
          nombre_completo: user.nombre_completo,
          rol: user.rol
        }
      });

      if (authErr) {
        if (authErr.message && authErr.message.includes('already exists')) {
          console.log(`   ℹ️ User already exists in Supabase Auth. Skipping.`);
        } else {
          console.error(`   ❌ Failed to create user: ${authErr.message}`);
        }
      } else {
        console.log(`   ✅ Successfully registered user in Auth. ID: ${authUser.user.id}`);
      }
    } catch (err) {
      console.error(`   ❌ Unexpected error for ${email}:`, err);
    }
  }

  console.log('🎉 Supabase Auth registration process completed!');
}

main();
