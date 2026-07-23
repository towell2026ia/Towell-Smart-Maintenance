const { createClient } = require('@supabase/supabase-js');
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxZnBzYXZrZWZocnhmYnRxemVjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjE0MzU5NywiZXhwIjoyMDk3NzE5NTk3fQ.o7GCLoa5YoDFWOxfvPayokuJhVYQvd2s5YtEq8DAs2U';
const SUPABASE_URL = 'https://xqfpsavkefhrxfbtqzec.supabase.co';
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function main() {
  // Update auth metadata for fran.hrdz93@gmail.com
  const userId1 = 'c990d6e0-d2e2-4860-8612-bd2a078f6258';
  console.log(`Updating auth metadata for user ${userId1} (fran.hrdz93@gmail.com)...`);
  const { data: user1, error: error1 } = await supabase.auth.admin.updateUserById(
    userId1,
    { user_metadata: { nombre_completo: 'Francisco Hernandez', rol: 'SUPER_ADMINISTRADOR' } }
  );
  if (error1) {
    console.error('Error updating user1:', error1);
  } else {
    console.log('User1 updated successfully!');
  }

  // Also make sure it's set in cat_usuarios_roles for both emails
  console.log('Ensuring roles in cat_usuarios_roles...');
  await supabase
    .from('cat_usuarios_roles')
    .update({
      rol: 'SUPER_ADMINISTRADOR',
      puede_crear_solicitud: true,
      puede_ver_ordenes_asignadas: true,
      puede_ver_todas_ordenes: true,
      puede_atender_orden: true,
      puede_cerrar_orden: true,
      puede_validar_cierre: true,
      puede_editar_catalogos: true,
      puede_ver_dashboards: true,
      puede_configurar_sistema: true,
      recibe_alertas: true
    })
    .in('correo', ['fran.hrdz93@gmail.com', 'f.hernandez@towell.com.mx']);

  console.log('All roles updated successfully!');
}

main().catch(console.error);
