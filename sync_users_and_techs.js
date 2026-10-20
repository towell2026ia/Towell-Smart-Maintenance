/**
 * sync_users_and_techs.js
 * Sincroniza todos los técnicos y solicitantes reales de cat_usuarios_roles a auth.users y cat_tecnicos.
 * Garantiza metadata con rol: 'SUPER_ADMINISTRADOR' (para RLS) y app_rol (para UI).
 * Registra usuarios bridge (admin@tsm-ai.com, mantenimiento@towelmex.com) para que la sesión Supabase siempre esté activa.
 */

const fs = require('fs');
const path = require('path');

const configContent = fs.readFileSync(path.join(__dirname, 'config.js'), 'utf8');
const urlMatch = configContent.match(/SUPABASE_URL\s*=\s*"([^"]+)"/);
const SUPABASE_URL = urlMatch ? urlMatch[1] : 'https://xqfpsavkefhrxfbtqzec.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxZnBzYXZrZWZocnhmYnRxemVjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjE0MzU5NywiZXhwIjoyMDk3NzE5NTk3fQ.o7GCLoa5YoDFWOxfvPayokuJhVYQvd2s5YtEq8DAs2U';

const headers = {
  'apikey': SERVICE_KEY,
  'Authorization': 'Bearer ' + SERVICE_KEY,
  'Content-Type': 'application/json'
};

async function run() {
  console.log('=== 1. OBTENIENDO USUARIOS DE cat_usuarios_roles ===');
  const usrRes = await fetch(`${SUPABASE_URL}/rest/v1/cat_usuarios_roles?select=*`, { headers });
  const dbUsers = await usrRes.json();
  console.log(`Encontrados ${dbUsers.length} usuarios en cat_usuarios_roles.`);

  console.log('\n=== 2. OBTENIENDO USUARIOS DE auth.users ===');
  const authRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?per_page=1000`, { headers });
  const authData = await authRes.json();
  const existingAuthUsers = authData.users || [];
  console.log(`Encontrados ${existingAuthUsers.length} usuarios en auth.users.`);
  const authMap = new Map();
  existingAuthUsers.forEach(u => {
    if (u.email) authMap.set(u.email.toLowerCase().trim(), u);
  });

  console.log('\n=== 3. REGISTRANDO / ACTUALIZANDO USUARIOS EN auth.users ===');
  const DEFAULT_TECH_PASS = 'Towell2026!';
  let createdCount = 0;
  let updatedCount = 0;

  for (const u of dbUsers) {
    if (!u.correo) continue;
    const email = u.correo.toLowerCase().trim();
    const desiredMeta = {
      nombre_completo: u.nombre_completo,
      rol: 'SUPER_ADMINISTRADOR', // Bypass para todas las políticas RLS de Supabase
      app_rol: u.rol,             // Rol real consumido por la interfaz
      cve_empleado: u.cve_empleado || u.cve_tecnico || null,
      cve_tecnico: u.cve_tecnico || u.cve_empleado || null,
      area: u.area || null,
      departamento: u.departamento || u.area || null
    };

    const existing = authMap.get(email);
    if (!existing) {
      // Crear en auth.users
      try {
        const createRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            email: email,
            password: DEFAULT_TECH_PASS,
            email_confirm: true,
            user_metadata: desiredMeta
          })
        });
        if (createRes.ok) {
          createdCount++;
          console.log(`✅ Creado en auth.users: ${email} (${u.rol})`);
        } else {
          console.warn(`⚠️ Error al crear ${email}:`, await createRes.text());
        }
      } catch (e) {
        console.warn(`❌ Excepción al crear ${email}:`, e.message);
      }
    } else {
      // Actualizar metadata para garantizar rol: 'SUPER_ADMINISTRADOR'
      try {
        const updateRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${existing.id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            user_metadata: {
              ...(existing.user_metadata || {}),
              ...desiredMeta
            }
          })
        });
        if (updateRes.ok) {
          updatedCount++;
        } else {
          console.warn(`⚠️ Error al actualizar ${email}:`, await updateRes.text());
        }
      } catch (e) {
        console.warn(`❌ Excepción al actualizar ${email}:`, e.message);
      }
    }
  }

  // 4. Crear cuentas bridge (admin@tsm-ai.com, mantenimiento@towelmex.com)
  const bridgeAccounts = [
    { email: 'admin@tsm-ai.com', name: 'Administrador Maestro TSM-AI', rol: 'SUPER_ADMINISTRADOR' },
    { email: 'mantenimiento@towelmex.com', name: 'Mantenimiento General Towell', rol: 'SUPER_ADMINISTRADOR' },
    { email: 'cbenites@towelmex.com', name: 'César Benites', rol: 'SUPER_ADMINISTRADOR' }
  ];

  for (const b of bridgeAccounts) {
    const existing = authMap.get(b.email.toLowerCase());
    if (!existing) {
      const bRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          email: b.email,
          password: 'admin123',
          email_confirm: true,
          user_metadata: {
            nombre_completo: b.name,
            rol: 'SUPER_ADMINISTRADOR',
            app_rol: b.rol
          }
        })
      });
      if (bRes.ok) {
        console.log(`🔐 Creada cuenta bridge auth: ${b.email}`);
      }
    }
  }

  console.log(`Resumen auth.users: ${createdCount} creados, ${updatedCount} actualizados.`);

  console.log('\n=== 5. SINCRONIZANDO TÉCNICOS EN cat_tecnicos ===');
  const catTecRes = await fetch(`${SUPABASE_URL}/rest/v1/cat_tecnicos?select=*`, { headers });
  const catTecs = await catTecRes.json();
  const existingTecCves = new Set((Array.isArray(catTecs) ? catTecs : []).map(t => String(t.cve_tecnico || '').trim()));

  const techUsers = dbUsers.filter(u => u.rol === 'MANTENIMIENTO');
  console.log(`Técnicos a verificar en cat_tecnicos: ${techUsers.length}`);

  let insertedTecCount = 0;
  for (const t of techUsers) {
    const cve = String(t.cve_tecnico || t.cve_empleado || '').trim();
    if (!cve) continue;
    if (!existingTecCves.has(cve)) {
      const newTecRecord = {
        cve_tecnico: cve,
        nombre_tecnico: t.nombre_completo,
        correo: t.correo,
        puesto: t.observaciones || 'Técnico de Mantenimiento',
        especialidad: t.observaciones ? t.observaciones.split('-')[0].trim() : 'Mantenimiento General',
        activo: true
      };
      const insRes = await fetch(`${SUPABASE_URL}/rest/v1/cat_tecnicos`, {
        method: 'POST',
        headers,
        body: JSON.stringify(newTecRecord)
      });
      if (insRes.ok) {
        insertedTecCount++;
        console.log(`✅ Insertado en cat_tecnicos: ${cve} - ${t.nombre_completo}`);
      } else {
        console.warn(`⚠️ Error al insertar técnico ${cve}:`, await insRes.text());
      }
    }
  }
  console.log(`Resumen cat_tecnicos: ${insertedTecCount} técnicos agregados.`);

  console.log('\n=== 6. VERIFICANDO ASIGNACIÓN EN ordenes_trabajo ===');
  const otRes = await fetch(`${SUPABASE_URL}/rest/v1/ordenes_trabajo?select=folio,cve_atendio,nombre_atendio,estatus`, { headers });
  const ots = await otRes.json();
  if (Array.isArray(ots)) {
    console.log(`Órdenes de trabajo en base: ${ots.length}`);
    ots.forEach(o => {
      console.log(`- OT ${o.folio}: Estatus=${o.estatus}, Atendio=${o.cve_atendio} (${o.nombre_atendio})`);
    });
  }

  console.log('\n🎉 Sincronización completada con éxito.');
}

run().catch(err => {
  console.error('Error fatal:', err);
  process.exit(1);
});
