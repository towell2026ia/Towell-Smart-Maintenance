const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://xqfpsavkefhrxfbtqzec.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxZnBzYXZrZWZocnhmYnRxemVjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjE0MzU5NywiZXhwIjoyMDk3NzE5NTk3fQ.o7GCLoa5YoDFWOxfvPayokuJhVYQvd2s5YtEq8DAs2U';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function purgeDemoUsers() {
  console.log('🧹 Starting cleanup of demo and tsm-ai.com accounts from database...');

  // 1. Fetch from cat_usuarios_roles
  const { data: dbUsers, error: dbErr } = await supabase.from('cat_usuarios_roles').select('*');
  if (dbErr) {
    console.error('Error fetching cat_usuarios_roles:', dbErr);
    return;
  }

  const demoDbUsers = dbUsers.filter(u => {
    const email = (u.correo || '').toLowerCase().trim();
    return email.includes('demo') || email.includes('tsm-ai.com');
  });

  console.log(`Found ${demoDbUsers.length} demo/tsm-ai accounts in cat_usuarios_roles:`);
  demoDbUsers.forEach(u => console.log(`  - [${u.id_usuario}] ${u.nombre_completo} (${u.correo})`));

  for (const u of demoDbUsers) {
    console.log(`🗑️ Deleting from cat_usuarios_roles: ${u.nombre_completo} (${u.correo})...`);
    const { error: delErr } = await supabase
      .from('cat_usuarios_roles')
      .delete()
      .eq('id_usuario', u.id_usuario);

    if (delErr) {
      console.error(`   ❌ Failed to delete ${u.correo}:`, delErr.message);
    } else {
      console.log(`   ✅ Deleted successfully.`);
    }
  }

  // 2. Fetch from auth.users
  console.log('\n🧹 Checking auth.users for demo accounts...');
  const { data: authData, error: authErr } = await supabase.auth.admin.listUsers();
  if (authErr) {
    console.error('Error fetching auth.users:', authErr);
    return;
  }

  const demoAuthUsers = authData.users.filter(u => {
    const email = (u.email || '').toLowerCase().trim();
    return email.includes('demo') || email.includes('tsm-ai.com');
  });

  console.log(`Found ${demoAuthUsers.length} demo/tsm-ai accounts in auth.users:`);
  for (const u of demoAuthUsers) {
    console.log(`🗑️ Deleting from auth.users: ${u.email}...`);
    const { error: delAuthErr } = await supabase.auth.admin.deleteUser(u.id);
    if (delAuthErr) {
      console.error(`   ❌ Failed to delete ${u.email}:`, delAuthErr.message);
    } else {
      console.log(`   ✅ Deleted successfully from auth.users.`);
    }
  }

  console.log('\n========================================');
  console.log('🎉 Cleanup completed! Live database is now clean of demo and tsm-ai.com accounts.');
  console.log('========================================');
}

purgeDemoUsers();
