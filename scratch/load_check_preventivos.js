const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://xqfpsavkefhrxfbtqzec.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxZnBzYXZrZWZocnhmYnRxemVjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjE0MzU5NywiZXhwIjoyMDk3NzE5NTk3fQ.o7GCLoa5YoDFWOxfvPayokuJhVYQvd2s5YtEq8DAs2U';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function run() {
  console.log('🚀 Cargando Servicio y Checklist Preventivo MPE_MECA_ITEMA...');

  // 1. Inserción/Upsert en cat_servicios_mantenimiento
  const servicio = {
    codigo_servicio: 'MPE_MECA_ITEMA',
    nombre_servicio: 'MANTTO PREV MEC-ITEMA',
    descripcion: 'Mantenimiento Preventivo Mecánico para Telar ITEMA',
    tipo_servicio: 'Preventivo',
    duracion_estimada_min: 120,
    activo: true
  };

  const { error: sErr } = await supabase
    .from('cat_servicios_mantenimiento')
    .upsert([servicio], { onConflict: 'codigo_servicio' });

  if (sErr) console.warn('⚠️ Nota cat_servicios_mantenimiento:', sErr.message);
  else console.log('✅ Servicio MPE_MECA_ITEMA registrado en catálogo.');

  // 2. Definición estructurada en jerarquía del Checklist
  const items = [
    { num: '1',  text: '1) Limpieza general del telar.', level: 1 },
    { num: '2',  text: '2) Revisión del sistema de pinzas.', level: 1 },
    { num: '2.A', text: '   A) Cabeza de pinza derecha.', level: 2 },
    { num: '2.A.1', text: '      A.1) Soporte.', level: 3 },
    { num: '2.B', text: '   B) Cabeza de pinza izquierda.', level: 2 },
    { num: '2.B.1', text: '      B.1) Soporte.', level: 3 },
    { num: '2.C', text: '   C) Cinta.', level: 2 },
    { num: '2.D', text: '   D) Riel de apoyo.', level: 2 },
    { num: '2.E', text: '   E) Riel del abridor.', level: 2 },
    { num: '2.F', text: '   F) Rueda izquierda.', level: 2 },
    { num: '2.I', text: '   I) Rueda derecha.', level: 2 },
    { num: '3',  text: '3) Revisión de presentadora de selectores.', level: 1 },
    { num: '4',  text: '4) Revise guías de gasa de vuelta.', level: 1 },
    { num: '5',  text: '5) Revisión de sistema de frenado.', level: 1 },
    { num: '5.A', text: '   A) Embrague.', level: 2 },
    { num: '5.B', text: '   B) Coples.', level: 2 },
    { num: '5.C', text: '   C) Banda de embrague.', level: 2 },
    { num: '6',  text: '6) Nivelar telar.', level: 1 },
    { num: '7',  text: '7) Cambio general de aceites.', level: 1 },
    { num: '8',  text: '8) Revisión de tirantes.', level: 1 },
    { num: '8.A', text: '   A) Guías de cuadros.', level: 2 },
    { num: '9',  text: '9) Revisión del mecanismo de la maquinilla.', level: 1 },
    { num: '9.A', text: '   A) Tornillería.', level: 2 },
    { num: '10', text: '10) Revisión de inserción de trama.', level: 1 },
    { num: '11', text: '11) Revisión de tablas.', level: 1 }
  ];

  // Limpiar preguntas anteriores para este servicio para evitar duplicados en orden
  await supabase
    .from('checklists_mantenimiento')
    .delete()
    .eq('codigo_servicio', 'MPE_MECA_ITEMA');

  const questionsToInsert = items.map((item, index) => ({
    codigo_servicio: 'MPE_MECA_ITEMA',
    codigo_pregunta: `PREG_${item.num.replace(/\./g, '_')}`,
    pregunta: item.text,
    tipo_respuesta: 'si_no',
    obligatorio: true,
    orden: index + 1,
    activo: true,
    observaciones: `Nivel Jerárquico: ${item.level}`
  }));

  const { error: qErr } = await supabase
    .from('checklists_mantenimiento')
    .insert(questionsToInsert);

  if (qErr) console.error('❌ Error al insertar preguntas en checklists_mantenimiento:', qErr);
  else console.log(`✅ ${questionsToInsert.length} ítems del checklist insertados manteniendo su orden jerárquico estricto.`);

  // 3. Registrar refacciones asociadas al servicio/equipo ITEMA
  const parts = [
    { codigo_articulo: 'IT081', nombre_articulo: 'SOPORTE DOBLE PARA VIGAS 131220213', costo_unitario: 0.00 },
    { codigo_articulo: 'IT853', nombre_articulo: 'TIRANTE ELEVADOR 110504487', costo_unitario: 636.87 }
  ];

  for (const part of parts) {
    await supabase.from('cat_refacciones').upsert([{
      codigo_articulo: part.codigo_articulo,
      nombre_articulo: part.nombre_articulo,
      costo_unitario: part.costo_unitario,
      activo: true
    }], { onConflict: 'codigo_articulo' });
  }

  console.log('🎉 Carga e integración del Checklist MPE_MECA_ITEMA completada con éxito.');
}

run();
