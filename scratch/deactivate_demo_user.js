const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://xqfpsavkefhrxfbtqzec.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxZnBzYXZrZWZocnhmYnRxemVjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjE0MzU5NywiZXhwIjoyMDk3NzE5NTk3fQ.o7GCLoa5YoDFWOxfvPayokuJhVYQvd2s5YtEq8DAs2U';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function deactivateDemoUser() {
  const { data, error } = await supabase
    .from('cat_usuarios_roles')
    .update({ activo: false })
    .eq('id_usuario', '90d81369-8b2e-4f09-bbf2-579e0ad5ba18');

  if (error) {
    console.error('Error deactivating demo user:', error.message);
  } else {
    console.log('✅ Demo user Tornero a prueba deactivated cleanly (activo = false) in cat_usuarios_roles.');
  }
}

deactivateDemoUser();
