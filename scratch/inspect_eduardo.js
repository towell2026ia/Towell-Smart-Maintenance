const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://xqfpsavkefhrxfbtqzec.supabase.co";
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxZnBzYXZrZWZocnhmYnRxemVjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjE0MzU5NywiZXhwIjoyMDk3NzE5NTk3fQ.o7GCLoa5YoDFWOxfvPayokuJhVYQvd2s5YtEq8DAs2U';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function inspectEduardo() {
  console.log('--- Checking cat_usuarios_roles for Eduardo ---');
  const { data: dbUsers, error: dbErr } = await supabase
    .from('cat_usuarios_roles')
    .select('*')
    .ilike('correo', '%eduardo.arcos%');
  console.log('cat_usuarios_roles matches:', dbUsers);

  console.log('\n--- Checking auth.users for Eduardo ---');
  const { data: authUsers, error: authErr } = await supabase.auth.admin.listUsers();
  const eduardoAuth = authUsers.users.filter(u => u.email && u.email.toLowerCase().includes('eduardo.arcos'));
  console.log('auth.users matches:', eduardoAuth.map(u => ({
    id: u.id,
    email: u.email,
    confirmed_at: u.confirmed_at,
    last_sign_in_at: u.last_sign_in_at,
    created_at: u.created_at,
    updated_at: u.updated_at,
    user_metadata: u.user_metadata
  })));
}

inspectEduardo();
