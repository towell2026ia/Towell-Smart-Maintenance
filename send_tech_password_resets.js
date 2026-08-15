const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://xqfpsavkefhrxfbtqzec.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxZnBzYXZrZWZocnhmYnRxemVjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjE0MzU5NywiZXhwIjoyMDk3NzE5NTk3fQ.o7GCLoa5YoDFWOxfvPayokuJhVYQvd2s5YtEq8DAs2U';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function processTechPasswordResets() {
  console.log('====================================================');
  console.log('🚪 PURGA DE USUARIOS DEMO Y ENVÍO DE CORREOS A TÉCNICOS');
  console.log('====================================================\n');

  // 1. Eliminar usuario demo "Tornero a prueba" / demo de cat_usuarios_roles y auth.users
  console.log('🧹 1. Eliminando usuarios demo/prueba de la base de datos real...');
  const { data: demoUsers, error: demoErr } = await supabase
    .from('cat_usuarios_roles')
    .select('*')
    .or('correo.ilike.%taller.tornotw%,nombre_completo.ilike.%prueba%,correo.ilike.%demo%');

  if (demoErr) {
    console.warn('⚠️ Warning buscando demo users:', demoErr.message);
  } else if (demoUsers && demoUsers.length > 0) {
    for (const dUser of demoUsers) {
      console.log(`🗑️ Eliminando usuario demo: ${dUser.nombre_completo} (${dUser.correo}) [ID: ${dUser.id_usuario}]`);
      
      // Delete from cat_usuarios_roles
      const { error: delDbErr } = await supabase
        .from('cat_usuarios_roles')
        .delete()
        .eq('id_usuario', dUser.id_usuario);

      if (delDbErr) {
        console.error(`   ❌ Error eliminando de cat_usuarios_roles: ${delDbErr.message}`);
      } else {
        console.log(`   ✅ Eliminado de cat_usuarios_roles.`);
      }

      // Delete from auth.users if exists
      const { error: delAuthErr } = await supabase.auth.admin.deleteUser(dUser.id_usuario);
      if (delAuthErr) {
        console.warn(`   ⚠️ Warning eliminando de auth.users: ${delAuthErr.message}`);
      } else {
        console.log(`   ✅ Eliminado de auth.users.`);
      }
    }
  } else {
    console.log('   No se encontraron usuarios demo pendientes por eliminar.');
  }

  // 2. Consultar todos los técnicos reales activos
  console.log('\n📋 2. Consultando técnicos reales en cat_usuarios_roles...');
  const { data: users, error: fetchErr } = await supabase
    .from('cat_usuarios_roles')
    .select('*')
    .eq('activo', true);

  if (fetchErr) {
    console.error('❌ Error consultando cat_usuarios_roles:', fetchErr.message);
    return;
  }

  const TECH_ROLES = ['MANTENIMIENTO', 'TECNICO', 'TECH', 'MECANICO', 'ELECTRICO'];

  const realTechs = users.filter((u) => {
    if (!u.rol) return false;
    const r = String(u.rol).toUpperCase().trim();
    const isTech = TECH_ROLES.includes(r);
    const isDemo = String(u.nombre_completo || '').toLowerCase().includes('prueba') ||
                   String(u.correo || '').toLowerCase().includes('demo') ||
                   String(u.correo || '').toLowerCase().includes('taller.tornotw');
    return isTech && !isDemo;
  });

  console.log(`\nFound ${realTechs.length} real active technicians:`);
  realTechs.forEach((t, i) => {
    console.log(`   ${i + 1}. ${t.nombre_completo} (${t.correo}) [Clave: ${t.cve_tecnico || 'N/A'}]`);
  });

  console.log('\n🚀 3. Iniciando envío de correos de restablecimiento de contraseña...\n');

  let successCount = 0;
  let failCount = 0;

  for (const tech of realTechs) {
    const email = tech.correo ? tech.correo.toLowerCase().trim() : '';

    if (!email) {
      console.warn(`⚠️ Omitido: ${tech.nombre_completo} no tiene correo.`);
      failCount++;
      continue;
    }

    console.log(`✉️ Enviando correo a: ${tech.nombre_completo} (${email})...`);

    try {
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://tsmail-towell.netlify.app'
      });

      if (resetErr) {
        console.error(`   ❌ Error al enviar a ${email}: ${resetErr.message}`);
        failCount++;
      } else {
        console.log(`   ✅ Correo de restablecimiento enviado exitosamente a ${email}.`);
        successCount++;
      }
    } catch (err) {
      console.error(`   ❌ Excepción enviando a ${email}:`, err.message);
      failCount++;
    }

    // Pausa de 2 segundos entre envíos para no saturar SMTP de Gmail
    await sleep(2000);
  }

  console.log('\n========================================');
  console.log(`🎉 RESUMEN DE PROCESO:`);
  console.log(`   - Técnicos Notificados Exitosamente: ${successCount}`);
  console.log(`   - Fallidos / Sin correo:             ${failCount}`);
  console.log('========================================');
}

processTechPasswordResets();
