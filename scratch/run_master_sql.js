const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxZnBzYXZrZWZocnhmYnRxemVjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjE0MzU5NywiZXhwIjoyMDk3NzE5NTk3fQ.o7GCLoa5YoDFWOxfvPayokuJhVYQvd2s5YtEq8DAs2U';
const SUPABASE_URL = 'https://xqfpsavkefhrxfbtqzec.supabase.co';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function main() {
  console.log('🚀 Running master catalogs update script...');

  // 1. Catálogo Departamentos
  console.log('1. Upserting cat_departamentos...');
  const deptos = [
    { codigo_departamento: 'PF', nombre_departamento: 'PF Producción (Tejido / Telares)', descripcion: 'Área principal de tejeduría y producción de telares', activo: true },
    { codigo_departamento: 'CF', nombre_departamento: 'CF Confección (Costura)', descripcion: 'Área de confección, costura y acabado de prendas/toallas', activo: true },
    { codigo_departamento: 'TF', nombre_departamento: 'TF Tintorería (Acabados)', descripcion: 'Área de teñido, ramas, secadoras y procesos químicos', activo: true },
    { codigo_departamento: 'AF', nombre_departamento: 'AF Servicios Auxiliares (Planta General)', descripcion: 'Calderas, compresores, subestaciones eléctricas, chiller y planta general', activo: true }
  ];
  const { error: dErr } = await supabase.from('cat_departamentos').upsert(deptos, { onConflict: 'codigo_departamento' });
  if (dErr) console.error('  ❌ Error cat_departamentos:', dErr.message);
  else console.log('  ✅ cat_departamentos listo.');

  // 2. Catálogo Turnos
  console.log('2. Upserting cat_turnos...');
  const turnos = [
    { id_turno: 1, nombre_turno: 'Turno 1 (Matutino)', descripcion: 'Horario matutino de producción', hora_inicio: '06:00:00', hora_fin: '14:00:00', activo: true },
    { id_turno: 2, nombre_turno: 'Turno 2 (Vespertino)', descripcion: 'Horario vespertino de producción', hora_inicio: '14:00:00', hora_fin: '22:00:00', activo: true },
    { id_turno: 3, nombre_turno: 'Turno 3 (Nocturno)', descripcion: 'Horario nocturno de producción', hora_inicio: '22:00:00', hora_fin: '06:00:00', activo: true },
    { id_turno: 4, nombre_turno: 'Mixto / Administrativo', descripcion: 'Horario administrativo / soporte general', hora_inicio: '08:00:00', hora_fin: '17:00:00', activo: true }
  ];
  const { error: tErr } = await supabase.from('cat_turnos').upsert(turnos, { onConflict: 'id_turno' });
  if (tErr) console.error('  ❌ Error cat_turnos:', tErr.message);
  else console.log('  ✅ cat_turnos listo.');

  // 3. Ajustar permisos en cat_usuarios_roles
  console.log('3. Updating permissions in cat_usuarios_roles...');
  
  // MANTENIMIENTO: puede_crear_solicitud = false
  const { error: mErr } = await supabase.from('cat_usuarios_roles')
    .update({ puede_crear_solicitud: false, puede_atender_orden: true, puede_cerrar_orden: true, puede_ver_ordenes_asignadas: true })
    .eq('rol', 'MANTENIMIENTO');
  if (mErr) console.error('  ❌ Error MANTENIMIENTO permissions:', mErr.message);

  // SOLICITANTE: puede_crear_solicitud = true
  const { error: sErr } = await supabase.from('cat_usuarios_roles')
    .update({ puede_crear_solicitud: true, puede_validar_cierre: true, puede_ver_todas_ordenes: false, puede_atender_orden: false, puede_cerrar_orden: false })
    .in('rol', ['SOLICITANTE', 'SOLICITANTE_PUBLICO']);
  if (sErr) console.error('  ❌ Error SOLICITANTE permissions:', sErr.message);

  // SUPERVISOR
  const { error: supErr } = await supabase.from('cat_usuarios_roles')
    .update({ puede_crear_solicitud: true, puede_ver_todas_ordenes: true, puede_validar_cierre: true, puede_ver_dashboards: true, puede_atender_orden: false, puede_cerrar_orden: false })
    .eq('rol', 'SUPERVISOR');
  if (supErr) console.error('  ❌ Error SUPERVISOR permissions:', supErr.message);

  // SUPER_ADMINISTRADOR
  const { error: saErr } = await supabase.from('cat_usuarios_roles')
    .update({
      puede_crear_solicitud: true, puede_ver_ordenes_asignadas: true, puede_ver_todas_ordenes: true,
      puede_atender_orden: true, puede_cerrar_orden: true, puede_validar_cierre: true,
      puede_editar_catalogos: true, puede_ver_dashboards: true, puede_configurar_sistema: true, recibe_alertas: true
    })
    .eq('rol', 'SUPER_ADMINISTRADOR');
  if (saErr) console.error('  ❌ Error SUPER_ADMINISTRADOR permissions:', saErr.message);

  console.log('  ✅ Permisos de usuarios por rol actualizados.');

  // 4. Clasificación de Máquinas
  console.log('4. Categorizing cat_maquinas by department and type...');
  const { data: machines, error: fetchErr } = await supabase.from('cat_maquinas').select('*');
  if (fetchErr) {
    console.error('  ❌ Error fetching machines:', fetchErr.message);
  } else if (machines) {
    const updates = [];
    machines.forEach(m => {
      let dept = m.departamento_codigo;
      let tipo = m.tipo_equipo;
      const eq = (m.equipo_towell || '').toUpperCase();
      const clv = (m.clave || '').toUpperCase();

      if (!dept) {
        if (eq.includes('TEL') || eq.includes('TEJI') || clv.includes('TEL')) {
          dept = 'PF';
          tipo = 'Telar';
        } else if (eq.includes('COST') || eq.includes('CONF') || clv.includes('COST')) {
          dept = 'CF';
          tipo = 'Confección';
        } else if (eq.includes('TINTO') || eq.includes('RAMA') || eq.includes('BARCA') || clv.includes('TINTO')) {
          dept = 'TF';
          tipo = 'Tintorería';
        } else {
          dept = 'AF';
          tipo = 'Servicios Auxiliares';
        }
        updates.push({ id_maquina: m.id_maquina, equipo_towell: m.equipo_towell, departamento_codigo: dept, tipo_equipo: tipo, activo: true });
      }
    });

    if (updates.length > 0) {
      console.log(`  Updating ${updates.length} machines with department and equipment type...`);
      for (let u of updates) {
        await supabase.from('cat_maquinas').update({ departamento_codigo: u.departamento_codigo, tipo_equipo: u.tipo_equipo, activo: true }).eq('id_maquina', u.id_maquina);
      }
    }
    console.log('  ✅ cat_maquinas estructurado.');
  }

  // 5. Matriz de Criticidad
  console.log('5. Populating cat_criticidad_maquina...');
  const { data: allMachs } = await supabase.from('cat_maquinas').select('equipo_towell, tipo_equipo');
  if (allMachs) {
    const critRows = allMachs.map(m => {
      const isCrit = (m.tipo_equipo === 'Servicios Auxiliares' || m.tipo_equipo === 'Telar' || (m.equipo_towell || '').includes('CALDERA') || (m.equipo_towell || '').includes('COMPRESOR'));
      return {
        maquina_id: m.equipo_towell,
        nivel_criticidad: isCrit ? 'A' : 'B',
        descripcion_criticidad: isCrit ? 'Equipo de alta criticidad (Paro Total de Planta/Línea)' : 'Equipo de criticidad media (Paro Parcial)',
        impacto_produccion: isCrit ? 'Alto' : 'Medio',
        impacto_calidad: isCrit ? 'Alto' : 'Medio',
        impacto_seguridad: isCrit ? 'Alto' : 'Bajo',
        activo: true
      };
    });
    const { error: cErr } = await supabase.from('cat_criticidad_maquina').upsert(critRows, { onConflict: 'maquina_id' });
    if (cErr) console.warn('  ⚠️ Note on cat_criticidad_maquina:', cErr.message);
    else console.log('  ✅ cat_criticidad_maquina listo.');
  }

  // 6. Sincronizar cat_tecnicos desde cat_usuarios_roles
  console.log('6. Syncing cat_tecnicos from cat_usuarios_roles...');
  const { data: techUsers } = await supabase.from('cat_usuarios_roles').select('*').eq('rol', 'MANTENIMIENTO');
  if (techUsers && techUsers.length > 0) {
    const techRows = techUsers.map(t => ({
      cve_tecnico: t.cve_tecnico || t.cve_empleado || t.id_usuario,
      nombre_tecnico: t.nombre_completo,
      departamento_codigo: t.departamento_codigo || 'AF',
      especialidad: t.observaciones || t.especialidad || 'General',
      correo: t.correo,
      telefono: t.telefono,
      activo: t.activo !== false
    }));
    const { error: tSyncErr } = await supabase.from('cat_tecnicos').upsert(techRows, { onConflict: 'cve_tecnico' });
    if (tSyncErr) console.error('  ❌ Error syncing cat_tecnicos:', tSyncErr.message);
    else console.log(`  ✅ Synced ${techRows.length} technicians into cat_tecnicos.`);
  }

  console.log('\n🎉 Master catalogs migration complete!');
}

main().catch(console.error);
