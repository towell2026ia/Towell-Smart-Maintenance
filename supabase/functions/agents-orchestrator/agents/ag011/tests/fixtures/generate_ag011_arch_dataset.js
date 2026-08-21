// supabase/functions/agents-orchestrator/agents/ag011/tests/fixtures/generate_ag011_arch_dataset.js
// Architecture Evaluation Dataset Generator for AG011-ARCH-EVAL-001 (156 Assertions across 14 Groups)
// Frozen under Token: AG011-DATA-MAP-001

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const assertionGroups = [
  { group: 'M-010 / Source Mapping', count: 12 },
  { group: 'AG-010 / AG-008 / M-011 Boundaries', count: 12 },
  { group: 'Memory Definition', count: 12 },
  { group: 'Memory Candidate Rules', count: 12 },
  { group: 'Evidence / Traceability', count: 14 },
  { group: 'Memory Scope / Applicability', count: 12 },
  { group: 'Status / Approval', count: 12 },
  { group: 'Versioning / Supersession', count: 12 },
  { group: 'Retrieval / Ranking', count: 14 },
  { group: 'Freshness', count: 8 },
  { group: 'Circular Dependency Protection', count: 10 },
  { group: 'Persistence Analysis', count: 8 },
  { group: 'Security / Authority', count: 10 },
  { group: 'No-LLM / Foreign Boundaries', count: 8 }
];

const total = assertionGroups.reduce((acc, g) => acc + g.count, 0); // 156

const payload = {
  version: 'AG011-ARCH-EVAL-001',
  description: 'Architecture & Knowledge Governance Evaluation Dataset for AG-011 (156 Assertions)',
  total_assertions: total,
  groups: assertionGroups,
  generated_at: new Date().toISOString()
};

const outputPath = path.join(__dirname, 'ag011-arch-eval-001.json');
fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2), 'utf8');
const datasetSha = crypto.createHash('sha256').update(fs.readFileSync(outputPath)).digest('hex');

console.log(`✅ Dataset AG011-ARCH-EVAL-001 generado con éxito:`);
console.log(`   - Archivo:           ${outputPath}`);
console.log(`   - Total Aserciones:  ${total} en 14 grupos`);
console.log(`   - Dataset SHA-256:   ${datasetSha}`);
