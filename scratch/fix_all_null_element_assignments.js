const fs = require('fs');

let code = fs.readFileSync('app.js', 'utf8');

console.log('🔧 Reemplazando asignaciones directas document.getElementById(...) desprotegidas por encadenamiento opcional o verificaciones seguras...');

// 1. Reemplazar document.getElementById('xxx').innerText = val; -> const _el = document.getElementById('xxx'); if (_el) _el.innerText = val;
// O mediante ?. en navegadores modernos (Soportado en 100% navegadores desde 2020)
// Nota: document.getElementById('xxx')?.innerText = val es sintaxis inválida en JS LHS (Left-Hand Side).
// Debe ser: const el = document.getElementById('xxx'); if (el) el.innerText = val;
// O usando helper safeSetText('xxx', val)

// Reemplazos de textContent directos
code = code.replace(/document\.getElementById\((['"][^'"]+['"])\)\.textContent\s*=\s*([^;]+);/g, (match, id, val) => {
  return `{ const _el = document.getElementById(${id}); if (_el) _el.textContent = ${val}; }`;
});

// Reemplazos de innerText directos
code = code.replace(/document\.getElementById\((['"][^'"]+['"])\)\.innerText\s*=\s*([^;]+);/g, (match, id, val) => {
  return `{ const _el = document.getElementById(${id}); if (_el) _el.innerText = ${val}; }`;
});

// Reemplazos de innerHTML directos
code = code.replace(/document\.getElementById\((['"][^'"]+['"])\)\.innerHTML\s*=\s*([^;]+);/g, (match, id, val) => {
  return `{ const _el = document.getElementById(${id}); if (_el) _el.innerHTML = ${val}; }`;
});

// Reemplazos de value directos
code = code.replace(/document\.getElementById\((['"][^'"]+['"])\)\.value\s*=\s*([^;]+);/g, (match, id, val) => {
  return `{ const _el = document.getElementById(${id}); if (_el) _el.value = ${val}; }`;
});

// Reemplazos de style.xxx directos
code = code.replace(/document\.getElementById\((['"][^'"]+['"])\)\.style\.([a-zA-Z]+)\s*=\s*([^;]+);/g, (match, id, prop, val) => {
  return `{ const _el = document.getElementById(${id}); if (_el && _el.style) _el.style.${prop} = ${val}; }`;
});

// Reemplazos de src directos
code = code.replace(/document\.getElementById\((['"][^'"]+['"])\)\.src\s*=\s*([^;]+);/g, (match, id, val) => {
  return `{ const _el = document.getElementById(${id}); if (_el) _el.src = ${val}; }`;
});

// Reemplazos de checked directos
code = code.replace(/document\.getElementById\((['"][^'"]+['"])\)\.checked\s*=\s*([^;]+);/g, (match, id, val) => {
  return `{ const _el = document.getElementById(${id}); if (_el) _el.checked = ${val}; }`;
});

fs.writeFileSync('app.js', code, 'utf8');
console.log('✅ app.js actualizado con protecciones anti-crash en todos los elementos del DOM.');
