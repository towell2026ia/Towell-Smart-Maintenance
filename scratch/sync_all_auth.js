const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://xqfpsavkefhrxfbtqzec.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxZnBzYXZrZWZocnhmYnRxemVjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjE0MzU5NywiZXhwIjoyMDk3NzE5NTk3fQ.o7GCLoa5YoDFWOxfvPayokuJhVYQvd2s5YtEq8DAs2U';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function syncAllAuthUsers() {
  const { data: dbUsers } = await supabase
    .from('cat_usuarios_roles')
    .select('*');

  const { data: authData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const authEmails = new Set((authData.users || []).map(u => (u.email || '').toLowerCase().trim()));

  for (const u of dbUsers) {
    const email = (u.correo || '').toLowerCase().trim();
    if (!email || !email.includes('@')) continue;

    if (!authEmails.has(email)) {
      console.log(`Creating user in Supabase Auth: ${u.nombre_completo} <${email}>`);
      const tempPass = 'Towell' + Math.floor(100000 + Math.random() * 900000) + '!';
      const { data: created, error } = await supabase.auth.admin.createUser({
        email: email,
        password: tempPass,
        email_confirm: true,
        user_metadata: {
          nombre_completo: u.nombre_completo,
          rol: u.rol,
          cve_empleado: u.cve_empleado
        }
      });
      if (error) {
        console.error(`Error creating ${email}:`, error.message);
      } else {
        console.log(`✅ Created ${email} in Auth.`);
        authEmails.add(email);
      }
    }
  }

  console.log('Sync Auth complete.');
}

syncAllAuthUsers();
