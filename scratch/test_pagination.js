const { createClient } = require('@supabase/supabase-js');
const supabase = createClient("https://xqfpsavkefhrxfbtqzec.supabase.co", "sb_publishable_6iHpR6R2yCdqy-YsvCWkSQ_YWg9my_i");

async function testPagination() {
  let allParts = [];
  let page = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const from = page * pageSize;
    const to = from + pageSize - 1;
    const { data, error } = await supabase
      .from('cat_refacciones')
      .select('codigo_articulo, nombre_articulo, familia, unidad_medida, stock_actual, stock_minimo, costo_unitario, activo')
      .range(from, to);

    if (error || !data || data.length === 0) {
      hasMore = false;
    } else {
      allParts = allParts.concat(data);
      if (data.length < pageSize) {
        hasMore = false;
      } else {
        page++;
      }
    }
  }

  console.log(`Successfully fetched ALL ${allParts.length} parts from Supabase in ${page + 1} pages!`);
}

testPagination();
