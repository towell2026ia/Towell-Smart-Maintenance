// inspect_ws_deep.js
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const fileBuf = fs.readFileSync(path.join(__dirname, 'importar_excel', 'Segundas semana 33.xlsx'));
const wb = XLSX.read(fileBuf, { type: 'buffer' });

console.log('Sheet Names:', wb.SheetNames);
for (const sName of wb.SheetNames) {
  const ws = wb.Sheets[sName];
  console.log(`Sheet "${sName}": !ref = ${ws['!ref']}`);
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1');
  console.log(`Decoded Range: s.r=${range.s.r}, s.c=${range.s.c}, e.r=${range.e.r}, e.c=${range.e.c}`);
  
  const rawMatrix = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' });
  console.log(`rawMatrix rows count: ${rawMatrix.length}`);
  console.log(`rawMatrix[0] length: ${rawMatrix[0] ? rawMatrix[0].length : 0}`);
  console.log(`rawMatrix[1] length: ${rawMatrix[1] ? rawMatrix[1].length : 0}`);
  console.log(`rawMatrix[0]:\n`, rawMatrix[0]);
  console.log(`rawMatrix[1]:\n`, rawMatrix[1]);
}
