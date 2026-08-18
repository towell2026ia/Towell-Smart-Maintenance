// supabase/functions/agents-orchestrator/agents/ag009/tests/promote_ag009_to_ready.js
// Administrative Promotion Script for AG-009 (§80-84 PRD)

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://xqfpsavkefhrxfbtqzec.supabase.co";
const JWT_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxZnBzYXZrZWZocnhmYnRxemVjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjE0MzU5NywiZXhwIjoyMDk3NzE5NTk3fQ.o7GCLoa5YoDFWOxfvPayokuJhVYQvd2s5YtEq8DAs2U';

async function promoteAG009() {
  const supabase = createClient(SUPABASE_URL, JWT_SERVICE_KEY);

  console.log('--- 1. Consultando estado actual de AG-009 en cat_agentes ---');
  const { data: current, error: errSelect } = await supabase
    .from('cat_agentes')
    .select('*')
    .eq('agent_id', 'AG-009');

  if (errSelect) {
    console.error('Error consultando cat_agentes:', errSelect.message);
    process.exit(1);
  }

  console.log('Registro actual de AG-009:', current);

  console.log('\n--- 2. Ejecutando promoción administrativa a READY (PRD-AG-009.4 §81, §82) ---');
  const { data: updated, error: errUpdate } = await supabase
    .from('cat_agentes')
    .update({
      activo: true,
      estado_implementacion: 'READY',
      updated_at: new Date().toISOString()
    })
    .eq('agent_id', 'AG-009')
    .select();

  if (errUpdate) {
    console.error('Error actualizando AG-009 en cat_agentes:', errUpdate.message);
    process.exit(1);
  }

  console.log('Resultado de la promoción:', updated);

  // Verificación de Exactly One Row (§83 PRD)
  if (updated && updated.length === 1) {
    console.log('\n✅ VERIFICACIÓN DE BD EXITOSA (§82, §83 PRD):');
    console.log('   - agent_id:                ', updated[0].agent_id);
    console.log('   - estado_implementacion:   ', updated[0].estado_implementacion);
    console.log('   - activo:                  ', updated[0].activo);
    console.log('   - exactly_one_agent_updated: true');
    console.log('   - estado de congelamiento:   AG009-1.0-FROZEN');
  } else {
    console.warn('⚠️ No se actualizó exactamente 1 fila. Filas afectadas:', updated?.length);
  }
}

promoteAG009();
