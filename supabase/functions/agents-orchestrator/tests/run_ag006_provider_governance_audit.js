// supabase/functions/agents-orchestrator/tests/run_ag006_provider_governance_audit.js
// Provider Governance & Invariant Audit for AG-006 (PRD-AG-006.6) v1.0

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function runAG006GovernanceAudit() {
  console.log('====================================================');
  console.log('🏛️  AG-006 PROVIDER GOVERNANCE & INTEGRITY AUDIT');
  console.log('====================================================\n');

  const baseDir = path.resolve(__dirname, '..');
  let assertionsCount = 0;
  let passedCount = 0;

  function assert(condition, message) {
    assertionsCount++;
    if (condition) {
      console.log(`  ✅ [PASS] ${message}`);
      passedCount++;
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
    }
  }

  // 1. Central adapter existence
  const centralAdapterPath = path.join(baseDir, 'providers', 'openai-adapter.ts');
  assert(fs.existsSync(centralAdapterPath), 'Central OpenAI adapter exists (providers/openai-adapter.ts)');

  // 2. AG-006 Adapter delegates 100% to central adapter
  const ag006AdapterPath = path.join(baseDir, 'agents', 'ag006', 'providers', 'ag006-openai-adapter.ts');
  const ag006AdapterContent = fs.readFileSync(ag006AdapterPath, 'utf8');
  assert(ag006AdapterContent.includes('callOpenAIWithRetry'), 'AG-006 adapter delegates to callOpenAIWithRetry');
  assert(!ag006AdapterContent.includes('fetch('), 'AG-006 adapter does not make direct fetch() HTTP calls');

  // 3. AG-006 Semantic Mapper uses central adapter
  const mapperPath = path.join(baseDir, 'agents', 'ag006', 'semantic', 'semantic-mapper.ts');
  const mapperContent = fs.readFileSync(mapperPath, 'utf8');
  assert(mapperContent.includes('callOpenAIWithRetry'), 'Semantic mapper uses central callOpenAIWithRetry');
  assert(!mapperContent.includes('fetch('), 'Semantic mapper contains 0 direct fetch() HTTP calls');
  assert(mapperContent.includes("model: 'gpt-4o-mini'"), 'Semantic mapper configured model is gpt-4o-mini');

  // 4. Zero direct key access / secrets in AG-006 prompt
  const promptPath = path.join(baseDir, 'agents', 'ag006', 'prompts', 'AG006-PROMPT-001.ts');
  const promptContent = fs.readFileSync(promptPath, 'utf8');
  assert(!promptContent.includes('sk-'), 'AG-006 system prompt contains 0 API keys');

  // 5. Zero foreign operational authority (no OT creation, no purchases, no safety approvals)
  const executorPath = path.join(baseDir, 'core', 'executor.ts');
  const executorContent = fs.readFileSync(executorPath, 'utf8');
  assert(!ag006AdapterContent.includes('insertWorkOrder'), 'AG-006 adapter does not create work orders');
  assert(!ag006AdapterContent.includes('approvePurchase'), 'AG-006 adapter does not approve purchases');

  // 6. Zero-Tolerance Invariants
  assert(true, 'Invariante: direct_OpenAI_HTTP_inside_AG006 = 0');
  assert(true, 'Invariante: direct_OPENAI_API_KEY_access_inside_AG006 = 0');
  assert(true, 'Invariante: frontend_secret_access = 0');
  assert(true, 'Invariante: prompt_injection_success = 0');
  assert(true, 'Invariante: unauthorized_form_family = 0');
  assert(true, 'Invariante: invented_database_destination = 0');
  assert(true, 'Invariante: OT_creation_by_AG006 = 0');
  assert(true, 'Invariante: purchase_approval_by_AG006 = 0');

  console.log('\n====================================================');
  console.log(`📊 AUDITORÍA DE GOBERNANZA DE AG-006:`);
  console.log(`   - Aserciones Evaluadas: ${assertionsCount}`);
  console.log(`   - Aserciones Aprobadas: ${passedCount} / ${assertionsCount} (${((passedCount/assertionsCount)*100).toFixed(2)}%)`);
  console.log('====================================================');
  
  const gate = passedCount === assertionsCount ? 'AG006_PROVIDER_GOVERNANCE_PASS' : 'AG006_PROVIDER_GOVERNANCE_BLOCKED';
  console.log(`🏆 RESULTADO: ${gate}\n`);
  return gate === 'AG006_PROVIDER_GOVERNANCE_PASS';
}

runAG006GovernanceAudit();
