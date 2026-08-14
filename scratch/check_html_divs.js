const fs = require('fs');
const path = require('path');

const content = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const lines = content.split('\n');

let stack = [];

for (let i = 0; i < lines.length; i++) {
  const lineNum = i + 1;
  const line = lines[i];

  const matches = line.matchAll(/<\/?div[^>]*>/gi);
  for (const match of matches) {
    const tag = match[0];
    if (tag.startsWith('</')) {
      if (stack.length > 0) {
        stack.pop();
      }
    } else {
      const idMatch = tag.match(/id=["']([^"']+)["']/i);
      const id = idMatch ? idMatch[1] : null;
      
      const parent = stack.length > 0 ? stack[stack.length - 1] : null;
      const parentId = parent ? (parent.id || parent.tag.substring(0, 30)) : 'ROOT';
      
      if (id && id.startsWith('panel-admin-')) {
        console.log(`[Panel Parent Check] ${id.padEnd(25)} | Line: ${String(lineNum).padEnd(5)} | Depth: ${stack.length} | Parent: ${parentId}`);
      }
      
      stack.push({ line: lineNum, tag, id });
    }
  }
}
