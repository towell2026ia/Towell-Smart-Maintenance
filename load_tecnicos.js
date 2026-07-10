const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://xqfpsavkefhrxfbtqzec.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxZnBzYXZrZWZocnhmYnRxemVjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjE0MzU5NywiZXhwIjoyMDk3NzE5NTk3fQ.o7GCLoa5YoDFWOxfvPayokuJhVYQvd2s5YtEq8DAs2U';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function main() {
  console.log('🤖 Starting technical team import...');

  // 1. Seed cat_turnos
  console.log('📤 Seeding cat_turnos...');
  const shiftsToSeed = [
    { id_turno: 1, nombre_turno: 'Turno 1', descripcion: 'Turno Matutino' },
    { id_turno: 2, nombre_turno: 'Turno 2', descripcion: 'Turno Vespertino' },
    { id_turno: 3, nombre_turno: 'Turno 3', descripcion: 'Turno Nocturno' },
    { id_turno: 4, nombre_turno: 'Turno 4', descripcion: 'Turno Especial / Mixto' }
  ];
  
  const { error: shiftErr } = await supabase
    .from('cat_turnos')
    .upsert(shiftsToSeed, { onConflict: 'id_turno' });

  if (shiftErr) {
    console.error('❌ Error seeding shifts:', shiftErr);
    return;
  }
  console.log('   ✅ cat_turnos seeded.');

  // 2. Read the Excel file
  const filePath = path.join(__dirname, 'importar_excel', 'TECNICOS_DE_MANTENIMIENTO.xlsx');
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found at: ${filePath}`);
    return;
  }

  const wb = XLSX.readFile(filePath);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  console.log(`✅ Loaded sheet with ${rawRows.length} grid rows.`);

  const techsToUpsert = [];
  const usersToUpsert = [];

  // Index 0: empty, Index 1: headers, Index 2+: data rows
  for (let i = 2; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (!row || row.length === 0) continue;

    const empNo = row[6];
    const name = row[7];
    const email = row[8];
    
    if (!empNo || !name || !email) {
      continue;
    }

    const dept = row[2] ? row[2].toString().trim().toUpperCase() : '';
    const section = row[3] ? row[3].toString().trim().toUpperCase() : '';
    const turnStr = row[4] ? row[4].toString().trim().toUpperCase() : '';
    const puesto = row[5] ? row[5].toString().trim().toUpperCase() : '';

    const cve_tecnico = `T-${empNo}`;
    const cleanEmail = email.toString().toLowerCase().trim();
    const cleanName = name.toString().trim();

    // Map department code
    let departamento_codigo = 'AF';
    if (section === 'COSTURA') {
      departamento_codigo = 'CF';
    } else if (section === 'TINTORERIA' || section === 'TINT' || section.includes('JET')) {
      departamento_codigo = 'TF';
    } else if (dept === 'MECÁNICO' && section === 'TALLER') {
      departamento_codigo = 'PF';
    }

    // Map turn ID (integer)
    let turno_id = 1;
    if (turnStr === 'CENTRAL') {
      turno_id = 1;
    } else {
      turno_id = parseInt(turnStr) || 1;
    }

    // Specialty & Role mapping
    const especialidad = `${dept}${section ? ' (' + section + ')' : ''} - ${puesto}`;
    const isBossOrCoord = puesto.includes('COORDINADOR') || puesto.includes('JEFE');
    const rol = isBossOrCoord ? 'SUPER_ADMINISTRADOR' : 'MANTENIMIENTO';

    techsToUpsert.push({
      cve_tecnico,
      nombre_tecnico: cleanName,
      correo: cleanEmail,
      especialidad,
      puesto: puesto.toLowerCase(),
      turno_id,
      departamento_codigo,
      activo: true
    });

    usersToUpsert.push({
      cve_tecnico,
      cve_empleado: cve_tecnico,
      nombre_completo: cleanName,
      correo: cleanEmail,
      rol,
      observaciones: especialidad,
      puede_crear_solicitud: isBossOrCoord,
      puede_ver_ordenes_asignadas: true,
      puede_ver_todas_ordenes: isBossOrCoord,
      puede_atender_orden: !isBossOrCoord,
      puede_cerrar_orden: true,
      puede_validar_cierre: isBossOrCoord,
      puede_editar_catalogos: isBossOrCoord,
      puede_ver_dashboards: isBossOrCoord,
      puede_configurar_sistema: isBossOrCoord,
      recibe_alertas: isBossOrCoord,
      activo: true,
      debe_cambiar_contrasenia: true
    });
  }

  console.log(`📊 Processing ${techsToUpsert.length} technical members...`);

  // 3. Upsert into cat_tecnicos
  console.log('📤 Upserting into cat_tecnicos...');
  const { error: techErr } = await supabase
    .from('cat_tecnicos')
    .upsert(techsToUpsert, { onConflict: 'cve_tecnico' });

  if (techErr) {
    console.error('❌ Error upserting technicians:', techErr);
    return;
  }
  console.log('   ✅ cat_tecnicos updated.');

  // 4. Upsert into cat_usuarios_roles
  console.log('📤 Upserting into cat_usuarios_roles...');
  const { error: userErr } = await supabase
    .from('cat_usuarios_roles')
    .upsert(usersToUpsert, { onConflict: 'correo' });

  if (userErr) {
    console.error('❌ Error upserting user roles:', userErr);
    return;
  }
  console.log('   ✅ cat_usuarios_roles updated.');

  console.log('🎉 Technical team database seed completed successfully!');
}

main();
