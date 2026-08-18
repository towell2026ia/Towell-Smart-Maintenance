const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://xqfpsavkefhrxfbtqzec.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_6iHpR6R2yCdqy-YsvCWkSQ_YWg9my_i";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testResetPasswordEmail() {
  const email = 'eduardo.arcos.arroyo@gmail.com';
  console.log(`Sending reset password email to ${email}...`);
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: 'https://tsmail-towell.netlify.app'
  });

  if (error) {
    console.error('❌ Error sending reset email:', error);
  } else {
    console.log('✅ Reset password email sent successfully via Supabase Auth!');
    console.log(data);
  }
}

testResetPasswordEmail();
