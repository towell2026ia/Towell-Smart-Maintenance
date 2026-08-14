const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://xqfpsavkefhrxfbtqzec.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxZnBzYXZrZWZocnhmYnRxemVjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjE0MzU5NywiZXhwIjoyMDk3NzE5NTk3fQ.o7GCLoa5YoDFWOxfvPayokuJhVYQvd2s5YtEq8DAs2U';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function findDemoAuthUsers() {
  const { data: authData, error } = await supabase.auth.admin.listUsers();
  if (error) {
    console.error('Error:', error);
    return;
  }
  const demoAuth = authData.users.filter(u => {
    const email = (u.email || '').toLowerCase();
    return email.includes('demo') || email.includes('tsm-ai.com') || email.includes('tsmai');
  });

  console.log(`Found ${demoAuth.length} demo/tsm-ai users in auth.users:`);
  demoAuth.forEach(u => console.log(`  - [${u.id}] ${u.email}`));
}

findDemoAuthUsers();
