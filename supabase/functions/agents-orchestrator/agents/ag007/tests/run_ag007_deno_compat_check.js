// supabase/functions/agents-orchestrator/agents/ag007/tests/run_ag007_deno_compat_check.js
// Deno / Supabase Edge Functions Compatibility Checker for AG-007
// Frozen under Token: AG007-DETERMINISTIC-ENGINE-001

const fs = require('fs');
const path = require('path');

function checkDenoCompatibility() {
  console.log('================================================================');
  console.log('   TSM-AI: AG-007 DENO / SUPABASE EDGE COMPATIBILITY CHECK       ');
  console.log('================================================================\n');

  const baseDir = path.resolve(__dirname, '..');
  const sourceDirs = [
    'guards', 'resolvers', 'classifiers', 'dedupers', 'attributors',
    'completeness', 'aggregators', 'calculators', 'rules', 'core',
    'types', 'contracts', 'catalog', 'prompts', 'decision', 'validators', 'adapters'
  ];

  let totalFilesChecked = 0;
  let syntaxErrors = 0;

  for (const dir of sourceDirs) {
    const fullDir = path.join(baseDir, dir);
    if (!fs.existsSync(fullDir)) continue;

    const files = fs.readdirSync(fullDir).filter(f => f.endsWith('.ts'));

    for (const f of files) {
      totalFilesChecked++;
      const filePath = path.join(fullDir, f);
      const content = fs.readFileSync(filePath, 'utf8');

      // Check 1: No Node built-in imports in Edge modules
      const nodeModules = ["from 'fs'", "from 'path'", "from 'child_process'", "from 'os'", "from 'http'"];
      let hasNodeImport = false;
      for (const nm of nodeModules) {
        if (content.includes(nm)) {
          console.error(`  ❌ [FAIL] ${dir}/${f} contains Node module import: ${nm}`);
          hasNodeImport = true;
          syntaxErrors++;
        }
      }

      // Check 2: Relative imports have .ts extension
      const importLines = content.split('\n').filter(l => l.trim().startsWith('import ') && l.includes("from './") || l.includes("from '../"));
      let hasMissingTsExtension = false;
      for (const line of importLines) {
        if (!line.includes('.ts') && !line.includes('.json')) {
          console.error(`  ❌ [FAIL] ${dir}/${f} missing .ts in import: ${line.trim()}`);
          hasMissingTsExtension = true;
          syntaxErrors++;
        }
      }

      if (!hasNodeImport && !hasMissingTsExtension) {
        console.log(`  ✅ [PASS] ${dir}/${f} is Deno/Edge compatible`);
      }
    }
  }

  console.log('\n================================================================');
  console.log(`   Archivos TypeScript Verificados: ${totalFilesChecked}`);
  console.log(`   Incompatibilidades Detectadas:   ${syntaxErrors}`);
  console.log('================================================================');

  if (syntaxErrors === 0 && totalFilesChecked >= 11) {
    console.log('🏆 VEREDICTO: DENO_EDGE_COMPATIBILITY_PASS ✅');
  } else {
    console.error('❌ VEREDICTO: DENO_COMPATIBILITY_FAILED');
    process.exit(1);
  }
}

checkDenoCompatibility();
