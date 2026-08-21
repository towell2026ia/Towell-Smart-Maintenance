// supabase/functions/agents-orchestrator/agents/ag010/core/ag010-retrieval-engine.ts
// Master Deterministic Previous Case Retrieval & Evidence Engine for AG-010 (v1.0)
// Frozen under Token: AG010-CASE-RETRIEVAL-ENGINE-001
// Invariant: Pure deterministic calculation; 0 LLM calls, 0 tokens, $0.00 USD (§1-10 PRD-AG-010.2)

import { AG010CaseInputValidator } from './ag010-case-input-validator.ts';
import { AG010CaseResolver } from './ag010-case-resolver.ts';
import { AG010UntrustedContentGuard } from '../security/ag010-untrusted-content-guard.ts';
import { M010ContextAdapter } from '../adapters/m010-context-adapter.ts';
import { AG008FailureIntelligenceAdapter } from '../adapters/ag008-failure-intelligence-adapter.ts';
import { M011HealthRiskAdapter } from '../adapters/m011-health-risk-adapter.ts';
import { AG010EvidenceResolver } from '../evidence/ag010-evidence-resolver.ts';
import { AG010EvidenceDedupe } from '../evidence/ag010-evidence-dedupe.ts';
import { AG010PreviousCaseBuilder } from '../cases/ag010-previous-case-builder.ts';
import { AG010CaseDedupe } from '../cases/ag010-case-dedupe.ts';
import { AG010PreviousCaseRetriever } from '../retrieval/ag010-previous-case-retriever.ts';
import { AG010CaseRanker } from '../retrieval/ag010-case-ranker.ts';
import { AG010DataQualityEngine } from '../quality/ag010-data-quality-engine.ts';
import { AG010EvidencePackageBuilder } from '../evidence/ag010-evidence-package-builder.ts';
import { AG010EvidencePackageValidator } from '../validators/ag010-evidence-package-validator.ts';
import { AG010RootCauseAuthorityGuard } from '../guards/ag010-root-cause-authority-guard.ts';
import { AG010RetrievalAuditor } from '../audit/ag010-retrieval-audit.ts';
import { AG010RetrievalConfigRegistry } from '../config/ag010-retrieval-config-registry.ts';

import type {
  AG010EvidencePackage,
  AG010EvidenceItem,
  PreviousCaseMatch,
  ScoreSourceReference
} from '../types/ag010.types.ts';

export interface AG010RetrievalRequest {
  request_id?: string;
  event_id?: string | null;
  correlation_id?: string | null;
  asset_id: string;
  problem_statement: string;
  evaluation_at?: string;
  m010_context: any;
  ag008_context?: any;
  m011_context?: any;
}

export interface AG010RetrievalResponse {
  success: boolean;
  agent_id: 'AG-010';
  case_id: string;
  asset_id: string;
  evaluation_at: string;
  evidence_package: AG010EvidencePackage;
  ag010_retrieval_model_sha256: string;
  duration_ms: number;
}

export class AG010RetrievalEngine {
  public static async execute(request: AG010RetrievalRequest): Promise<AG010RetrievalResponse> {
    const startTime = Date.now();
    const requestId = request.request_id || `REQ-AG010-${Date.now()}`;

    // 1. Validate Input and Sanitize Untrusted Content
    const sanitizedScope = AG010CaseInputValidator.validate({
      asset_id: request.asset_id,
      problem_statement: request.problem_statement,
      evaluation_at: request.evaluation_at
    });
    const { sanitizedText } = AG010UntrustedContentGuard.sanitizeAndFlag(sanitizedScope.problem_description);

    // 2. Resolve Case Scope and Unique Case ID
    const caseScope = AG010CaseResolver.resolveCase({
      ...sanitizedScope,
      problem_description: sanitizedText
    });

    // 3. Adapt Context from Certified Providers
    const m010Adapted = M010ContextAdapter.adapt(request.m010_context);
    const ag008Signals = AG008FailureIntelligenceAdapter.extractSignals(
      caseScope.asset_id,
      request.ag008_context,
      caseScope.evaluation_at
    );
    const m011Signals = M011HealthRiskAdapter.extractSignals(
      caseScope.asset_id,
      request.m011_context,
      caseScope.evaluation_at
    );

    // 4. Resolve and Deduplicate Current Evidence Items
    const rawEvidence = AG010EvidenceResolver.resolveAllEvidence(m010Adapted, caseScope.evaluation_at);
    const allDerivedSignals = [...ag008Signals, ...m011Signals, ...rawEvidence.derivedSignals];

    const certifiedFacts = AG010EvidenceDedupe.deduplicate([...rawEvidence.certifiedFacts, ...allDerivedSignals]);
    const operatorStatements = AG010EvidenceDedupe.deduplicate(rawEvidence.operatorStatements);

    // 5. Build and Deduplicate Previous Cases
    const rawPreviousCases = AG010PreviousCaseBuilder.buildPreviousCasesFromContext(
      m010Adapted,
      caseScope.evaluation_at
    );
    const deduplicatedCases = AG010CaseDedupe.deduplicateCases(rawPreviousCases);

    // 6. Retrieve and Rank Top-5 Previous Cases Deterministically
    const candidateCases = AG010PreviousCaseRetriever.retrieveCandidateCases(
      deduplicatedCases,
      caseScope.asset_id,
      caseScope.evaluation_at
    );
    const rankedMatches: PreviousCaseMatch[] = AG010CaseRanker.rankAndFilter(
      caseScope.asset_id,
      caseScope.problem_description,
      candidateCases,
      caseScope.evaluation_at
    );

    // 7. Evaluate Data Quality and Contradictions
    const qualityResult = AG010DataQualityEngine.evaluateQuality(
      caseScope.asset_id,
      caseScope.problem_description,
      certifiedFacts,
      operatorStatements
    );

    // 8. Build Certified Evidence Package
    const sourceRefs: ScoreSourceReference[] = m010Adapted.source_references || [];
    const evidencePackage = AG010EvidencePackageBuilder.buildPackage({
      caseId: caseScope.case_id,
      assetId: caseScope.asset_id,
      evaluationAt: caseScope.evaluation_at,
      problemStatement: caseScope.problem_description,
      certifiedFacts,
      operatorStatements,
      previousCases: rankedMatches,
      dataQuality: qualityResult.state,
      sourceReferences: sourceRefs
    });

    // 9. Validate Package & Assert Invariants
    AG010EvidencePackageValidator.validate(evidencePackage);
    AG010RootCauseAuthorityGuard.assertDeterministicPhaseOutputs(evidencePackage);

    const compositeModel = AG010RetrievalConfigRegistry.getCompositeModelEvidence();
    const durationMs = Date.now() - startTime;

    // 10. Record Technical Execution Audit
    AG010RetrievalAuditor.recordAudit({
      request_id: requestId,
      event_id: request.event_id || null,
      correlation_id: request.correlation_id || null,
      agent_id: 'AG-010',
      case_id: caseScope.case_id,
      asset_id: caseScope.asset_id,
      evaluation_at: caseScope.evaluation_at,
      evidence_count: certifiedFacts.length + operatorStatements.length,
      fact_count: certifiedFacts.length,
      statement_count: operatorStatements.length,
      derived_signal_count: allDerivedSignals.length,
      previous_case_candidates: candidateCases.length,
      previous_case_returned: rankedMatches.length,
      data_quality: qualityResult.state,
      retrieval_model_sha256: compositeModel.ag010_retrieval_model_sha256,
      provider: 'NONE',
      model: 'NONE',
      tokens: 0,
      cost: 0,
      duration_ms: durationMs,
      status: qualityResult.state === 'INSUFFICIENT' ? 'INSUFFICIENT_DATA' : 'SUCCESS',
      created_at: new Date().toISOString()
    });

    return {
      success: true,
      agent_id: 'AG-010',
      case_id: caseScope.case_id,
      asset_id: caseScope.asset_id,
      evaluation_at: caseScope.evaluation_at,
      evidence_package: evidencePackage,
      ag010_retrieval_model_sha256: compositeModel.ag010_retrieval_model_sha256,
      duration_ms: durationMs
    };
  }
}
