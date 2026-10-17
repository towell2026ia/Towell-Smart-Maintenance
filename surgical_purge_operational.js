// surgical_purge_operational.js
// Purga quirúrgica estricta de OTs, Solicitudes, Bitácoras y registros operacionales derivados.
// ¡NUNCA toca usuarios, máquinas, refacciones ni catálogos maestros!

const https = require('https');

const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxZnBzYXZrZWZocnhmYnRxemVjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjE0MzU5NywiZXhwIjoyMDk3NzE5NTk3fQ.o7GCLoa5YoDFWOxfvPayokuJhVYQvd2s5YtEq8DAs2U';
const SUPABASE_URL = 'https://xqfpsavkefhrxfbtqzec.supabase.co';

async function req(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : '';
    const url = new URL(SUPABASE_URL + path);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': 'Bearer ' + SERVICE_KEY,
        'Prefer': 'count=exact'
      }
    };
    if (data) {
      options.headers['Content-Type'] = 'application/json';
      options.headers['Content-Length'] = Buffer.byteLength(data);
    }
    const r = https.request(options, (res) => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: b }));
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

const purgeTables = [
  'solicitudes_mantenimiento',
  'evidencias_subtareas',
  'refacciones_usadas_subtarea',
  'costos_subtarea',
  'bitacora_subtareas',
  'asignaciones_subtareas',
  'subtareas_orden_trabajo',
  'evidencias_orden',
  'cierres_orden_trabajo',
  'ot_validaciones_cierre',
  'costos_orden_trabajo',
  'bitacora_orden_trabajo',
  'asignaciones_mantenimiento',
  'respuestas_checklist_orden',
  'respuestas_checklist_autonomo',
  'respuestas_checklist_predictivo',
  'levantamientos_mantenimiento',
  'paros_maquina',
  'alertas_sistema',
  'notificaciones_internas',
  'recomendaciones_ia',
  'analisis_repetibilidad_fallas',
  'validaciones_historial',
  'bitacora_mantenimiento',
  'bitacora_ejecuciones_agente',
  'aprobaciones_agente',
  'eventos_agente',
  'ordenes_trabajo',
  'stg_telegram_ordenes_telares'
];

const masterPreserveList = [
  'cat_usuarios_roles',
  'cat_maquinas',
  'cat_refacciones',
  'fallas_por_maquina',
  'segundas_por_rollo',
  'cat_agentes',
  'cat_eventos_agente',
  'cat_tarifas_modelo'
];

async function run() {
  console.log('=================================================================');
  console.log('🚀 INICIANDO PURGA QUIRÚRGICA DE REGISTROS OPERACIONALES (TSM-AI)');
  console.log('=================================================================\n');

  for (const table of purgeTables) {
    const sample = await req('/rest/v1/' + table + '?select=*&limit=1', 'GET');
    if (sample.status === 404) continue;
    const crBefore = sample.headers['content-range'] || '0';
    let rows = [];
    try { rows = JSON.parse(sample.body); } catch (e) {}
    if (Array.isArray(rows) && rows.length > 0) {
      const pk = Object.keys(rows[0])[0];
      const delRes = await req('/rest/v1/' + table + '?' + pk + '=not.is.null', 'DELETE');
      const after = await req('/rest/v1/' + table + '?select=*&limit=1', 'GET');
      const crAfter = after.headers['content-range'] || '0';
      console.log(`🧹 ${table.padEnd(34)} | Antes: ${crBefore.padEnd(10)} | Status ${delRes.status} | Ahora: ${crAfter}`);
    } else {
      console.log(`✅ ${table.padEnd(34)} | 0 filas`);
    }
  }

  console.log('\n--- VERIFICACIÓN DE CATÁLOGOS MAESTROS INTACTOS ---');
  for (const m of masterPreserveList) {
    const res = await req('/rest/v1/' + m + '?select=count', 'HEAD');
    console.log(`🔒 ${m.padEnd(28)} -> Filas: ${res.headers['content-range'] || 'OK'}`);
  }
}

run().catch(console.error);
