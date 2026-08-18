const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://xqfpsavkefhrxfbtqzec.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxZnBzYXZrZWZocnhmYnRxemVjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjE0MzU5NywiZXhwIjoyMDk3NzE5NTk3fQ.o7GCLoa5YoDFWOxfvPayokuJhVYQvd2s5YtEq8DAs2U';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function testResetJulian() {
  const email = 'josejulianmunguiavazquez@gmail.com';
  console.log('Enviando reset a:', email);

  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: 'https://tsmail-towell.netlify.app'
  });

  console.log('Result resetPasswordForEmail:', data, error);
}

testResetJulian();
