const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = "https://xqfpsavkefhrxfbtqzec.supabase.co";
const supabaseKey = "sb_publishable_6iHpR6R2yCdqy-YsvCWkSQ_YWg9my_i";

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanMockData() {
  console.log('--- START CLEANUP OF MOCK/SEED DATA ---');
  
  // 1. Delete mock orders where origen = 'Seed' or folio contains mock patterns
  try {
    const { data: orders, error: getErr } = await supabase
      .from('ordenes_trabajo')
      .select('id_orden, folio, descripcion, origen');
    if (getErr) throw getErr;

    console.log(`Found total ${orders.length} orders in Supabase.`);
    const mockOrderIds = [];
    orders.forEach(o => {
      const isMock = 
        o.origen === 'Seed' || 
        o.folio?.startsWith('MC-') || 
        o.folio?.startsWith('MP-') || 
        o.folio?.startsWith('REQ-') ||
        o.descripcion?.includes('Falla eléctrica general') ||
        o.descripcion?.includes('Limpieza interna') ||
        o.descripcion?.includes('Fuga de aceite') ||
        o.descripcion?.includes('reincidente') ||
        o.descripcion?.includes('Hiladoras');
        
      if (isMock) {
        mockOrderIds.push(o.id_orden);
        console.log(`- Flagged mock order: ${o.folio} - ${o.descripcion}`);
      }
    });

    if (mockOrderIds.length > 0) {
      console.log(`Deleting ${mockOrderIds.length} mock orders...`);
      const { error: delErr } = await supabase
        .from('ordenes_trabajo')
        .delete()
        .in('id_orden', mockOrderIds);
      if (delErr) throw delErr;
      console.log('✓ Successfully deleted mock orders.');
    } else {
      console.log('No mock orders found.');
    }
  } catch (err) {
    console.error('Error cleaning mock orders:', err);
  }

  // 2. Delete mock machines from cat_maquinas where origen = 'Seed' or team starts with M-
  try {
    const { data: machines, error: getErr } = await supabase
      .from('cat_maquinas')
      .select('equipo_towell, origen');
    if (getErr) throw getErr;

    const mockMachines = machines
      .filter(m => m.origen === 'Seed' || m.equipo_towell?.startsWith('M-'))
      .map(m => m.equipo_towell);

    if (mockMachines.length > 0) {
      console.log(`Deleting ${mockMachines.length} mock machines:`, mockMachines);
      const { error: delErr } = await supabase
        .from('cat_maquinas')
        .delete()
        .in('equipo_towell', mockMachines);
      if (delErr) throw delErr;
      console.log('✓ Successfully deleted mock machines.');
    } else {
      console.log('No mock machines found.');
    }
  } catch (err) {
    console.error('Error cleaning mock machines:', err);
  }

  // 3. Delete mock users/techs from cat_usuarios_roles
  try {
    const { data: users, error: getErr } = await supabase
      .from('cat_usuarios_roles')
      .select('id_usuario, nombre_completo, cve_tecnico, correo');
    if (getErr) throw getErr;

    const mockUserIds = [];
    users.forEach(u => {
      const isMock = 
        u.cve_tecnico?.startsWith('T-') || 
        u.correo?.includes('@tsm-ai.com') ||
        ['Carlos Mendoza', 'Sofía Ruiz', 'Alejandro Gómez', 'Super Administrador'].includes(u.nombre_completo);
      if (isMock) {
        mockUserIds.push(u.id_usuario);
        console.log(`- Flagged mock user: ${u.nombre_completo} (${u.correo})`);
      }
    });

    if (mockUserIds.length > 0) {
      console.log(`Deleting ${mockUserIds.length} mock users...`);
      const { error: delErr } = await supabase
        .from('cat_usuarios_roles')
        .delete()
        .in('id_usuario', mockUserIds);
      if (delErr) throw delErr;
      console.log('✓ Successfully deleted mock users.');
    } else {
      console.log('No mock users found.');
    }
  } catch (err) {
    console.error('Error cleaning mock users:', err);
  }

  console.log('--- CLEANUP COMPLETE ---');
}

cleanMockData();
