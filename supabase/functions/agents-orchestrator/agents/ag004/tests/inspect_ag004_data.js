// supabase/functions/agents-orchestrator/agents/ag004/tests/inspect_ag004_data.js
// Data & Schema Inspector for PRD-AG-004.1

const fs = require('fs');
const path = require('path');

// Safe .env loader
function loadEnv() {
  const envPaths = [
    path.join(process.cwd(), '.env'),
    path.resolve(__dirname, '../../../../../../.env'),
    path.join(process.env.USERPROFILE || process.env.HOME || '', '.env')
  ];

  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const idx = trimmed.indexOf('=');
          const k = trimmed.substring(0, idx).trim();
          const v = trimmed.substring(idx + 1).trim().replace(/^["']|["']$/g, '');
          if (!process.env[k]) {
            process.env[k] = v;
          }
        }
      }
    }
  }
}

loadEnv();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

async function inspectData() {
  console.log('Inspecting Supabase schema and data for AG-004...');
  if (!supabaseUrl || !supabaseKey) {
    console.log('No direct Supabase credentials, analyzing local schema files and catalogs.');
    return;
  }

  try {
    const headers = {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`
    };

    // 1. Inspect cat_maquinas
    const mRes = await fetch(`${supabaseUrl}/rest/v1/cat_maquinas?select=equipo_towell,nombre,area,departamento_codigo,tipo_maquina,activo&limit=200`, { headers });
    if (mRes.ok) {
      const machines = await mRes.json();
      console.log(`\nFound ${machines.length} machines in cat_maquinas:`);
      const deptCounts = {};
      const activeCounts = { active: 0, inactive: 0 };
      for (const m of machines) {
        const d = m.departamento_codigo || m.area || 'UNKNOWN';
        deptCounts[d] = (deptCounts[d] || 0) + 1;
        if (m.activo !== false && m.activo !== 0 && String(m.activo).toLowerCase() !== 'false') activeCounts.active++;
        else activeCounts.inactive++;
      }
      console.log('Departments:', deptCounts);
      console.log('Active status:', activeCounts);
    }

    // 2. Inspect checklists_mantenimiento
    const cRes = await fetch(`${supabaseUrl}/rest/v1/checklists_mantenimiento?select=*&limit=50`, { headers });
    if (cRes.ok) {
      const checklists = await cRes.json();
      console.log(`\nFound ${checklists.length} checklist definitions:`);
      for (const c of checklists) {
        console.log(` - ID: ${c.id_checklist || c.codigo}, Familia: ${c.familia_formulario || c.tipo}, Titulo: ${c.titulo || c.nombre}`);
      }
    }
  } catch (err) {
    console.error('Inspection error:', err.message);
  }
}

inspectData();
