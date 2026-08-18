const fs = require('fs');
const path = require('path');
const appJs = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const lines = appJs.split(/\r?\n/);
console.log('submitChangedPassword lines:');
for (let i = 11347; i <= 11450; i++) {
  console.log(`${i}: ${lines[i]}`);
}
