const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://xqfpsavkefhrxfbtqzec.supabase.co";
const PUBLISHABLE_KEY = "sb_publishable_6iHpR6R2yCdqy-YsvCWkSQ_YWg9my_i";
const JWT_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxZnBzYXZrZWZocnhmYnRxemVjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjE0MzU5NywiZXhwIjoyMDk3NzE5NTk3fQ.o7GCLoa5YoDFWOxfvPayokuJhVYQvd2s5YtEq8DAs2U';

async function testKeys() {
  console.log('--- Testing Publishable Key ---');
  const clientPub = createClient(SUPABASE_URL, PUBLISHABLE_KEY);
  const { data: d1, error: e1 } = await clientPub.from('cat_maquinas').select('count').limit(1);
  console.log('Table select with publishable key:', d1, e1);
  const { data: d2, error: e2 } = await clientPub.auth.signInWithPassword({ email: 'josejulianmunguiavazquez@gmail.com', password: '123' });
  console.log('Auth with publishable key:', e2 ? e2.message : 'OK');

  console.log('\n--- Finding standard anon JWT key ---');
  // Decode JWT service key to see if we can check the payload
  const jwt = require('jsonwebtoken');
  const decoded = jwt.decode(JWT_SERVICE_KEY);
  console.log('Service key payload:', decoded);
}

testKeys();
