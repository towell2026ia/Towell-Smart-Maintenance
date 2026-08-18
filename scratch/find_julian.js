const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://xqfpsavkefhrxfbtqzec.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxZnBzYXZrZWZocnhmYnRxemVjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjE0MzU5NywiZXhwIjoyMDk3NzE5NTk3fQ.o7GCLoa5YoDFWOxfvPayokuJhVYQvd2s5YtEq8DAs2U';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function findJulian() {
  const { data: authData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const matches = authData.users.filter(u => 
    (u.email || '').toLowerCase().includes('julian') || 
    (u.email || '').toLowerCase().includes('munguia') ||
    (u.email || '').toLowerCase().includes('vazquez') ||
    (u.user_metadata && JSON.stringify(u.user_metadata).toLowerCase().includes('julian'))
  );

  console.log('Matches in Auth:', matches.map(u => ({
    id: u.id,
    email: u.email,
    confirmed_at: u.email_confirmed_at,
    last_sign_in: u.last_sign_in_at,
    metadata: u.user_metadata
  })));

  const { data: dbUser } = await supabase
    .from('cat_usuarios_roles')
    .select('*')
    .ilike('correo', '%julian%');
  console.log('\nMatches in cat_usuarios_roles:', dbUser);
}

findJulian();
