const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://xqfpsavkefhrxfbtqzec.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxZnBzYXZrZWZocnhmYnRxemVjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjE0MzU5NywiZXhwIjoyMDk3NzE5NTk3fQ.o7GCLoa5YoDFWOxfvPayokuJhVYQvd2s5YtEq8DAs2U';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const ADMIN_ROLES = ['SUPER_ADMINISTRADOR', 'ADMINISTRADOR', 'SUPER_ADMIN', 'ADMIN'];
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function sendSuperAdminResets() {
  console.log('🔍 Consultando Super Administradores activos en cat_usuarios_roles...');

  const { data: users, error: fetchErr } = await supabase
    .from('cat_usuarios_roles')
    .select('id_usuario, correo, rol, nombre_completo')
    .eq('activo', true);

  if (fetchErr) {
    console.error('❌ Error consultando la base de datos:', fetchErr.message);
    return;
  }

  const superAdmins = users.filter((u) => {
    if (!u.rol) return false;
    const r = String(u.rol).toUpperCase().trim();
    return ADMIN_ROLES.includes(r);
  });

  console.log(`📋 Se encontraron ${superAdmins.length} Super Administradores activos:`);
  superAdmins.forEach(u => console.log(`   - ${u.nombre_completo} (${u.correo}) [Rol: ${u.rol}]`));
  console.log('\n🚀 Iniciando envío masivo de correos de recuperación...\n');

  let successCount = 0;
  let failCount = 0;

  for (const admin of superAdmins) {
    const email = admin.correo ? admin.correo.toLowerCase().trim() : '';

    if (!email) {
      console.warn(`⚠️ Omitido: ${admin.nombre_completo} (ID: ${admin.id_usuario}) no tiene correo registrado.`);
      failCount++;
      continue;
    }

    console.log(`✉️ Enviando correo a: ${admin.nombre_completo} (${email})...`);

    try {
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://xqfpsavkefhrxfbtqzec.supabase.co'
      });

      if (resetErr) {
        console.error(`   ❌ Error al enviar a ${email}: ${resetErr.message}`);
        failCount++;
      } else {
        console.log(`   ✅ Correo enviado exitosamente a ${email}.`);
        successCount++;
      }
    } catch (err) {
      console.error(`   ❌ Excepción enviando a ${email}:`, err.message);
      failCount++;
    }

    // Esperar 2 segundos entre envíos para no saturar el servidor SMTP de Gmail
    await sleep(2000);
  }

  console.log('\n========================================');
  console.log(`🎉 Proceso completado:`);
  console.log(`   - Exitosos: ${successCount}`);
  console.log(`   - Fallidos: ${failCount}`);
  console.log('========================================');
}

sendSuperAdminResets();
