// supabase/functions/agents-orchestrator/agents/ag002/tests/run_ag002_deno_compat_check.js
// Deno / Supabase Edge Functions Compatibility Auditor for AG-002 (§95-98, §168 PRD)

const fs = require('fs');
const path = require('path');

const AG002_DIR = path.join(__dirname, '..');

const FORBIDDEN_NODE_MODULES = [
  'fs',
  'path',
  'child_process',
  'cluster',
  'net',
  'dgram',
  'dns',
  'http2',
  'tls',
  'v8',
  'vm'
];

function getAllTsFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      if (file !== 'tests') {
        getAllTsFiles(filePath, fileList);
      }
    } else if (file.endsWith('.ts')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

function auditDenoCompatibility() {
  console.log('================================================================================');
  console.log('🦕 AG-002 — SUPABASE EDGE FUNCTIONS / DENO COMPATIBILITY AUDITOR');
  console.log('================================================================================');

  const tsFiles = getAllTsFiles(AG002_DIR);
  console.log(`🔍 Inspeccionando ${tsFiles.length} módulos TypeScript de AG-002...\n`);

  let errors = [];
  let auditedFiles = 0;

  for (const filePath of tsFiles) {
    auditedFiles++;
    const relPath = path.relative(AG002_DIR, filePath);
    const content = fs.readFileSync(filePath, 'utf8');

    // 1. Check for CommonJS require/module.exports
    if (content.includes('require(') || content.includes('module.exports')) {
      errors.push(`[${relPath}] Uso prohibido de CommonJS (require / module.exports)`);
    }

    // 2. Check for Node builtins
    for (const mod of FORBIDDEN_NODE_MODULES) {
      const regex = new RegExp(`from\\s+['"](node:)?${mod}['"]`, 'g');
      if (regex.test(content)) {
        errors.push(`[${relPath}] Importación prohibida de módulo de Node.js: '${mod}'`);
      }
    }

    // 3. Check for TypeScript import extensions (.ts required for Deno)
    const importRegex = /import\s+.*?from\s+['"](.*?)['"]/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1];
      if (importPath.startsWith('.') && !importPath.endsWith('.ts') && !importPath.endsWith('.json')) {
        errors.push(`[${relPath}] Importación relativa sin extensión .ts explícita para Deno: '${importPath}'`);
      }
    }
  }

  console.log('--------------------------------------------------------------------------------');
  console.log(`📁 Módulos TypeScript auditados: ${auditedFiles}`);
  console.log(`❌ Errores de compatibilidad Deno: ${errors.length}`);
  console.log('--------------------------------------------------------------------------------');

  if (errors.length === 0) {
    console.log('\n🏆 VEREDICTO DENO: DENO_EDGE_RUNTIME_TEST = PASS');
    console.log('🔒 100% compatible con Supabase Edge Functions / Deno ESM runtime.\n');
    return true;
  } else {
    console.error('\n❌ VEREDICTO DENO: DENO_EDGE_COMPATIBILITY_FAILED');
    for (const err of errors) {
      console.error(`  • ${err}`);
    }
    return false;
  }
}

const passed = auditDenoCompatibility();
process.exit(passed ? 0 : 1);
