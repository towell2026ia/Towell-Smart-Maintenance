const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://xqfpsavkefhrxfbtqzec.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxZnBzYXZrZWZocnhmYnRxemVjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjE0MzU5NywiZXhwIjoyMDk3NzE5NTk3fQ.o7GCLoa5YoDFWOxfvPayokuJhVYQvd2s5YtEq8DAs2U';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function main() {
  console.log('🤖 Starting Super Administrator accounts import...');

  // 1. Read the Excel file
  const filePath = path.join(__dirname, 'importar_excel', 'Base_Super_Administrador.xlsx');
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found at: ${filePath}`);
    return;
  }

  const wb = XLSX.readFile(filePath);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  console.log(`✅ Loaded sheet with ${rawRows.length} grid rows.`);

  const usersToUpsert = [];

  // Index 0: metadata/empty, Index 1: headers, Index 2+: data rows
  for (let i = 2; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (!row || row.length === 0) continue;

    const empNo = row[4];
    const name = row[5];
    const email = row[6];
    
    if (!name || !email) {
      continue;
    }

    const dept = row[0] ? row[0].toString().trim().toUpperCase() : '';
    const section = row[1] ? row[1].toString().trim().toUpperCase() : '';
    const turnStr = row[2] ? row[2].toString().trim().toUpperCase() : '';
    const puesto = row[3] ? row[3].toString().trim().toUpperCase() : '';

    const cleanEmail = email.toString().toLowerCase().trim();
    const cleanName = name.toString().trim();

    // Map department / observations
    const observaciones = `${puesto} - ${dept}${section ? ' (' + section + ')' : ''}`;

    usersToUpsert.push({
      nombre_completo: cleanName,
      correo: cleanEmail,
      rol: 'SUPER_ADMINISTRADOR',
      observaciones: observaciones,
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
      activo: true,
      debe_cambiar_contrasenia: true
    });
  }

  console.log(`📊 Processing ${usersToUpsert.length} Super Administrator(s)...`);

  // 2. Upsert into cat_usuarios_roles
  console.log('📤 Upserting into cat_usuarios_roles...');
  const { error: userErr } = await supabase
    .from('cat_usuarios_roles')
    .upsert(usersToUpsert, { onConflict: 'correo' });

  if (userErr) {
    console.error('❌ Error upserting Super Administrators:', userErr);
    return;
  }
  console.log('   ✅ cat_usuarios_roles updated.');

  console.log('🎉 Super Administrators accounts import completed successfully!');
}

main();
