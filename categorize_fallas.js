// categorize_fallas.js
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://xqfpsavkefhrxfbtqzec.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_6iHpR6R2yCdqy-YsvCWkSQ_YWg9my_i';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const rules = [
  { cat: 'Eléctrica/Electrónica', regex: /sensor|motor|cort|luz|cabl|contact|switch|boton|botón|potens|potenc|tarjeta|foco|fusibl|voltaje|amperaje|resistenc/i },
  { cat: 'Neumática/Hidráulica', regex: /manguera|tubo|válvula|valvula|pistón|piston|presión|presion|fuga|aire|agua|vapor|cilindro|sello|oring|o-ring/i },
  { cat: 'Lubricación', regex: /aceit|gras|lubric|filtr|engras|nivel/i },
  { cat: 'Rodamientos', regex: /balero|rodamiento|chumacera|buje|collar|rodillo/i },
  { cat: 'Limpieza', regex: /limpiez|sucio|polvo|basur|soplete|lavar|residuo|pelusa|soplar/i },
  { cat: 'Mecánica', regex: /ajuste|ajustar|cuchilla|tornillo|banda|engranaje|caden|resorte|tensi[oó]n|faja|polea|flecha|freno|embrague|gancho|aguja|dobladillador|etiquetador|hilo|trama|corte|rompi/i },
  { cat: 'Preventivo/Revisión', regex: /preventivo|revisi[oó]n|revisar|checar|chequeo|mantenimiento|calibraci[oó]n|ruido|alarma|inspecci[oó]n|rutina/i }
];

function getCategory(desc) {
  if (!desc) return 'Otros';
  for (let rule of rules) {
    if (rule.regex.test(desc)) return rule.cat;
  }
  return 'Otros'; // Default
}

async function run() {
  console.log('Iniciando categorización masiva de fallas...');
  
  const categoriasUnicas = [...new Set(rules.map(r => r.cat)), 'Otros'];
  
  for (let c of categoriasUnicas) {
    const { error } = await supabase.from('cat_categorias_falla').insert({ nombre_categoria: c });
  }
  console.log('Catálogo de categorías revisado.');

  console.log('Descargando fallas únicas...');
  let hasMore = true;
  let page = 0;
  const pageSize = 1000;
  let distinctMap = new Map();

  while (hasMore) {
    const { data, error } = await supabase
      .from('fallas_por_maquina')
      .select('id_falla, descripcion_falla, categoria_falla')
      .is('categoria_falla', null)
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) { console.error('Error fetching fallas:', error); break; }
    if (data.length === 0) { hasMore = false; break; }

    for (let r of data) {
      distinctMap.set(r.id_falla, getCategory(r.descripcion_falla));
    }
    process.stdout.write(`\rDescargadas: ${distinctMap.size} filas...`);
    page++;
    if (data.length < pageSize) hasMore = false;
  }

  const fallasArray = Array.from(distinctMap.entries());
  console.log(`\nClasificando ${fallasArray.length} registros...`);

  let successCount = 0;
  const updBatchSize = 100; // Small batch to prevent URL length errors in Supabase REST API
  
  for (let i = 0; i < fallasArray.length; i += updBatchSize) {
    const chunk = fallasArray.slice(i, i + updBatchSize);
    
    const grouped = {};
    for (let [id, cat] of chunk) {
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(id);
    }

    for (let cat in grouped) {
      const ids = grouped[cat];
      const { error: updErr } = await supabase
        .from('fallas_por_maquina')
        .update({ categoria_falla: cat })
        .in('id_falla', ids);
        
      if (updErr) {
        console.error(`\nError actualizando batch de categoria ${cat}:`, updErr.message);
      } else {
        successCount += ids.length;
      }
    }
    process.stdout.write(`\rActualizados: ${successCount} / ${fallasArray.length}`);
  }
  
  console.log('\n✅ Categorización completada exitosamente.');
}

run();
