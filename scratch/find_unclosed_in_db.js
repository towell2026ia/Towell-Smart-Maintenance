const fs = require('fs');
const html = fs.readFileSync('c:/Users/franh/OneDrive/Documentos/GuIA/Proyectos/TSMAI/app/index.html', 'utf8');
const lines = html.split('\n');

for (let i = 4500; i < 4940; i++) {
  const line = lines[i];
  if (line.includes('id="modal-')) {
    console.log(`Line ${i + 1}: ${line.trim()}`);
  }
}
