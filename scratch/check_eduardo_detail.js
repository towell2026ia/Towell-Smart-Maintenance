const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://xqfpsavkefhrxfbtqzec.supabase.co";
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxZnBzYXZrZWZocnhmYnRxemVjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjE0MzU5NywiZXhwIjoyMDk3NzE5NTk3fQ.o7GCLoa5YoDFWOxfvPayokuJhVYQvd2s5YtEq8DAs2U';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function checkEduardoDetail() {
  const email = 'eduardo.arcos.arroyo@gmail.com';
  
  // 1. Check in cat_usuarios_roles
  const { data: dbUser, error: dbErr } = await supabase
    .from('cat_usuarios_roles')
    .select('*')
    .ilike('correo', email)
    .maybeSingle();
  console.log('cat_usuarios_roles:', dbUser);

  // 2. Check in auth.users
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  const authUser = authUsers.users.find(u => u.email && u.email.toLowerCase() === email);
  console.log('auth.users:', authUser);
}

checkEduardoDetail();
