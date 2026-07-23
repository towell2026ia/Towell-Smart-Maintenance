const { createClient } = require('@supabase/supabase-js');
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxZnBzYXZrZWZocnhmYnRxemVjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjE0MzU5NywiZXhwIjoyMDk3NzE5NTk3fQ.o7GCLoa5YoDFWOxfvPayokuJhVYQvd2s5YtEq8DAs2U';
const SUPABASE_URL = 'https://xqfpsavkefhrxfbtqzec.supabase.co';
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function main() {
  const email = 'fran.hrdz93@gmail.com';
  console.log(`Updating user ${email} to SUPER_ADMINISTRADOR...`);

  const { data, error } = await supabase
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
      recibe_alertas: true,
      debe_cambiar_contrasenia: false
    })
    .eq('correo', email)
    .select();

  if (error) {
    console.error('Error updating role:', error);
  } else {
    console.log('Update successful. Updated user data:', JSON.stringify(data, null, 2));
  }
}

main().catch(console.error);
