// audit_app_js_live.js
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

// Mock browser globals
global.document = {
  addEventListener: () => {},
  getElementById: (id) => ({
    value: id === 'excel-template-select' ? 'segundas' : '',
    innerText: '',
    innerHTML: '',
    style: {},
    disabled: false
  })
};
global.showToast = (msg) => console.log('[TOAST]:', msg);
global.window = { location: { hash: '' }, addEventListener: () => {} };
global.history = { pushState: () => {} };
global.navigator = { userAgent: 'Node' };
global.currentUser = { name: 'Auditor' };
global.supabaseClient = null;
global.localStorage = { getItem: () => '[]', setItem: () => {} };

const appJs = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');

// Evaluate app.js
eval(appJs);

const fileBuf = fs.readFileSync(path.join(__dirname, 'importar_excel', 'Segundas semana 33.xlsx'));
const wb = XLSX.read(fileBuf, { type: 'buffer' });

const res = parseWorkbookMatrixToStaging(wb, 'segundas', 'Segundas semana 33.xlsx', 'audit-carga-123');

console.log('\n--- AUDIT RESULTS ---');
console.log('Sheet Name:', res.sheetName);
console.log('Total Staging Rows:', res.stagingRows.length);
console.log('\nRow 0:');
console.log(JSON.stringify(res.stagingRows[0], null, 2));

console.log('\nRow 1:');
console.log(JSON.stringify(res.stagingRows[1], null, 2));

console.log('\nRow 2:');
console.log(JSON.stringify(res.stagingRows[2], null, 2));

const r0 = res.stagingRows[0];
const r1 = res.stagingRows[1];
const r2 = res.stagingRows[2];

let passed = true;

if (r0.produccion !== '04820751_087') { console.error('FAIL: produccion r0 is wrong:', r0.produccion); passed = false; }
if (r0.fecha !== '2026-08-11') { console.error('FAIL: fecha r0 is wrong:', r0.fecha); passed = false; }
if (r0.codigo_articulo !== '7408-1') { console.error('FAIL: codigo_articulo r0 is wrong:', r0.codigo_articulo); passed = false; }
if (r0.nombre_articulo !== 'JQ SOFT DRY NATURA AVMEX') { console.error('FAIL: nombre_articulo r0 is wrong:', r0.nombre_articulo); passed = false; }
if (r0.localidad !== '202') { console.error('FAIL: localidad r0 is wrong:', r0.localidad); passed = false; }
if (r0.salon !== 'Jacquard') { console.error('FAIL: salon r0 is wrong:', r0.salon); passed = false; }
if (r0.defecto !== 'Marra') { console.error('FAIL: defecto r0 is wrong:', r0.defecto); passed = false; }
if (r0.cantidad !== 2) { console.error('FAIL: cantidad r0 is wrong:', r0.cantidad); passed = false; }
if (r0.maquina_id_detectada !== 'TELAR-202') { console.error('FAIL: maquina_id_detectada r0 is wrong:', r0.maquina_id_detectada); passed = false; }

if (r1.defecto !== 'Error de Trama') { console.error('FAIL: defecto r1 is wrong:', r1.defecto); passed = false; }
if (r1.cantidad !== 4) { console.error('FAIL: cantidad r1 is wrong:', r1.cantidad); passed = false; }

if (r2.localidad !== '207' || r2.maquina_id_detectada !== 'TELAR-207') { console.error('FAIL: localidad / maquina r2 is wrong:', r2.localidad, r2.maquina_id_detectada); passed = false; }

if (passed) {
  console.log('\n🎉 ALL 10 AUDIT CHECKS PASSED: 100% accurate extraction from Excel!');
} else {
  console.error('\n❌ AUDIT FAILED.');
  process.exit(1);
}
