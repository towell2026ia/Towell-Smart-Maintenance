// test_app_js_exact_matrix.js
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const appJsContent = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');

// Extract normalizeExcelDateToISO, resolveTelarMachineId, mapExcelRowToStaging, parseWorkbookMatrixToStaging
const scriptToRun = `
${appJsContent.substring(appJsContent.indexOf('function normalizeExcelDateToISO'), appJsContent.indexOf('async function handleRealExcelUpload'))}

const fileBuf = fs.readFileSync(path.join(__dirname, 'importar_excel', 'Segundas semana 33.xlsx'));
const wb = XLSX.read(fileBuf, { type: 'buffer' });

const res = parseWorkbookMatrixToStaging(wb, 'segundas', 'Segundas semana 33.xlsx', 'test-carga-uuid');

console.log('Result sheetName:', res.sheetName);
console.log('Header Range Index:', res.headerRange);
console.log('Staging rows length:', res.stagingRows.length);
console.log('Staging Row 0:\\n', JSON.stringify(res.stagingRows[0], null, 2));
console.log('Staging Row 1:\\n', JSON.stringify(res.stagingRows[1], null, 2));
`;

fs.writeFileSync(path.join(__dirname, 'scratch_runner.js'), scriptToRun);
console.log('scratch_runner.js written.');
