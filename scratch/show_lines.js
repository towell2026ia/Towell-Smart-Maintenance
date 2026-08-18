const fs = require('fs');
const path = require('path');
const appJs = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const lines = appJs.split(/\r?\n/);
console.log('Lines 1665 to 1685:');
for (let i = 1665; i <= 1685; i++) {
  console.log(`${i}: ${JSON.stringify(lines[i])}`);
}
