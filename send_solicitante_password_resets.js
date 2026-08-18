const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://xqfpsavkefhrxfbtqzec.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxZnBzYXZrZWZocnhmYnRxemVjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjE0MzU5NywiZXhwIjoyMDk3NzE5NTk3fQ.o7GCLoa5YoDFWOxfvPayokuJhVYQvd2s5YtEq8DAs2U';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const REDIRECT_URL = 'https://tsmail-towell.netlify.app';

async function processSolicitantePasswordResets() {
  console.log('================================================================');
  console.log('🚀 ENVÍO MASIVO DE CORREOS DE RESETEO DE CONTRASEÑA: SOLICITANTES');
  console.log('================================================================\n');

  // 1. Obtener todos los solicitantes activos de cat_usuarios_roles
  console.log('🔍 1. Consultando usuarios con rol "SOLICITANTE" en cat_usuarios_roles...');
  const { data: users, error: fetchErr } = await supabase
    .from('cat_usuarios_roles')
    .select('*')
    .eq('activo', true)
    .ilike('rol', '%SOLICITANTE%');

  if (fetchErr) {
    console.error('❌ Error consultando cat_usuarios_roles:', fetchErr.message);
    return;
  }

  // Filtrar cuentas demo o de prueba
  const solicitantes = users.filter(u => {
    const isDemo = String(u.nombre_completo || '').toLowerCase().includes('prueba') ||
                   String(u.correo || '').toLowerCase().includes('prueba');
    return !isDemo && u.correo && u.correo.includes('@');
  });

  console.log(`📋 Se identificaron ${solicitantes.length} solicitantes reales activos:\n`);
  solicitantes.forEach((s, idx) => {
    console.log(`   ${idx + 1}. ${s.nombre_completo} <${s.correo}> (Clave: ${s.cve_empleado || 'N/A'}, Área: ${s.area || 'CF'})`);
  });

  // 2. Obtener lista de usuarios en Supabase Auth
  console.log('\n🔐 2. Verificando usuarios en Supabase Auth...');
  const { data: authData, error: authErr } = await supabase.auth.admin.listUsers();
  if (authErr) {
    console.error('❌ Error obteniendo lista de usuarios de Auth:', authErr.message);
    return;
  }

  const existingAuthEmails = new Set((authData.users || []).map(u => (u.email || '').toLowerCase().trim()));

  // 3. Enviar correos de reseteo
  console.log('\n✉️ 3. Iniciando proceso de envío masivo de restablecimiento de contraseña...\n');

  let successCount = 0;
  let failCount = 0;
  const results = [];

  for (let i = 0; i < solicitantes.length; i++) {
    const s = solicitantes[i];
    const email = s.correo.toLowerCase().trim();
    console.log(`[${i + 1}/${solicitantes.length}] Procesando: ${s.nombre_completo} (${email})...`);

    try {
      // Si el usuario no existe en auth.users, crearlo primero para que pueda recibir el correo de recuperación
      if (!existingAuthEmails.has(email)) {
        console.log(`   ⚠️ Usuario no existía en Auth. Creando usuario en Supabase Auth...`);
        const tempPassword = 'Towell' + Math.floor(100000 + Math.random() * 900000) + '!';
        const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
          email: email,
          password: tempPassword,
          email_confirm: true,
          user_metadata: {
            nombre_completo: s.nombre_completo,
            rol: s.rol,
            cve_empleado: s.cve_empleado
          }
        });

        if (createErr) {
          console.error(`   ❌ Error creando usuario en Auth: ${createErr.message}`);
        } else {
          console.log(`   ✅ Usuario registrado en Supabase Auth (ID: ${newUser.user.id}).`);
          existingAuthEmails.add(email);
        }
      }

      // Enviar correo de restablecimiento de contraseña
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: REDIRECT_URL
      });

      if (resetErr) {
        console.error(`   ❌ Error al enviar correo de recuperación: ${resetErr.message}`);
        failCount++;
        results.push({ nombre: s.nombre_completo, correo: email, status: 'ERROR', error: resetErr.message });
      } else {
        console.log(`   ✅ Correo de restablecimiento enviado exitosamente a ${email}.`);
        successCount++;
        results.push({ nombre: s.nombre_completo, correo: email, status: 'ENVIADO' });

        // Marcar en la base de datos que debe cambiar contraseña
        await supabase
          .from('cat_usuarios_roles')
          .update({ debe_cambiar_contrasenia: true })
          .eq('id_usuario', s.id_usuario);
      }
    } catch (err) {
      console.error(`   ❌ Excepción procesando ${email}:`, err.message);
      failCount++;
      results.push({ nombre: s.nombre_completo, correo: email, status: 'EXCEPCIÓN', error: err.message });
    }

    // Esperar 1.8 segundos entre envíos para respetar la tasa de envío SMTP
    await sleep(1800);
  }

  console.log('\n================================================================');
  console.log('🎉 RESUMEN DE ENVÍO MASIVO A SOLICITANTES:');
  console.log(`   - Total procesados: ${solicitantes.length}`);
  console.log(`   - Envíos exitosos:  ${successCount} ✅`);
  console.log(`   - Envíos fallidos:  ${failCount} ❌`);
  console.log('================================================================\n');

  return results;
}

processSolicitantePasswordResets();
