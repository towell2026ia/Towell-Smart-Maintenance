const { createClient } = require('@supabase/supabase-js');
const supabase = createClient("https://xqfpsavkefhrxfbtqzec.supabase.co", "sb_publishable_6iHpR6R2yCdqy-YsvCWkSQ_YWg9my_i");

async function checkUserFields() {
  const { data, error } = await supabase.from('cat_usuarios_roles').select('*').limit(3);
  console.log('Sample user record from cat_usuarios_roles:', data);
}

checkUserFields();
