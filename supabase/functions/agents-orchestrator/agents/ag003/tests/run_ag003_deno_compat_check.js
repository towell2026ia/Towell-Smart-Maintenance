// supabase/functions/agents-orchestrator/agents/ag003/tests/run_ag003_deno_compat_check.js
// Auditor de compatibilidad Deno Edge Runtime para AG-003 (§145, §146 PRD)

const fs = require('fs');
const path = require('path');

function checkDenoCompatibility(dirPath) {
  console.log('================================================================================');
  console.log('🦕 AUDITORÍA DE COMPATIBILIDAD DENO EDGE RUNTIME — AG-003');
  console.log('================================================================================');
  console.log(`📁 Directorio auditado: ${dirPath}\n`);

  const forbiddenNodeModules = [
    'fs', 'path', 'crypto', 'child_process', 'os', 'http', 'https', 'net', 'tls'
  ];

  let totalFiles = 0;
  let compliantFiles = 0;
  const issues = [];

  function scanDir(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules' && entry.name !== 'fixtures' && entry.name !== 'tests') {
          scanDir(fullPath);
        }
      } else if (entry.isFile() && entry.name.endsWith('.ts')) {
        totalFiles++;
        const content = fs.readFileSync(fullPath, 'utf8');
        const relativePath = path.relative(dirPath, fullPath).replace(/\\/g, '/');

        let fileIssues = [];

        // Check 1: Forbidden Node.js built-in require/import
        for (const mod of forbiddenNodeModules) {
          const reqRegex = new RegExp(`require\\(['"]${mod}['"]\\)`, 'g');
          const impRegex = new RegExp(`import\\s+.*\\s+from\\s+['"]${mod}['"]`, 'g');
          if (reqRegex.test(content) || impRegex.test(content)) {
            fileIssues.push(`Import prohibido de módulo nativo de Node.js: "${mod}"`);
          }
        }

        // Check 2: Relative imports must have .ts extension in Deno
        const relativeImportRegex = /from\s+['"](\.\.?\/[^'"]+)['"]/g;
        let match;
        while ((match = relativeImportRegex.exec(content)) !== null) {
          const importPath = match[1];
          if (!importPath.endsWith('.ts') && !importPath.endsWith('.js') && !importPath.endsWith('.json')) {
            fileIssues.push(`Import relativo sin extensión explícita .ts: "${importPath}"`);
          }
        }

        if (fileIssues.length === 0) {
          compliantFiles++;
          console.log(`  [✓] ${relativePath.padEnd(50)} : COMPATIBLE`);
        } else {
          console.error(`  [✗] ${relativePath.padEnd(50)} : FALLA`);
          fileIssues.forEach(iss => console.error(`      -> ${iss}`));
          issues.push({ file: relativePath, fileIssues });
        }
      }
    }
  }

  scanDir(dirPath);

  console.log('\n--------------------------------------------------------------------------------');
  console.log(`📊 Módulos analizados: ${totalFiles} | Compatibles: ${compliantFiles} | Problemas: ${issues.length}`);
  console.log('--------------------------------------------------------------------------------');

  if (issues.length === 0 && totalFiles > 0) {
    console.log('🏆 VEREDICTO: DENO_EDGE_COMPATIBILITY_PASS\n');
    return true;
  } else {
    console.error('❌ VEREDICTO: DENO_EDGE_COMPATIBILITY_FAIL\n');
    return false;
  }
}

const ag003Dir = path.resolve(__dirname, '..');
const success = checkDenoCompatibility(ag003Dir);
process.exit(success ? 0 : 1);
