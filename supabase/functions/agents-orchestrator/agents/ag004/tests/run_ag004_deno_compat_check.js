// supabase/functions/agents-orchestrator/agents/ag004/tests/run_ag004_deno_compat_check.js
// Deno Edge Runtime Compatibility Checker for AG-004

const fs = require('fs');
const path = require('path');

const targetDir = path.resolve(__dirname, '..');

function getTsFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (file !== 'tests') {
        results = results.concat(getTsFiles(filePath));
      }
    } else if (file.endsWith('.ts')) {
      results.push(filePath);
    }
  }
  return results;
}

function checkDenoCompatibility() {
  console.log('================================================================================');
  console.log('🦕 AUDITORÍA DE COMPATIBILIDAD DENO EDGE RUNTIME — AG-004');
  console.log('================================================================================');
  console.log(`📁 Directorio auditado: ${targetDir}\n`);

  const tsFiles = getTsFiles(targetDir);
  let passedCount = 0;
  let failedCount = 0;

  for (const file of tsFiles) {
    const relPath = path.relative(targetDir, file).replace(/\\/g, '/');
    const content = fs.readFileSync(file, 'utf8');

    const issues = [];

    // 1. Check for Node-only imports
    if (content.includes("from 'fs'") || content.includes('from "fs"')) issues.push("Importación prohibida de 'fs'");
    if (content.includes("from 'path'") || content.includes('from "path"')) issues.push("Importación prohibida de 'path'");
    if (content.includes("from 'crypto'") || content.includes('from "crypto"')) issues.push("Importación prohibida de 'crypto'");
    if (content.includes("from 'child_process'") || content.includes('from "child_process"')) issues.push("Importación prohibida de 'child_process'");

    // 2. Check for missing .ts in relative imports
    const importRegex = /import\s+.*?from\s+['"](\.\/[^'"]+|\.\.\/[^'"]+)['"]/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      const impPath = match[1];
      if (!impPath.endsWith('.ts') && !impPath.endsWith('.json')) {
        issues.push(`Importación relativa sin extensión .ts: '${impPath}'`);
      }
    }

    if (issues.length === 0) {
      passedCount++;
      console.log(`  [✓] ${relPath.padEnd(48)}: COMPATIBLE`);
    } else {
      failedCount++;
      console.error(`  [✗] ${relPath.padEnd(48)}: ERROR -> ${issues.join('; ')}`);
    }
  }

  console.log('\n--------------------------------------------------------------------------------');
  console.log(`📊 Módulos analizados: ${tsFiles.length} | Compatibles: ${passedCount} | Problemas: ${failedCount}`);
  console.log('--------------------------------------------------------------------------------');

  if (failedCount === 0 && passedCount > 0) {
    console.log('🏆 VEREDICTO: DENO_EDGE_COMPATIBILITY_PASS\n');
    return true;
  } else {
    console.error('❌ VEREDICTO: DENO_EDGE_COMPATIBILITY_FAILED\n');
    return false;
  }
}

const success = checkDenoCompatibility();
process.exit(success ? 0 : 1);
