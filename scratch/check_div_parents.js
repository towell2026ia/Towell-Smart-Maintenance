const fs = require('fs');
const html = fs.readFileSync('c:/Users/franh/OneDrive/Documentos/GuIA/Proyectos/TSMAI/app/index.html', 'utf8');

const lines = html.split('\n');
let stack = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const tagMatches = line.matchAll(/<\/?div[^>]*>/gi);
  for (const match of tagMatches) {
    const str = match[0];
    if (str.startsWith('</')) {
      if (stack.length > 0) stack.pop();
    } else {
      const idMatch = str.match(/id="([^"]+)"/);
      const classMatch = str.match(/class="([^"]+)"/);
      stack.push({
        line: i + 1,
        id: idMatch ? idMatch[1] : null,
        class: classMatch ? classMatch[1] : null
      });
    }
  }

  if (i + 1 === 4728) {
    console.log('--- Active parents at line 4728 ---');
    console.log(stack);
  }
}
