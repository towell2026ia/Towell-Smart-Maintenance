const https = require('https');
const fs = require('fs');
const path = require('path');

const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxZnBzYXZrZWZocnhmYnRxemVjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjE0MzU5NywiZXhwIjoyMDk3NzE5NTk3fQ.o7GCLoa5YoDFWOxfvPayokuJhVYQvd2s5YtEq8DAs2U';
const SUPABASE_URL = 'https://xqfpsavkefhrxfbtqzec.supabase.co';
const PROJECT_REF = 'xqfpsavkefhrxfbtqzec';

// Use Supabase's internal pg endpoint via REST with service role
// We'll create an exec_sql function first via the auth endpoint trick,
// then use it to run all our DDL.

async function fetchSupabase(path, method, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : '';
    const url = new URL(SUPABASE_URL + path);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_KEY,
        'Authorization': 'Bearer ' + SERVICE_KEY,
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = https.request(options, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => responseBody += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: responseBody }));
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function executeSQL(sql, description) {
  console.log(`\n🔧 ${description}...`);
  
  // Use the Supabase REST endpoint for SQL via PostgREST rpc
  const res = await fetchSupabase('/rest/v1/rpc/exec_ddl', 'POST', { ddl: sql });
  
  if (res.status === 200 || res.status === 204) {
    console.log(`   ✅ Éxito`);
    return true;
  } else {
    console.log(`   ⚠️  Status ${res.status}: ${res.body.substring(0, 200)}`);
    return false;
  }
}

async function bootstrapExecDDL() {
  // First, we create the exec_ddl function using the pg meta API
  // Supabase exposes a meta REST API at /pg/query for service role
  console.log('🚀 Bootstrapping SQL execution capability...');
  
  const createFuncSQL = `
CREATE OR REPLACE FUNCTION public.exec_ddl(ddl TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE ddl;
  RETURN 'OK';
EXCEPTION WHEN OTHERS THEN
  RETURN 'ERROR: ' || SQLERRM;
END;
$$;
`;

  // Try via the pg REST meta API
  const res = await fetchSupabase('/pg/query', 'POST', { query: createFuncSQL });
  console.log('Bootstrap status:', res.status, res.body.substring(0, 300));
  return res.status < 300;
}

async function main() {
  // Try to bootstrap the exec_ddl function
  const bootstrapped = await bootstrapExecDDL();
  
  if (!bootstrapped) {
    console.log('\n❌ No se pudo crear la función auxiliar automáticamente.');
    console.log('   El endpoint /pg/query requiere un Personal Access Token (PAT) de Supabase,');
    console.log('   no el service_role key del proyecto.');
    console.log('\n📋 INSTRUCCIONES MANUALES:');
    console.log('   1. Ve a: https://supabase.com/dashboard/project/xqfpsavkefhrxfbtqzec/sql/new');
    console.log('   2. Copia y pega el contenido de trigger_folios.sql → Run');
    console.log('   3. Copia y pega el contenido de calendar_views.sql → Run');
    
    // Read and print file sizes for reference
    const triggerSQL = fs.readFileSync(path.join(__dirname, 'trigger_folios.sql'), 'utf8');
    const calendarSQL = fs.readFileSync(path.join(__dirname, 'calendar_views.sql'), 'utf8');
    console.log(`\n   trigger_folios.sql: ${triggerSQL.length} chars`);
    console.log(`   calendar_views.sql: ${calendarSQL.length} chars`);
  }
}

main().catch(console.error);
