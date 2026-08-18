const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://xqfpsavkefhrxfbtqzec.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxZnBzYXZrZWZocnhmYnRxemVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxNDM1OTcsImV4cCI6MjA5NzcxOTU5N30.8iJd_gL8N1rU_6xP252t7nI_r-V1P5S3R1_4v64L1_A';

// Try connecting with client
const client = createClient(SUPABASE_URL, ANON_KEY);

async function testSignIn() {
  const email = 'josejulianmunguiavazquez@gmail.com';
  console.log('Testing signIn with wrong password:');
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password: 'wrongpassword'
  });
  console.log('Error returned:', error ? { message: error.message, status: error.status, name: error.name } : 'SUCCESS');
}

testSignIn();
