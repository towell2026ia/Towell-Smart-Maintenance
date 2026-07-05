const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://xqfpsavkefhrxfbtqzec.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_6iHpR6R2yCdqy-YsvCWkSQ_YWg9my_i';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  console.log('--- 1. Población de Análisis de Repetibilidad ---');
  // Obtenemos todas las fallas que tengan categoria
  const { data: fallas, error: errF } = await supabase
    .from('fallas_por_maquina')
    .select('maquina_id, categoria_falla, fecha_hora_creada')
    .not('categoria_falla', 'is', null);
    
  if (errF) {
    console.error('Error fetching fallas:', errF);
  } else {
    // Agrupar
    const groups = {};
    fallas.forEach(f => {
      const key = `${f.maquina_id}|${f.categoria_falla}`;
      if(!groups[key]) groups[key] = { count: 0, minDate: f.fecha_hora_creada, maxDate: f.fecha_hora_creada };
      groups[key].count++;
      if (f.fecha_hora_creada < groups[key].minDate) groups[key].minDate = f.fecha_hora_creada;
      if (f.fecha_hora_creada > groups[key].maxDate) groups[key].maxDate = f.fecha_hora_creada;
    });
    
    const inserts = [];
    for (let key in groups) {
      if (groups[key].count > 1) {
        const [maquina_id, cat] = key.split('|');
        const diffTime = Math.abs(new Date(groups[key].maxDate) - new Date(groups[key].minDate));
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        let nivel = 'Bajo';
        if (groups[key].count > 10) nivel = 'Alto';
        else if (groups[key].count > 5) nivel = 'Medio';
        
        inserts.push({
          maquina_id: maquina_id,
          categoria_falla: cat,
          cantidad_repeticiones: groups[key].count,
          periodo_dias: diffDays,
          fecha_primera_falla: groups[key].minDate ? groups[key].minDate.split('T')[0] : null,
          fecha_ultima_falla: groups[key].maxDate ? groups[key].maxDate.split('T')[0] : null,
          nivel_riesgo: nivel
        });
      }
    }
    
    // We can't truncate from REST API, but we can delete all or just upsert if there was a unique key. 
    // Wait, let's just insert them, we know it's empty (0 rows).
    if (inserts.length > 0) {
      // Chunk inserts
      for(let i=0; i<inserts.length; i+=1000) {
        const { error: insErr } = await supabase.from('analisis_repetibilidad_fallas').insert(inserts.slice(i, i+1000));
        if(insErr) console.error('Insert err:', insErr);
      }
      console.log(`Analisis completado: ${inserts.length} registros insertados.`);
    }
  }
}

run();
