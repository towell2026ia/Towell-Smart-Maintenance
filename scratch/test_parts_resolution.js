const { createClient } = require('@supabase/supabase-js');
const supabase = createClient("https://xqfpsavkefhrxfbtqzec.supabase.co", "sb_publishable_6iHpR6R2yCdqy-YsvCWkSQ_YWg9my_i");

async function testResolution() {
  console.log('--- Fetching real database catalogs ---');
  const { data: dbParts } = await supabase.from('cat_refacciones').select('*').limit(5000);
  const { data: dbMachines } = await supabase.from('cat_maquinas').select('*').limit(200);

  console.log(`Fetched ${dbParts.length} parts and ${dbMachines.length} machines.`);

  const allParts = dbParts.map(p => ({
    id: p.codigo_articulo,
    code: p.codigo_articulo,
    name: p.nombre_articulo,
    category: p.familia,
    stock: parseFloat(p.stock_actual) || 0,
    minStock: parseFloat(p.stock_minimo) || 0,
    cost: parseFloat(p.costo_unitario) || 0,
    activo: p.activo !== false
  }));

  const refPorMaquina = [];

  function getPartsByMachineTest(machineId, filterName = '') {
    if (!machineId || machineId === '' || machineId === 'NO_APLICA' || machineId === 'NO APLICA MÁQUINA' || machineId === 'NONE') {
      return [];
    }

    const cleanMacId = String(machineId).toUpperCase().trim();
    let resultParts = [];

    // 1. Explicit relational matches
    const linkedParts = refPorMaquina.filter(rm => {
      const mac = String(rm.maquina_id || rm.maquina || rm.equipo || '').toUpperCase().trim();
      return mac && (mac === cleanMacId || mac.includes(cleanMacId) || cleanMacId.includes(mac));
    });

    if (linkedParts.length > 0) {
      resultParts = linkedParts.map(lp => ({
        id: lp.codigo_articulo || lp.id,
        code: lp.codigo_articulo || lp.code || lp.id,
        name: lp.nombre_articulo || lp.nombre || lp.name || 'Refacción sin nombre',
        cost: parseFloat(lp.precio_costo_unitario || lp.costo || 0),
        stock: parseFloat(lp.cantidad_estandar || lp.stock || 10),
        machineId: cleanMacId,
        isDirectMatch: true
      }));
    } else {
      // 2. Direct match by machineId in catalog
      const directMacParts = allParts.filter(p => {
        const pMac = String(p.machineId || p.maquina_id || p.maquina || '').toUpperCase().trim();
        return pMac && (pMac === cleanMacId || pMac.includes(cleanMacId) || cleanMacId.includes(pMac));
      });

      if (directMacParts.length > 0) {
        resultParts = directMacParts.map(p => ({
          id: p.id || p.code || p.codigo_articulo,
          code: p.code || p.id || p.codigo_articulo,
          name: p.name || p.nombre || p.nombre_articulo || 'Refacción sin nombre',
          cost: parseFloat(p.cost || p.costo_unitario || p.precio_unitario || 0),
          stock: parseFloat(p.stock || 10),
          machineId: p.machineId || p.maquina_id || cleanMacId,
          isDirectMatch: true
        }));
      } else {
        // 3. Fallback Contextual Inteligente + Catálogo Universal Completo
        const macTokens = cleanMacId.split(/[-_\s/]+/).filter(t => t.length >= 3);

        resultParts = allParts.map(p => {
          const pCode = String(p.id || p.code || p.codigo_articulo || '').toUpperCase();
          const pName = String(p.name || p.nombre || p.nombre_articulo || '').toUpperCase();
          const pFam = String(p.category || p.familia || '').toUpperCase();

          let score = 0;
          macTokens.forEach(tok => {
            if (pName.includes(tok) || pCode.includes(tok) || pFam.includes(tok)) score += 10;
          });

          return {
            id: p.id || p.code || p.codigo_articulo,
            code: p.code || p.id || p.codigo_articulo,
            name: p.name || p.nombre || p.nombre_articulo || 'Refacción sin nombre',
            cost: parseFloat(p.cost || p.costo_unitario || p.precio_unitario || 0),
            stock: parseFloat(p.stock || 10),
            machineId: cleanMacId,
            score: score
          };
        });
      }
    }

    // 4. Live filter
    if (filterName && filterName.trim() !== '') {
      const cleanFilter = filterName.toLowerCase().trim();
      resultParts = resultParts.filter(p => 
        (p.name && p.name.toLowerCase().includes(cleanFilter)) ||
        (p.code && p.code.toLowerCase().includes(cleanFilter))
      );
    }

    // 5. Sort > $1,000 MXN first
    resultParts.sort((a, b) => {
      const aScore = a.score || 0;
      const bScore = b.score || 0;
      if (aScore !== bScore) return bScore - aScore;

      const aOver1000 = (a.cost > 1000) ? 1 : 0;
      const bOver1000 = (b.cost > 1000) ? 1 : 0;
      if (aOver1000 !== bOver1000) {
        return bOver1000 - aOver1000;
      }
      return b.cost - a.cost;
    });

    return resultParts;
  }

  // Test 1: Selecting Telar TOW-TEL201-TEJI
  console.log('\n--- TEST 1: Select TOW-TEL201-TEJI without filter ---');
  const res1 = getPartsByMachineTest('TOW-TEL201-TEJI');
  console.log(`Total parts returned: ${res1.length}`);
  console.log('Top 5 parts:');
  res1.slice(0, 5).forEach((p, i) => console.log(`  ${i+1}. [${p.code}] ${p.name} - $${p.cost} MXN (Score: ${p.score})`));

  // Test 2: Selecting Telar TOW-TEL201-TEJI with live filter "BANDA"
  console.log('\n--- TEST 2: Select TOW-TEL201-TEJI with filter "BANDA" ---');
  const res2 = getPartsByMachineTest('TOW-TEL201-TEJI', 'BANDA');
  console.log(`Matching parts with "BANDA": ${res2.length}`);
  res2.slice(0, 5).forEach((p, i) => console.log(`  ${i+1}. [${p.code}] ${p.name} - $${p.cost} MXN`));

  // Test 3: Selecting Rectilínea TOW-RECT7-COST with live filter "OPRESOR"
  console.log('\n--- TEST 3: Select TOW-RECT7-COST with filter "OPRESOR" ---');
  const res3 = getPartsByMachineTest('TOW-RECT7-COST', 'OPRESOR');
  console.log(`Matching parts with "OPRESOR": ${res3.length}`);
  res3.slice(0, 5).forEach((p, i) => console.log(`  ${i+1}. [${p.code}] ${p.name} - $${p.cost} MXN`));

  // Test 4: Selecting NO_APLICA
  console.log('\n--- TEST 4: Select NO_APLICA ---');
  const res4 = getPartsByMachineTest('NO_APLICA');
  console.log(`Parts returned for NO_APLICA: ${res4.length} (Expected: 0)`);
}

testResolution();
