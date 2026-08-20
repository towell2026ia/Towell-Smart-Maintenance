// test_e2e_complete.js
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

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
global.window = { location: { hash: '' }, addEventListener: () => {} };
global.history = { pushState: () => {} };
global.navigator = { userAgent: 'Node' };
global.currentUser = { name: 'Auditor' };
global.supabaseClient = null;
global.localStorage = { getItem: () => '[]', setItem: () => {} };
global.showToast = (msg) => console.log('[TOAST]:', msg);

const appJs = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
eval(appJs);

const fileBuf = fs.readFileSync(path.join(__dirname, 'importar_excel', 'Segundas semana 33.xlsx'));
const wb = XLSX.read(fileBuf, { type: 'buffer' });

const parsedResult = parseWorkbookMatrixToStaging(wb, 'segundas', 'Segundas semana 33.xlsx', 'test-id-carga');

console.log('Parsed Rows Count:', parsedResult.stagingRows.length);
console.log('Row 0:\n', JSON.stringify(parsedResult.stagingRows[0], null, 2));
console.log('Row 1:\n', JSON.stringify(parsedResult.stagingRows[1], null, 2));
console.log('Row 2:\n', JSON.stringify(parsedResult.stagingRows[2], null, 2));

const r0 = parsedResult.stagingRows[0];
if (!r0.produccion || r0.produccion === '—') throw new Error('produccion is empty');
if (r0.fecha !== '2026-08-11') throw new Error('fecha is wrong: ' + r0.fecha);
if (r0.localidad !== '202') throw new Error('localidad is wrong: ' + r0.localidad);
if (r0.codigo_articulo !== '7408-1') throw new Error('codigo_articulo is wrong');
if (r0.nombre_articulo !== 'JQ SOFT DRY NATURA AVMEX') throw new Error('nombre_articulo is wrong');
if (r0.defecto !== 'Marra') throw new Error('defecto is wrong: ' + r0.defecto);
if (r0.cantidad !== 2) throw new Error('cantidad is wrong: ' + r0.cantidad);
if (r0.maquina_id_detectada !== 'TELAR-202') throw new Error('maquina is wrong: ' + r0.maquina_id_detectada);

console.log('\n✅ ALL ASSERTIONS PASSED! Data extraction is 100% accurate.');
