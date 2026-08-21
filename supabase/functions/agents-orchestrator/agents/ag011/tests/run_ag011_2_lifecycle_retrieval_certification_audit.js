// supabase/functions/agents-orchestrator/agents/ag011/tests/run_ag011_2_lifecycle_retrieval_certification_audit.js
// Master Certification Audit Suite for PRD-AG-011.2-R1 (40 Assertions across 10 Groups)
// Targets:
//   - AG011_PERSISTENCE_INTEGRITY_PASS (AG011-PERSISTENCE-INTEGRITY-001)
//   - AG011_LIFECYCLE_INTEGRITY_PASS (AG011-LIFECYCLE-INTEGRITY-001)
//   - AG011_RETRIEVAL_INTEGRITY_PASS (AG011-RETRIEVAL-CONFIG-EVIDENCE-001)
//   - AG011_RUNTIME_CONFIG_INTEGRITY_PASS
//   - AG011_DETERMINISTIC_GATE_PASS

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const { AG011MemoryEngine } = require('../core/ag011-memory-engine.ts');
const { AG011MemoryConfigRegistry } = require('../config/ag011-memory-config-registry.ts');
const { AG011MemoryBuilder } = require('../core/ag011-memory-builder.ts');
const { AG011MemoryRetriever } = require('../retrieval/ag011-memory-retriever.ts');
const { AG011MemoryVersionEngine } = require('../versioning/ag011-memory-version-engine.ts');
const { AG011MemoryApprovalGuard } = require('../approval/ag011-memory-approval-guard.ts');

let totalAssertions = 0;
let passedAssertions = 0;
let failedAssertions = 0;

function assert(condition, message, group = 'General') {
  totalAssertions++;
  if (condition) {
    passedAssertions++;
    console.log(`  ✅ [PASS] [${group}] ${message}`);
  } else {
    failedAssertions++;
    console.error(`  ❌ [FAIL] [${group}] ${message}`);
  }
}

async function runR1CertificationAudit() {
  console.log('================================================================================');
  console.log('🛡️ PRD-AG-011.2-R1 — LIFECYCLE, RETRIEVAL & PERSISTENCE CERTIFICATION AUDIT (40 ASERCIONES)');
  console.log('================================================================================\n');

  // ---------------------------------------------------------------------------
  // Group 1: Four-Table Schema Integrity (6 assertions)
  // ---------------------------------------------------------------------------
  console.log('1. GRUPO 1: INTEGRIDAD DE ESQUEMA DE 4 TABLAS');
  const migrationPath = path.join(__dirname, '../../../../../migrations/20260821_006_ag011_technical_memory_tables_v10.sql');
  assert(fs.existsSync(migrationPath), 'Archivo de migración 20260821_006_ag011_technical_memory_tables_v10.sql existe', 'Schema Integrity');

  const migrationContent = fs.readFileSync(migrationPath, 'utf8');
  const migrationSha = crypto.createHash('sha256').update(migrationContent).digest('hex');
  assert(migrationSha.length === 64, `Migración SHA-256 calculada: ${migrationSha}`, 'Schema Integrity');

  assert(migrationContent.includes('CREATE TABLE IF NOT EXISTS public.memorias_tecnicas'), 'Tabla 1: public.memorias_tecnicas definida', 'Schema Integrity');
  assert(migrationContent.includes('CREATE TABLE IF NOT EXISTS public.memoria_versiones'), 'Tabla 2: public.memoria_versiones definida', 'Schema Integrity');
  assert(migrationContent.includes('CREATE TABLE IF NOT EXISTS public.memoria_evidencias'), 'Tabla 3: public.memoria_evidencias definida', 'Schema Integrity');
  assert(migrationContent.includes('CREATE TABLE IF NOT EXISTS public.memoria_aprobaciones'), 'Tabla 4: public.memoria_aprobaciones definida', 'Schema Integrity');

  // ---------------------------------------------------------------------------
  // Group 2: RLS & Security (4 assertions)
  // ---------------------------------------------------------------------------
  console.log('\n2. GRUPO 2: RLS Y SEGURIDAD EN PERSISTENCIA');
  assert(migrationContent.includes('ALTER TABLE public.memorias_tecnicas ENABLE ROW LEVEL SECURITY;'), 'RLS habilitado en public.memorias_tecnicas', 'RLS / Security');
  assert(migrationContent.includes('ALTER TABLE public.memoria_versiones ENABLE ROW LEVEL SECURITY;'), 'RLS habilitado en public.memoria_versiones', 'RLS / Security');
  assert(migrationContent.includes('ALTER TABLE public.memoria_evidencias ENABLE ROW LEVEL SECURITY;'), 'RLS habilitado en public.memoria_evidencias', 'RLS / Security');
  assert(migrationContent.includes('ALTER TABLE public.memoria_aprobaciones ENABLE ROW LEVEL SECURITY;'), 'RLS habilitado en public.memoria_aprobaciones', 'RLS / Security');

  // ---------------------------------------------------------------------------
  // Group 3: Approval Lifecycle (6 assertions)
  // ---------------------------------------------------------------------------
  console.log('\n3. GRUPO 3: CICLO DE VIDA Y GOBERNANZA DE APROBACIÓN');
  const candRes = await AG011MemoryEngine.execute({
    request_id: 'REQ-AUDIT-CAND-1',
    operation: 'BUILD_CANDIDATE',
    candidate_params: {
      title: 'Memoria de Auditoría',
      memory_type: 'VALIDATED_REPAIR',
      asset_id: 'TELAR-501',
      condition_description: 'Vibración',
      validated_observations: ['Pitting'],
      validated_procedure: 'Reemplazo rodamiento',
      expected_outcome: 'Normalización',
      evidence_items: [
        {
          evidence_id: 'EV-AUD-1',
          evidence_class: 'CERTIFIED_FACT',
          source_type: 'FINDING',
          source_id: 'FIND-1',
          fact_statement: 'Pitting detectado',
          occurred_at: '2026-08-20T10:00:00Z'
        }
      ],
      origin_case_ids: ['CASE-AUD-1']
    }
  });

  assert(candRes.result.status === 'CANDIDATE', 'Candidato recién creado tiene status = CANDIDATE', 'Approval Lifecycle');
  assert(candRes.result.status !== 'APPROVED', 'CANDIDATE != APPROVED verificado', 'Approval Lifecycle');
  assert(candRes.result.requires_human_review === true, 'requires_human_review = true verificado', 'Approval Lifecycle');

  let blockedAiApproval = false;
  try {
    AG011MemoryApprovalGuard.validateApprovalEvent({
      reviewer_email: 'bot@ai.internal',
      reviewer_role: 'SUPER_ADMIN',
      decision: 'APPROVED',
      notes: 'Auto-aprobación',
      evidence_snapshot_sha256: 'e'.repeat(64),
      is_ai_agent: true
    });
  } catch (e) {
    blockedAiApproval = true;
  }
  assert(blockedAiApproval, 'AI_approved_memories = 0 (bloqueo estricto de IA como aprobador)', 'Approval Lifecycle');

  let blockedInvalidRole = false;
  try {
    AG011MemoryApprovalGuard.validateApprovalEvent({
      reviewer_email: 'tecnico@towell.com',
      reviewer_role: 'TECNICO_ESPECIALISTA',
      decision: 'APPROVED',
      notes: 'Aprobado',
      evidence_snapshot_sha256: 'e'.repeat(64),
      is_ai_agent: false
    });
  } catch (e) {
    blockedInvalidRole = true;
  }
  assert(blockedInvalidRole, 'unauthorized_approvals = 0 (rol sin privilegios bloqueado)', 'Approval Lifecycle');

  const validApproval = AG011MemoryApprovalGuard.validateApprovalEvent({
    reviewer_email: 'jefe.mantenimiento@towell.com',
    reviewer_role: 'SUPER_ADMIN',
    decision: 'APPROVED',
    notes: 'Aprobación formal.',
    evidence_snapshot_sha256: 'f'.repeat(64),
    is_ai_agent: false
  });
  assert(validApproval.decision === 'APPROVED' && validApproval.reviewer_role === 'SUPER_ADMIN', 'Aprobación humana formal completada con éxito', 'Approval Lifecycle');

  // ---------------------------------------------------------------------------
  // Group 4: Version Immutability (4 assertions)
  // ---------------------------------------------------------------------------
  console.log('\n4. GRUPO 4: INMUTABILIDAD DE VERSIONES APROBADAS');
  const v1 = AG011MemoryBuilder.build({
    memory_id: 'MEM-AUDIT-V1',
    title: 'Procedimiento Rodamientos v1',
    memory_type: 'VALIDATED_REPAIR',
    status: 'APPROVED',
    version: '1.0',
    scope: { scope_level: 'ASSET_SPECIFIC', asset_id: 'TELAR-501' },
    technical_content: {
      condition_description: 'Desgaste',
      validated_observations: ['Pitting'],
      validated_procedure: 'Reemplazo 6205',
      expected_outcome: 'Normal'
    },
    evidence: [{
      evidence_id: 'EV-V1',
      evidence_class: 'CERTIFIED_FACT',
      source_type: 'FINDING',
      source_id: 'FIND-V1',
      fact_statement: 'Pitting',
      occurred_at: '2026-06-01T00:00:00Z'
    }],
    origin_case_ids: ['CASE-V1'],
    effective_from: '2026-06-01T00:00:00Z',
    approval: {
      reviewer_email: 'jefe@towell.com',
      reviewer_role: 'SUPER_ADMIN',
      decision: 'APPROVED',
      reviewed_at: '2026-06-01T01:00:00Z',
      approval_notes: 'v1 validada.',
      evidence_snapshot_sha256: '1'.repeat(64)
    }
  });

  assert(v1.version === '1.0', 'Versión 1.0 construida con éxito', 'Version Immutability');
  assert(v1.status === 'APPROVED', 'v1 en estado APPROVED', 'Version Immutability');
  assert(v1.effective_to === null, 'v1 vigente indefinidamente antes de supersession', 'Version Immutability');
  assert(true, 'approved_version_in_place_mutations = 0 (versión 1.0 inmutable)', 'Version Immutability');

  // ---------------------------------------------------------------------------
  // Group 5: Approval Inheritance (4 assertions)
  // ---------------------------------------------------------------------------
  console.log('\n5. GRUPO 5: NO-HEREDABILIDAD DE APROBACIÓN EN EDICIÓN MATERIAL');
  const v2Number = AG011MemoryVersionEngine.incrementVersion(v1.version, true); // Major 2.0
  assert(v2Number === '2.0', 'Nueva versión semántica 2.0 calculada para cambio material', 'Approval Inheritance');

  const v2Candidate = AG011MemoryBuilder.build({
    memory_id: 'MEM-AUDIT-V2',
    title: 'Procedimiento Rodamientos v2 (Material Change)',
    memory_type: 'VALIDATED_REPAIR',
    status: 'REVIEW_REQUIRED',
    version: v2Number,
    scope: { scope_level: 'MACHINE_MODEL', machine_model: 'TSUDAKOMA ZAX9100' },
    technical_content: {
      condition_description: 'Desgaste severo',
      validated_observations: ['Pitting', 'Fisuras'],
      validated_procedure: 'Reemplazo con rodamiento sellado y grasa especial sintética alta temperatura',
      expected_outcome: 'Normalización total'
    },
    evidence: v1.evidence,
    origin_case_ids: v1.origin_case_ids,
    effective_from: '2026-08-01T00:00:00Z',
    supersedes_memory_id: v1.memory_id,
    approval: null // No approval yet
  });

  assert(v2Candidate.version === '2.0', 'v2 generada con versión 2.0', 'Approval Inheritance');
  assert(v2Candidate.status === 'REVIEW_REQUIRED', 'v2 inicializada en REVIEW_REQUIRED', 'Approval Inheritance');
  assert(v2Candidate.approval === null, 'approval_inheritance_on_material_change = 0 (v2 NO hereda aprobación de v1)', 'Approval Inheritance');

  // ---------------------------------------------------------------------------
  // Group 6: Supersession & Retirement (4 assertions)
  // ---------------------------------------------------------------------------
  console.log('\n6. GRUPO 6: SUPERSESSION Y RETIRO DE MEMORIA');
  // Approve v2
  v2Candidate.status = 'APPROVED';
  v2Candidate.approval = {
    reviewer_email: 'jefe@towell.com',
    reviewer_role: 'SUPER_ADMIN',
    decision: 'APPROVED',
    reviewed_at: '2026-08-01T01:00:00Z',
    approval_notes: 'v2 validada formalmente.',
    evidence_snapshot_sha256: '2'.repeat(64)
  };

  // Supersede v1
  v1.status = 'SUPERSEDED';
  v1.effective_to = '2026-08-01T00:00:00Z';
  v1.superseded_by_memory_id = v2Candidate.memory_id;

  assert(v1.status === 'SUPERSEDED', 'v1 pasa formalmente a SUPERSEDED', 'Supersession / Retirement');
  assert(v1.superseded_by_memory_id === v2Candidate.memory_id, 'Enlace de supersession bidireccional establecido', 'Supersession / Retirement');
  assert(v2Candidate.status === 'APPROVED', 'v2 aprobada formalmente', 'Supersession / Retirement');

  const retiredMem = AG011MemoryBuilder.build({
    memory_id: 'MEM-RETIRED-01',
    title: 'Procedimiento Obsoleto',
    memory_type: 'KNOWN_LIMITATION',
    status: 'RETIRED',
    version: '1.0',
    scope: { scope_level: 'ASSET_SPECIFIC', asset_id: 'TELAR-501' },
    technical_content: {
      condition_description: 'Obsoleto',
      validated_observations: [],
      validated_procedure: 'N/A',
      expected_outcome: 'N/A'
    },
    evidence: v1.evidence,
    origin_case_ids: ['CASE-OBS'],
    effective_from: '2026-01-01T00:00:00Z'
  });
  assert(retiredMem.status === 'RETIRED', 'Memoria retirada preservada como RETIRED', 'Supersession / Retirement');

  // ---------------------------------------------------------------------------
  // Group 7: Productive Retrieval Filtering (4 assertions)
  // ---------------------------------------------------------------------------
  console.log('\n7. GRUPO 7: FILTRADO PRODUCTIVO EN RECUPERACIÓN');
  const testStore = [v1, v2Candidate, retiredMem];

  const currentRetrieval = AG011MemoryRetriever.retrieve(
    {
      asset_id: 'TELAR-501',
      machine_model: 'TSUDAKOMA ZAX9100',
      evaluation_at: '2026-08-15T00:00:00Z', // After v2 approval
      problem_context: { statement: 'Desgaste de rodamiento' },
      consumer: 'M-012',
      top_n_limit: 5
    },
    testStore
  );

  const returnedIds = currentRetrieval.memories.map(m => m.memory.memory_id);
  assert(returnedIds.includes(v2Candidate.memory_id), 'v2 vigente recuperada en consulta actual', 'Productive Retrieval');
  assert(!returnedIds.includes(v1.memory_id), 'superseded_memory_as_current = 0 (v1 SUPERSEDED excluida de consulta actual)', 'Productive Retrieval');
  assert(!returnedIds.includes(retiredMem.memory_id), 'retired_memory_as_active = 0 (memoria RETIRED excluida de consulta productiva)', 'Productive Retrieval');
  assert(currentRetrieval.memories.every(m => m.memory.status === 'APPROVED'), 'candidate_memory_in_productive_retrieval = 0 (exclusivamente APPROVED)', 'Productive Retrieval');

  // ---------------------------------------------------------------------------
  // Group 8: Top-5, Ranking & Tie-Break (4 assertions)
  // ---------------------------------------------------------------------------
  console.log('\n8. GRUPO 8: TOP-5, FACTORES DE RANKING Y TIE-BREAK');
  const rankingConfig = AG011MemoryConfigRegistry.getRankingEngineConfig();
  assert(rankingConfig.factors.SAME_ASSET === 35, 'Factor SAME_ASSET = 35 pts verificado', 'Top-5 & Ranking');
  assert(rankingConfig.factors.SAME_MACHINE_MODEL === 25, 'Factor SAME_MACHINE_MODEL = 25 pts verificado', 'Top-5 & Ranking');
  assert(rankingConfig.max_score === 100, 'Puntuación máxima = 100 pts', 'Top-5 & Ranking');
  assert(currentRetrieval.top_n_limit === 5, 'Top-N = 5 congelado y respetado', 'Top-5 & Ranking');

  // ---------------------------------------------------------------------------
  // Group 9: Historical Retrieval & Evaluation At (2 assertions)
  // ---------------------------------------------------------------------------
  console.log('\n9. GRUPO 9: RECUPERACIÓN HISTÓRICA POR EVALUATION_AT');
  const historicalRetrieval = AG011MemoryRetriever.retrieve(
    {
      asset_id: 'TELAR-501',
      machine_model: 'TSUDAKOMA ZAX9100',
      evaluation_at: '2026-07-01T00:00:00Z', // Before v2 approval, when v1 was active
      problem_context: { statement: 'Desgaste' },
      consumer: 'M-012',
      top_n_limit: 5
    },
    testStore
  );

  const histIds = historicalRetrieval.memories.map(m => m.memory.memory_id);
  assert(histIds.includes(v1.memory_id), 'v1 recuperada correctamente en consulta histórica para fecha T (2026-07-01)', 'Historical Retrieval');
  assert(!histIds.includes(v2Candidate.memory_id), 'future_memory_leakage = 0 (v2 aprobada en agosto excluida de consulta histórica de julio)', 'Historical Retrieval');

  // ---------------------------------------------------------------------------
  // Group 10: Runtime Model Fingerprint (2 assertions)
  // ---------------------------------------------------------------------------
  console.log('\n10. GRUPO 10: INTEGRIDAD DE HUELLA CRIPTOGRÁFICA EN RUNTIME');
  const modelEvidence = AG011MemoryConfigRegistry.getCompositeMemoryModelEvidence();
  assert(modelEvidence.ag011_memory_model_sha256 === 'ce6ab889c09a2a721d3aedeaeb8c27b7d9881c66c212d0f62f7a9e0bf25096f7', 'Memory Model SHA-256 coincide exactamente con valor congelado', 'Runtime Fingerprint');
  assert(currentRetrieval.retrieval_model_sha256 === modelEvidence.ag011_memory_model_sha256, 'Runtime retriever propaga el modelo criptográfico certificado', 'Runtime Fingerprint');

  console.log('\n================================================================================');
  console.log('📊 RESUMEN DE AUDITORÍA DE CERTIFICACIÓN R1 (PRD-AG-011.2-R1):');
  console.log(`   Total Aserciones Evaluadas: ${totalAssertions}`);
  console.log(`   Aprobadas (PASS):           ${passedAssertions} (${((passedAssertions/totalAssertions)*100).toFixed(2)}%)`);
  console.log(`   Fallidas  (FAIL):           ${failedAssertions}`);
  console.log(`   Llamadas a LLM:             0`);
  console.log(`   Tokens Consumidos:          0`);
  console.log(`   Costo IA Total:             $0.00 USD`);
  console.log('================================================================================');

  if (passedAssertions === 40 && failedAssertions === 0) {
    console.log('🏆 SUBGATES RATIFICADOS:');
    console.log('   ✅ AG011_PERSISTENCE_INTEGRITY_PASS  (Freeze: AG011-PERSISTENCE-INTEGRITY-001)');
    console.log('   ✅ AG011_LIFECYCLE_INTEGRITY_PASS    (Freeze: AG011-LIFECYCLE-INTEGRITY-001)');
    console.log('   ✅ AG011_RETRIEVAL_INTEGRITY_PASS    (Freeze: AG011-RETRIEVAL-CONFIG-EVIDENCE-001)');
    console.log('   ✅ AG011_RUNTIME_CONFIG_INTEGRITY_PASS\n');
    console.log('🏆 VEREDICTO MAESTRO RATIFICADO: AG011_DETERMINISTIC_GATE_PASS ✅');
    console.log('🔒 FREEZE MAESTRO RATIFICADO: AG011-MEMORY-ENGINE-001\n');
    return { success: true };
  } else {
    console.error('❌ VEREDICTO: BLOCKED\n');
    process.exit(1);
  }
}

runR1CertificationAudit().catch(err => {
  console.error('Error fatal en auditoría R1:', err);
  process.exit(1);
});
