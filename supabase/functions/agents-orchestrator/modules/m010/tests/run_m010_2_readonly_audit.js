// supabase/functions/agents-orchestrator/modules/m010/tests/run_m010_2_readonly_audit.js
// Read-Only Capability Audit Suite for M-010.2 (v1.0)
// Subgate: M010_READONLY_AUDIT_PASS
// Invariant: Zero business mutation paths in M-010 code tree (§61-83 PRD-M-010.2-R1)

const fs = require('fs');
const path = require('path');
const { assertReadOnlyOperation, M010ReadOnlyViolationError } = require('../guards/m010-readonly-guard.ts');

let totalAuditAssertions = 0;
let passedAuditAssertions = 0;
let failedAuditAssertions = 0;

function assertAudit(condition, message) {
  totalAuditAssertions++;
  if (condition) {
    passedAuditAssertions++;
    console.log(`  ✅ [PASS] ${message}`);
  } else {
    failedAuditAssertions++;
    console.error(`  ❌ [FAIL] ${message}`);
  }
}

function scanDirectoryForMutations(dirPath) {
  const files = fs.readdirSync(dirPath);
  const mutationHits = [];

  for (const file of files) {
    const fullPath = path.join(dirPath, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'tests') {
        mutationHits.push(...scanDirectoryForMutations(fullPath));
      }
    } else if (file.endsWith('.ts') || file.endsWith('.js')) {
      if (file === 'm010-readonly-guard.ts') continue;

      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');

      lines.forEach((line, idx) => {
        const trimmed = line.trim();
        // Check for database / business mutation methods
        if (
          trimmed.includes('.insert(') ||
          trimmed.includes('.update(') ||
          trimmed.includes('.delete(') ||
          trimmed.includes('.upsert(')
        ) {
          mutationHits.push({ file, line: idx + 1, text: trimmed });
        }
      });
    }
  }

  return mutationHits;
}

async function runReadOnlyAudit() {
  console.log('================================================================================');
  console.log('🛡️ M-010.2 READ-ONLY STATIC & RUNTIME CAPABILITY AUDIT');
  console.log('================================================================================\n');

  // 1. Static AST/Text Codebase Scan
  console.log('🔍 Escaneando árbol de código de M-010 para detectar rutas de mutación...');
  const moduleRoot = path.join(__dirname, '..');
  const mutationHits = scanDirectoryForMutations(moduleRoot);

  assertAudit(mutationHits.length === 0, `Escaneo estático: ${mutationHits.length} operaciones de mutación encontradas.`);
  if (mutationHits.length > 0) {
    mutationHits.forEach(h => console.error(`   -> Violación en ${h.file}:${h.line} -> ${h.text}`));
  }

  // 2. Runtime Guard Enforcement Tests
  console.log('\n🔍 Probando bloqueo en runtime del Read-Only Guard...');

  let insertBlocked = false;
  try {
    assertReadOnlyOperation('INSERT INTO ordenes_trabajo');
  } catch (err) {
    if (err instanceof M010ReadOnlyViolationError) insertBlocked = true;
  }
  assertAudit(insertBlocked, 'Guard bloquea operación INSERT en runtime');

  let updateBlocked = false;
  try {
    assertReadOnlyOperation('UPDATE cat_maquinas');
  } catch (err) {
    if (err instanceof M010ReadOnlyViolationError) updateBlocked = true;
  }
  assertAudit(updateBlocked, 'Guard bloquea operación UPDATE en runtime');

  let deleteBlocked = false;
  try {
    assertReadOnlyOperation('DELETE FROM alertas_mantenimiento');
  } catch (err) {
    if (err instanceof M010ReadOnlyViolationError) deleteBlocked = true;
  }
  assertAudit(deleteBlocked, 'Guard bloquea operación DELETE en runtime');

  let createOTBlocked = false;
  try {
    assertReadOnlyOperation('CREATE_OT_MUTATION');
  } catch (err) {
    if (err instanceof M010ReadOnlyViolationError) createOTBlocked = true;
  }
  assertAudit(createOTBlocked, 'Guard bloquea creación de órdenes de trabajo (CREATE_OT)');

  let rpcBlocked = false;
  try {
    assertReadOnlyOperation('MUTATING_RPC_CALL');
  } catch (err) {
    if (err instanceof M010ReadOnlyViolationError) rpcBlocked = true;
  }
  assertAudit(rpcBlocked, 'Guard bloquea mutating RPCs');

  let readAllowed = false;
  try {
    assertReadOnlyOperation('SELECT FROM cat_maquinas');
    readAllowed = true;
  } catch (err) {
    readAllowed = false;
  }
  assertAudit(readAllowed, 'Guard autoriza operación de lectura SELECT');

  console.log('\n================================================================================');
  console.log(`📊 Total Aserciones de Auditoría Read-Only: ${totalAuditAssertions}`);
  console.log(`   Aprobadas: ${passedAuditAssertions} | Fallidas: ${failedAuditAssertions}`);
  console.log('================================================================================');

  if (passedAuditAssertions === totalAuditAssertions && failedAuditAssertions === 0) {
    console.log('🏆 VEREDICTO: M010_READONLY_AUDIT_PASS ✅\n');
    return { success: true };
  } else {
    console.error('❌ VEREDICTO: M010_READONLY_AUDIT_BLOCKED\n');
    process.exit(1);
  }
}

runReadOnlyAudit().catch(err => {
  console.error('Error fatal en auditoría read-only:', err);
  process.exit(1);
});
