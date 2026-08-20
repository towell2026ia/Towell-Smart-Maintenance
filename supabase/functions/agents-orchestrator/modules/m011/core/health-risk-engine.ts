// supabase/functions/agents-orchestrator/modules/m011/core/health-risk-engine.ts
// Master Deterministic Asset Health & Risk Engine for M-011 (v1.0)
// Frozen under Token: M011-HEALTH-RISK-ENGINE-001
// Invariant: Pure deterministic calculation; zero LLM calls, zero tokens, $0.00 USD (§1-8 PRD-M-011.2)

import { HealthRiskScoreGuard } from '../guards/health-risk-score-guard.ts';
import { HealthRiskFeatureResolver } from '../features/health-risk-feature-resolver.ts';
import { DataSufficiencyEngine } from '../quality/data-sufficiency-engine.ts';
import { HealthComponentEngine } from '../components/health-component-engine.ts';
import { RiskComponentEngine } from '../components/risk-component-engine.ts';
import { HealthScoreAggregator } from '../scoring/health-score-aggregator.ts';
import { RiskScoreAggregator } from '../scoring/risk-score-aggregator.ts';
import { HealthRiskResultBuilder } from './health-risk-result-builder.ts';
import { HealthRiskEvidenceBuilder } from '../evidence/health-risk-evidence-builder.ts';
import { computeHealthRiskFingerprint } from '../freshness/health-risk-freshness-resolver.ts';
import { HealthRiskAuditor } from '../audit/health-risk-calculation-audit.ts';
import { HEALTH_MODEL_VERSION } from '../contracts/m011-health-model.contract.ts';
import { RISK_MODEL_VERSION } from '../contracts/m011-risk-model.contract.ts';
import type { M011AssetInputContext } from '../contracts/m011-asset-input.contract.ts';
import type {
  HealthResult,
  RiskResult,
  AssetHealthAndRiskSummary,
  AssetCriticality
} from '../types/m011.types.ts';

export interface HealthRiskEvaluationRequest {
  request_id?: string;
  event_id?: string | null;
  correlation_id?: string | null;
  context: M011AssetInputContext;
  evaluation_at?: string;
}

export interface HealthRiskEvaluationResponse {
  success: boolean;
  asset_id: string;
  evaluation_at: string;
  health: HealthResult;
  risk: RiskResult;
  summary: AssetHealthAndRiskSummary;
  evidence: {
    health_evidence: any;
    risk_evidence: any;
  };
  calculation_fingerprint: string;
  duration_ms: number;
}

export class HealthRiskEngine {
  public static async evaluateAssetHealthAndRisk(
    request: HealthRiskEvaluationRequest
  ): Promise<HealthRiskEvaluationResponse> {
    const startTime = Date.now();
    const requestId = request.request_id || `REQ-M011-${Date.now()}`;
    const evaluationAt = request.evaluation_at || new Date().toISOString();
    const context = request.context;

    // 1. Guard against client payload tampering
    HealthRiskScoreGuard.assertNoClientOverrides(context as any);

    const assetId = context.asset_id;
    const criticality: AssetCriticality = context.identity?.criticidad || 'MEDIA';

    // 2. Resolve Raw Features
    const resolvedFeatures = HealthRiskFeatureResolver.resolveAllFeatures(context, evaluationAt);

    // 3. Evaluate Data Sufficiency
    const healthSufficiency = DataSufficiencyEngine.evaluateHealthSufficiency(context);
    const riskSufficiency = DataSufficiencyEngine.evaluateRiskSufficiency(context);

    // 4. Build Health Components and Aggregate Health Score
    const healthComponents = HealthComponentEngine.buildHealthComponents(resolvedFeatures);
    const healthScore = HealthScoreAggregator.aggregateHealthScore(healthComponents, healthSufficiency.is_sufficient);

    // 5. Build Risk Components and Aggregate Risk Score
    const riskComponents = RiskComponentEngine.buildRiskComponents(resolvedFeatures, healthScore);
    const riskScore = RiskScoreAggregator.aggregateRiskScore(riskComponents, riskSufficiency.is_sufficient);

    // 6. Build Results & Summary
    const results = HealthRiskResultBuilder.buildResults({
      assetId,
      evaluationAt,
      criticality,
      healthScore,
      riskScore,
      healthComponents,
      riskComponents,
      healthSufficiency,
      riskSufficiency,
      sourceReferences: context.source_references || []
    });

    // 7. Build Explainability Evidence
    const healthEvidence = HealthRiskEvidenceBuilder.buildEvidence('HEALTH', healthScore, healthComponents);
    const riskEvidence = HealthRiskEvidenceBuilder.buildEvidence('RISK', riskScore, riskComponents);

    // 8. Compute Calculation Fingerprint
    const fingerprint = computeHealthRiskFingerprint({
      assetId,
      evaluationAt,
      healthScore,
      riskScore,
      healthModelVersion: HEALTH_MODEL_VERSION,
      riskModelVersion: RISK_MODEL_VERSION
    });

    const durationMs = Date.now() - startTime;

    // 9. Technical Audit Logging
    HealthRiskAuditor.recordAudit({
      request_id: requestId,
      event_id: request.event_id || null,
      correlation_id: request.correlation_id || null,
      module_id: 'M-011',
      asset_id: assetId,
      evaluation_at: evaluationAt,
      health_model_version: HEALTH_MODEL_VERSION,
      risk_model_version: RISK_MODEL_VERSION,
      health_score: healthScore,
      health_state: results.health.health_state,
      risk_score: riskScore,
      risk_state: results.risk.risk_state,
      health_sufficient: healthSufficiency.is_sufficient,
      risk_sufficient: riskSufficiency.is_sufficient,
      duration_ms: durationMs,
      status: (healthSufficiency.is_sufficient && riskSufficiency.is_sufficient) ? 'SUCCESS' : 'INSUFFICIENT_DATA',
      created_at: new Date().toISOString()
    });

    return {
      success: true,
      asset_id: assetId,
      evaluation_at: evaluationAt,
      health: results.health,
      risk: results.risk,
      summary: results.summary,
      evidence: {
        health_evidence: healthEvidence,
        risk_evidence: riskEvidence
      },
      calculation_fingerprint: fingerprint,
      duration_ms: durationMs
    };
  }
}
