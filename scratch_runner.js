const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

// Mock localStorage
const localStorage = {
  getItem: (k) => '[]'
};

const appJsContent = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
const codeSnippet = appJsContent.substring(appJsContent.indexOf('function normalizeExcelDateToISO'), appJsContent.indexOf('async function handleRealExcelUpload'));

eval(codeSnippet);

const fileBuf = fs.readFileSync(path.join(__dirname, 'importar_excel', 'Segundas semana 33.xlsx'));
const wb = XLSX.read(fileBuf, { type: 'buffer' });

const res = parseWorkbookMatrixToStaging(wb, 'segundas', 'Segundas semana 33.xlsx', 'test-carga-uuid');

console.log('Result sheetName:', res.sheetName);
console.log('Header Range Index:', res.headerRange);
console.log('Staging rows length:', res.stagingRows.length);
console.log('Staging Row 0:\n', JSON.stringify(res.stagingRows[0], null, 2));
console.log('Staging Row 1:\n', JSON.stringify(res.stagingRows[1], null, 2));
