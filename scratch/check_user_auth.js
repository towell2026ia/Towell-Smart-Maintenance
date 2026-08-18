const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://xqfpsavkefhrxfbtqzec.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxZnBzYXZrZWZocnhmYnRxemVjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjE0MzU5NywiZXhwIjoyMDk3NzE5NTk3fQ.o7GCLoa5YoDFWOxfvPayokuJhVYQvd2s5YtEq8DAs2U';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function checkUser() {
  const email = 'josejulianmunguiavazquez@gmail.com';

  console.log('--- 1. Checking cat_usuarios_roles ---');
  const { data: dbUsers, error: dbErr } = await supabase
    .from('cat_usuarios_roles')
    .select('*')
    .ilike('correo', `%${email}%`);

  console.log('DB Users:', dbUsers, dbErr);

  console.log('--- 2. Checking Supabase Auth (auth.users) ---');
  const { data: authData, error: authErr } = await supabase.auth.admin.listUsers();
  if (authErr) {
    console.error('Auth error:', authErr);
  } else {
    const foundAuth = authData.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    console.log('Auth User:', foundAuth ? { id: foundAuth.id, email: foundAuth.email, confirmed_at: foundAuth.email_confirmed_at } : 'NOT FOUND IN AUTH');
  }

  console.log('--- 3. Checking all users in cat_usuarios_roles with "julian" ---');
  const { data: nameUsers } = await supabase
    .from('cat_usuarios_roles')
    .select('id_usuario, nombre_completo, correo, rol, activo')
    .ilike('nombre_completo', '%julian%');
  console.log('Name matches:', nameUsers);
}

checkUser();
