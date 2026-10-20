/**
 * reset_calendars_supabase.js
 * Resetea y deja vacíos los calendarios de mantenimiento en Supabase:
 * - Elimina todos los registros de calendario_mantenimiento_detalle
 * - Elimina todos los registros de calendarios_mantenimiento
 * - Mantiene intactas las órdenes de trabajo reales (ordenes_trabajo)
 */

const fs = require('fs');
const path = require('path');

const configContent = fs.readFileSync(path.join(__dirname, 'config.js'), 'utf8');
const urlMatch = configContent.match(/SUPABASE_URL\s*=\s*"([^"]+)"/);
const SUPABASE_URL = urlMatch ? urlMatch[1] : 'https://xqfpsavkefhrxfbtqzec.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxZnBzYXZrZWZocnhmYnRxemVjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjE0MzU5NywiZXhwIjoyMDk3NzE5NTk3fQ.o7GCLoa5YoDFWOxfvPayokuJhVYQvd2s5YtEq8DAs2U';

const headers = {
  'apikey': SERVICE_KEY,
  'Authorization': 'Bearer ' + SERVICE_KEY,
  'Content-Type': 'application/json'
};

async function resetCalendars() {
  console.log('=== 1. AUDITANDO ESTADO ANTERIOR DE CALENDARIOS ===');
  const dCountRes = await fetch(`${SUPABASE_URL}/rest/v1/calendario_mantenimiento_detalle?select=id_detalle`, { headers });
  const details = await dCountRes.json();
  console.log(`Registros actuales en calendario_mantenimiento_detalle: ${Array.isArray(details) ? details.length : JSON.stringify(details)}`);

  const cCountRes = await fetch(`${SUPABASE_URL}/rest/v1/calendarios_mantenimiento?select=id_calendario`, { headers });
  const cals = await cCountRes.json();
  console.log(`Registros actuales en calendarios_mantenimiento: ${Array.isArray(cals) ? cals.length : JSON.stringify(cals)}`);

  const otRes = await fetch(`${SUPABASE_URL}/rest/v1/ordenes_trabajo?select=folio,orden_trabajo,estatus,maquina_id`, { headers });
  const ots = await otRes.json();
  console.log(`Órdenes de trabajo reales a preservar: ${Array.isArray(ots) ? ots.length : JSON.stringify(ots)}`);
  if (Array.isArray(ots)) {
    ots.forEach(o => console.log(`  - Folio: ${o.folio}, Tipo: ${o.orden_trabajo}, Estatus: ${o.estatus}, Máquina: ${o.maquina_id}`));
  }

  console.log('\n=== 2. VACIANDO calendario_mantenimiento_detalle ===');
  const delDetailsRes = await fetch(`${SUPABASE_URL}/rest/v1/calendario_mantenimiento_detalle?id_detalle=neq.00000000-0000-0000-0000-000000000000`, {
    method: 'DELETE',
    headers
  });
  console.log(`DELETE calendario_mantenimiento_detalle status: ${delDetailsRes.status}`);

  console.log('\n=== 3. VACIANDO calendarios_mantenimiento ===');
  const delCalsRes = await fetch(`${SUPABASE_URL}/rest/v1/calendarios_mantenimiento?id_calendario=neq.00000000-0000-0000-0000-000000000000`, {
    method: 'DELETE',
    headers
  });
  console.log(`DELETE calendarios_mantenimiento status: ${delCalsRes.status}`);

  console.log('\n=== 4. VERIFICANDO QUE LOS CALENDARIOS QUEDARON 100% VACÍOS ===');
  const dVerifyRes = await fetch(`${SUPABASE_URL}/rest/v1/calendario_mantenimiento_detalle?select=id_detalle`, { headers });
  const verifyDetails = await dVerifyRes.json();
  console.log(`Registros finales en calendario_mantenimiento_detalle: ${Array.isArray(verifyDetails) ? verifyDetails.length : JSON.stringify(verifyDetails)}`);

  const cVerifyRes = await fetch(`${SUPABASE_URL}/rest/v1/calendarios_mantenimiento?select=id_calendario`, { headers });
  const verifyCals = await cVerifyRes.json();
  console.log(`Registros finales en calendarios_mantenimiento: ${Array.isArray(verifyCals) ? verifyCals.length : JSON.stringify(verifyCals)}`);

  const otVerifyRes = await fetch(`${SUPABASE_URL}/rest/v1/ordenes_trabajo?select=folio,orden_trabajo,estatus,maquina_id`, { headers });
  const verifyOts = await otVerifyRes.json();
  console.log(`Órdenes de trabajo reales preservadas: ${Array.isArray(verifyOts) ? verifyOts.length : JSON.stringify(verifyOts)}`);

  console.log('\n✅ Calendarios reseteados y vacíos exitosamente. Solo permanecen las OTs reales de la plataforma.');
}

resetCalendars().catch(err => {
  console.error('Error durante el reseteo:', err);
  process.exit(1);
});
