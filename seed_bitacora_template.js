const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://xqfpsavkefhrxfbtqzec.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxZnBzYXZrZWZocnhmYnRxemVjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjE0MzU5NywiZXhwIjoyMDk3NzE5NTk3fQ.o7GCLoa5YoDFWOxfvPayokuJhVYQvd2s5YtEq8DAs2U';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function main() {
  console.log('🤖 Seeding F-BITACORA template in Supabase...');

  const formId = 'F-BITACORA';
  const formName = 'Bitácora de Mantenimiento';
  const area = 'Planta';

  // 1. Upsert service
  console.log('   Upserting service...');
  const { error: srvErr } = await supabase.from('cat_servicios_mantenimiento').upsert([{
    codigo_servicio: formId,
    nombre_servicio: formName,
    tipo_servicio: 'Autónomo',
    activo: true
  }], { onConflict: 'codigo_servicio' });

  if (srvErr) {
    console.error('❌ Error upserting service:', srvErr);
    return;
  }

  // 2. Delete existing questions
  console.log('   Deleting old questions...');
  await supabase.from('checklists_mantenimiento').delete().eq('codigo_servicio', formId);

  // 3. Insert questions
  console.log('   Inserting questions...');
  const questions = [
    { codigo_servicio: formId, codigo_pregunta: 'Q-1', pregunta: 'Orden de Trabajo (si aplica)', tipo_respuesta: 'texto', obligatorio: false, orden: 1, activo: true },
    { codigo_servicio: formId, codigo_pregunta: 'Q-2', pregunta: 'Área', tipo_respuesta: 'texto', obligatorio: true, orden: 2, activo: true },
    { codigo_servicio: formId, codigo_pregunta: 'Q-3', pregunta: 'Máquina (si aplica)', tipo_respuesta: 'texto', obligatorio: false, orden: 3, activo: true },
    { codigo_servicio: formId, codigo_pregunta: 'Q-4', pregunta: 'Tiempo Inicio', tipo_respuesta: 'texto', obligatorio: true, orden: 4, activo: true },
    { codigo_servicio: formId, codigo_pregunta: 'Q-5', pregunta: 'Tiempo Fin', tipo_respuesta: 'texto', obligatorio: true, orden: 5, activo: true },
    { codigo_servicio: formId, codigo_pregunta: 'Q-6', pregunta: 'Descripción de la Actividad', tipo_respuesta: 'texto', obligatorio: true, orden: 6, activo: true },
    { codigo_servicio: formId, codigo_pregunta: 'Q-7', pregunta: 'Refacciones Usadas (si aplica)', tipo_respuesta: 'texto', obligatorio: false, orden: 7, activo: true },
    { codigo_servicio: formId, codigo_pregunta: 'Q-8', pregunta: 'Observaciones', tipo_respuesta: 'texto', obligatorio: false, orden: 8, activo: true }
  ];

  const { error: qErr } = await supabase.from('checklists_mantenimiento').insert(questions);

  if (qErr) {
    console.error('❌ Error inserting questions:', qErr);
    return;
  }

  console.log('🎉 F-BITACORA template seeded successfully!');
}

main();
