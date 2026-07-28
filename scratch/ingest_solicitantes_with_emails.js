const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://xqfpsavkefhrxfbtqzec.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxZnBzYXZrZWZocnhmYnRxemVjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjE0MzU5NywiZXhwIjoyMDk3NzE5NTk3fQ.o7GCLoa5YoDFWOxfvPayokuJhVYQvd2s5YtEq8DAs2U';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function run() {
  console.log('🚀 Iniciando ingesta corregida de LISTADO_SOLICITANTES...');

  const excelPath = path.join(__dirname, '..', 'importar_excel', 'LISTADO_SOLICITANTES.xlsx');
  if (!fs.existsSync(excelPath)) {
    console.error('❌ No se encontró el archivo LISTADO_SOLICITANTES.xlsx');
    return;
  }

  const wb = XLSX.readFile(excelPath);
  const sheetName = wb.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName]);

  console.log(`📋 Se leyeron ${rows.length} filas del archivo Excel.`);

  // 1. Limpiar solicitantes anteriores
  console.log('🧹 Limpiando registros anteriores de solicitantes...');
  await supabase.from('cat_usuarios_roles').delete().eq('rol', 'SOLICITANTE');
  await supabase.from('cat_empleados').delete().neq('id_empleado', '00000000-0000-0000-0000-000000000000');

  // 2. Mapear datos
  const empRecords = [];
  const userRolesMap = new Map(); // Para deduplicar correos compartidos en cat_usuarios_roles

  for (const row of rows) {
    const numEmp = String(row['NÚMERO DE EMPLEADO'] || row['NUMERO DE EMPLEADO'] || '').trim();
    const nombre = String(row['NOMBRE COMPLETO'] || '').trim();
    const area = String(row['ÁREA'] || row['AREA'] || 'PF').trim().toUpperCase();
    const correo = String(row['CORREO'] || '').trim().toLowerCase();

    if (!nombre || !correo) continue;

    empRecords.push({
      cve_empleado: numEmp || `EMP-${Math.floor(1000 + Math.random()*9000)}`,
      nombre_empleado: nombre,
      departamento_codigo: area,
      correo: correo,
      puesto: 'Solicitante',
      origen: 'Excel Ingestion',
      activo: true
    });

    if (!userRolesMap.has(correo)) {
      userRolesMap.set(correo, {
        nombre_completo: nombre,
        correo: correo,
        rol: 'SOLICITANTE',
        cve_empleado: numEmp,
        departamento: area,
        puede_crear_solicitud: true,
        puede_validar_cierre: true,
        activo: true
      });
    }
  }

  const userRoleRecords = Array.from(userRolesMap.values());

  console.log(`💾 Insertando ${empRecords.length} empleados en cat_empleados...`);
  const { error: empErr } = await supabase.from('cat_empleados').insert(empRecords);
  if (empErr) console.error('❌ Error en cat_empleados:', empErr);
  else console.log('✅ Registros en cat_empleados insertados exitosamente.');

  console.log(`💾 Insertando ${userRoleRecords.length} usuarios únicos en cat_usuarios_roles...`);
  const { error: userErr } = await supabase.from('cat_usuarios_roles').insert(userRoleRecords);
  if (userErr) console.error('❌ Error en cat_usuarios_roles:', userErr);
  else console.log('✅ Registros en cat_usuarios_roles insertados exitosamente.');

  // 3. Registrar o actualizar cuentas en Supabase Auth
  console.log('🔑 Creando/Actualizando cuentas Auth en Supabase para Solicitantes...');
  let authSuccessCount = 0;

  // Obtener lista completa de usuarios existentes en Auth
  const { data: listData } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const authUsersList = (listData && listData.users) ? listData.users : [];
  const authUserMap = new Map(authUsersList.map(u => [u.email.toLowerCase(), u]));

  for (const u of userRoleRecords) {
    try {
      const existingUser = authUserMap.get(u.correo.toLowerCase());
      if (existingUser) {
        await supabase.auth.admin.updateUserById(existingUser.id, {
          password: 'solicitante123',
          user_metadata: {
            nombre_completo: u.nombre_completo,
            rol: 'SOLICITANTE',
            area: u.departamento,
            cve_empleado: u.cve_empleado
          }
        });
        authSuccessCount++;
      } else {
        const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
          email: u.correo,
          password: 'solicitante123',
          email_confirm: true,
          user_metadata: {
            nombre_completo: u.nombre_completo,
            rol: 'SOLICITANTE',
            area: u.departamento,
            cve_empleado: u.cve_empleado
          }
        });
        if (!authErr) authSuccessCount++;
      }
    } catch (e) {
      console.warn(`⚠️ Excepción Auth para ${u.correo}:`, e.message);
    }
  }

  console.log(`🎉 Ingesta finalizada con éxito. ${empRecords.length} empleados en catálogo y ${authSuccessCount} cuentas Auth listas (Contraseña predeterminada: solicitante123).`);
}

run();
