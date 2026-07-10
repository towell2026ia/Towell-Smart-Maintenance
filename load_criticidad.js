const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://xqfpsavkefhrxfbtqzec.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxZnBzYXZrZWZocnhmYnRxemVjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjE0MzU5NywiZXhwIjoyMDk3NzE5NTk3fQ.o7GCLoa5YoDFWOxfvPayokuJhVYQvd2s5YtEq8DAs2U';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function main() {
  console.log('🤖 Starting machine criticality import...');

  // 1. Fetch all machines from cat_maquinas
  const { data: dbMachines, error: dbErr } = await supabase
    .from('cat_maquinas')
    .select('equipo_towell, clave');
  
  if (dbErr) {
    console.error('❌ Error fetching machines from database:', dbErr);
    return;
  }
  
  console.log(`✅ Loaded ${dbMachines.length} machines from cat_maquinas.`);
  const dbMachineSet = new Set(dbMachines.map(m => m.equipo_towell));

  // 2. Read the XLSB file
  const filePath = path.join(__dirname, 'importar_excel', 'Criticidad_maquina.xlsb');
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found at: ${filePath}`);
    return;
  }

  const wb = XLSX.readFile(filePath);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const excelRows = XLSX.utils.sheet_to_json(sheet);
  console.log(`✅ Loaded ${excelRows.length} rows from Excel sheet.`);

  // 3. Process and map the Excel rows
  const mappedCriticality = new Map();

  excelRows.forEach(row => {
    const rawClave = row.CLAVE;
    if (!rawClave) return;

    const prioridad = parseFloat(row.PRIORIDAD);
    const maqName = row['CANTIDAD MAQUINARIA'] || '';
    const obs = row.OBSERVACIONES || '';

    // Map numeric priority to criticality levels
    let nivel = 'Media';
    if (prioridad === 1) nivel = 'Muy Alta';
    else if (prioridad === 2) nivel = 'Alta';
    else if (prioridad === 3) nivel = 'Media-Alta';
    else if (prioridad > 3 && prioridad < 3.1) nivel = 'Media';
    else if (prioridad >= 3.1 && prioridad < 3.11) nivel = 'Baja';
    else if (prioridad >= 3.11) nivel = 'Muy Baja';

    // Parse comma-separated keys and sanitize
    const keys = rawClave
      .split(',')
      .map(k => k.replace(/[^a-zA-Z0-9-]/g, '').trim())
      .filter(k => k);

    keys.forEach(k => {
      if (dbMachineSet.has(k)) {
        mappedCriticality.set(k, {
          maquina_id: k,
          nivel_criticidad: nivel,
          descripcion_criticidad: `Prioridad ${prioridad} - ${maqName}.${obs ? ' Obs: ' + obs : ''}`,
          activo: true
        });
      } else {
        // Log mismatch for tracking
        console.log(`⚠️ Excel machine key "${k}" not found in database catalog.`);
      }
    });
  });

  console.log(`✅ Mapped ${mappedCriticality.size} machines from Excel matching cat_maquinas.`);

  // 4. Fill in missing machines as "Muy Baja"
  let missingCount = 0;
  dbMachines.forEach(m => {
    const key = m.equipo_towell;
    if (!mappedCriticality.has(key)) {
      mappedCriticality.set(key, {
        maquina_id: key,
        nivel_criticidad: 'Muy Baja',
        descripcion_criticidad: 'Establecido por defecto (no listado en la matriz)',
        activo: true
      });
      missingCount++;
    }
  });

  console.log(`✅ Marked ${missingCount} missing machines as "Muy Baja".`);
  console.log(`📊 Total records to insert/update: ${mappedCriticality.size}`);

  const toInsert = Array.from(mappedCriticality.values());

  // 5. Clean table first to ensure fresh seed
  console.log('🧹 Cleaning existing records in cat_criticidad_maquina...');
  const { error: delErr } = await supabase
    .from('cat_criticidad_maquina')
    .delete()
    .neq('nivel_criticidad', 'force_non_empty_delete_all'); // Deletes all

  if (delErr) {
    console.error('❌ Error cleaning table:', delErr);
    return;
  }
  console.log('✅ Table cleared.');

  // 6. Bulk Insert
  console.log('📤 Bulk inserting records into cat_criticidad_maquina...');
  const chunkSize = 50;
  for (let i = 0; i < toInsert.length; i += chunkSize) {
    const chunk = toInsert.slice(i, i + chunkSize);
    const { error: insErr } = await supabase
      .from('cat_criticidad_maquina')
      .insert(chunk);
    
    if (insErr) {
      console.error(`❌ Error inserting chunk starting at index ${i}:`, insErr);
      return;
    }
    console.log(`   - Inserted chunk ${Math.floor(i / chunkSize) + 1} (${chunk.length} rows)`);
  }

  console.log('🎉 Machine criticality matrix import completed successfully!');
}

main();
