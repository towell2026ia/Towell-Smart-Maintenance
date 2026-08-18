const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://xqfpsavkefhrxfbtqzec.supabase.co";
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxZnBzYXZrZWZocnhmYnRxemVjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjE0MzU5NywiZXhwIjoyMDk3NzE5NTk3fQ.o7GCLoa5YoDFWOxfvPayokuJhVYQvd2s5YtEq8DAs2U';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxZnBzYXZrZWZocnhmYnRxemVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxNDM1OTcsImV4cCI6MjA5NzcxOTU5N30.01wYy_zYwB-J8i4yq4c4qf1yvO0y4w9_zYwB-J8i4yq';

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY);
const supabaseAnon = createClient(SUPABASE_URL, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxZnBzYXZrZWZocnhmYnRxemVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxNDM1OTcsImV4cCI6MjA5NzcxOTU5N30.P_wLz9hP6pI8pE2sE3tX-ZJc_pE8kY6uL2kX6pE8kY6');

async function testEduardoAuthVerification() {
  const email = 'eduardo.arcos.arroyo@gmail.com';
  const testPassword = 'Towell2026!';

  console.log(`1. Setting password for ${email} via Supabase Admin API...`);
  const { data: updateData, error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(
    'aa04d884-4a3b-4dd5-91e8-418dc67b6d27',
    { 
      password: testPassword,
      email_confirm: true,
      user_metadata: {
        nombre_completo: 'Eduardo Arcos Arroyo',
        rol: 'MANTENIMIENTO'
      }
    }
  );

  if (updateErr) {
    console.error('❌ Error updating password:', updateErr);
    return;
  }
  console.log('✅ Password set successfully in auth.users.');

  console.log('2. Updating cat_usuarios_roles debe_cambiar_contrasenia = false...');
  const { data: dbData, error: dbErr } = await supabaseAdmin
    .from('cat_usuarios_roles')
    .update({
      debe_cambiar_contrasenia: false,
      fecha_actualizacion: new Date().toISOString()
    })
    .ilike('correo', email)
    .select();

  if (dbErr) {
    console.error('❌ Error updating cat_usuarios_roles:', dbErr);
    return;
  }
  console.log('✅ cat_usuarios_roles updated:', dbData);

  console.log('\n3. Testing real login with signInWithPassword...');
  const { data: loginData, error: loginErr } = await supabaseAdmin.auth.signInWithPassword({
    email,
    password: testPassword
  });

  if (loginErr) {
    console.error('❌ Login failed:', loginErr);
  } else {
    console.log('🎉 LOGIN SUCCESSFUL!');
    console.log('User ID:', loginData.user.id);
    console.log('User Email:', loginData.user.email);
    console.log('Session Access Token exists:', !!loginData.session.access_token);
  }
}

testEduardoAuthVerification();
