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
  
  // Query stg_telegram_ordenes_telares for any folio containing 'TG'
  const { data: stgTg, error: err1 } = await supabase
    .from('stg_telegram_ordenes_telares')
    .select('folio')
    .ilike('folio', '%TG%')
    .limit(10);
    
  // Query stg_telegram_ordenes_telares for any folio containing 'PF'
  const { data: stgPf, error: err2 } = await supabase
    .from('stg_telegram_ordenes_telares')
    .select('folio')
    .ilike('folio', '%PF%')
    .limit(10);

  // Query stg_telegram_ordenes_telares for any folio containing 'TF'
  const { data: stgTf, error: err3 } = await supabase
    .from('stg_telegram_ordenes_telares')
    .select('folio')
    .ilike('folio', '%TF%')
    .limit(10);

  // Query stg_telegram_ordenes_telares for any folio containing 'CF'
  const { data: stgCf, error: err4 } = await supabase
    .from('stg_telegram_ordenes_telares')
    .select('folio')
    .ilike('folio', '%CF%')
    .limit(10);
    
  console.log('TG folios in staging:', stgTg);
  console.log('PF folios in staging:', stgPf);
  console.log('TF folios in staging:', stgTf);
  console.log('CF folios in staging:', stgCf);
}

run().catch(console.error);
