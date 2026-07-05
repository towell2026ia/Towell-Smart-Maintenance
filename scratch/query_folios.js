const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function run() {
  if (!fs.existsSync('./config.js')) {
    console.error('config.js not found!');
    process.exit(1);
  }
  const configContent = fs.readFileSync('./config.js', 'utf8');
  const urlMatch = configContent.match(/SUPABASE_URL\s*=\s*['"]([^'"]+)['"]/);
  const keyMatch = configContent.match(/SUPABASE_ANON_KEY\s*=\s*['"]([^'"]+)['"]/);
  const url = urlMatch[1];
  const key = keyMatch[1];
  
  const supabase = createClient(url, key);
  
  const { data, error } = await supabase
    .from('cat_maquinas')
    .select('equipo_towell, clave')
    .limit(50);
    
  if (error) {
    console.error('Error fetching machines:', error);
    process.exit(1);
  }
  
  console.log('cat_maquinas query result:');
  console.log(data);
}

run().catch(console.error);
