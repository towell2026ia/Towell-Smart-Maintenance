const { createClient } = require('@supabase/supabase-js');
const supabase = createClient("https://xqfpsavkefhrxfbtqzec.supabase.co", "sb_publishable_6iHpR6R2yCdqy-YsvCWkSQ_YWg9my_i");

async function countRows() {
  const { count: mCount } = await supabase.from('cat_maquinas').select('*', { count: 'exact', head: true });
  const { count: rCount } = await supabase.from('cat_refacciones').select('*', { count: 'exact', head: true });
  const { data: sampleParts } = await supabase.from('cat_refacciones').select('codigo_articulo, nombre_articulo, costo_unitario, stock_actual, familia').limit(15);
  console.log('Total cat_maquinas:', mCount);
  console.log('Total cat_refacciones:', rCount);
  console.log('Sample parts from DB:', sampleParts);
}

countRows();
