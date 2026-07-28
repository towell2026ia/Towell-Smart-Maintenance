const fs = require('fs');

const code = fs.readFileSync('app.js', 'utf8');
const lines = code.split('\n');

const dangerousPattern = /document\.getElementById\(['"]([^'"]+)['"]\)\.(innerText|innerHTML|textContent|value|style|onclick|onchange|src|checked)\s*=/;

console.log('🔍 Buscando llamadas desprotegidas document.getElementById(...).prop = ...');

let count = 0;
lines.forEach((line, idx) => {
  const match = line.match(dangerousPattern);
  if (match) {
    count++;
    console.log(`Línea ${idx + 1}: ID="${match[1]}" (prop: ${match[2]}) ➔ ${line.trim().slice(0, 80)}`);
  }
});

console.log(`\nTOTAL DE LLAMADAS POTENCIALMENTE PELIGROSAS DESPROTEGIDAS: ${count}`);
