// inspect_segundas_file.js
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const filePath = path.join(__dirname, 'importar_excel', 'Segundas semana 33.xlsx');
console.log('Inspecting file:', filePath);

if (!fs.existsSync(filePath)) {
  console.error('File does not exist at:', filePath);
  process.exit(1);
}

const fileBuf = fs.readFileSync(filePath);
const wb = XLSX.read(fileBuf, { type: 'buffer' });

console.log('Workbook Sheet Names:', wb.SheetNames);

for (const sName of wb.SheetNames) {
  const ws = wb.Sheets[sName];
  console.log(`\n=================== SHEET: "${sName}" ===================`);
  console.log('Ref range:', ws['!ref']);
  
  // Matrix format
  const matrix = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' });
  console.log('Total matrix rows:', matrix.length);
  
  console.log('\n--- FIRST 5 ROWS AS ARRAYS ---');
  for (let r = 0; r < Math.min(matrix.length, 5); r++) {
    console.log(`Row ${r}:`, JSON.stringify(matrix[r]));
  }

  console.log('\n--- DEFAULT sheet_to_json OBJECTS (FIRST 3) ---');
  const jsonObjects = XLSX.utils.sheet_to_json(ws, { defval: '' });
  console.log('Total JSON objects:', jsonObjects.length);
  if (jsonObjects.length > 0) {
    console.log('Object 0 Keys:\n', Object.keys(jsonObjects[0]));
    console.log('Object 0 Values:\n', jsonObjects[0]);
  }
}
