// supabase/functions/agents-orchestrator/agents/ag012/core/ag012-decision-engine.ts
// Central Deterministic Intervention Decision Engine for AG-012 (v1.0)
// Frozen under Token: AG012-DECISION-ENGINE-001

import type { AG012ExecutionRequest, AG012ExecutionResponse } from '../types/ag012.types.ts';
import { AG012InputValidator } from '../validators/ag012-input-validator.ts';
import { AG012AssetResolver } from '../resolvers/ag012-asset-resolver.ts';
import { AG012Asset360Resolver } from '../resolvers/ag012-asset360-resolver.ts';
import { AG012HealthRiskResolver } from '../resolvers/ag012-health-risk-resolver.ts';
import { AG012FailureIntelligenceResolver } from '../resolvers/ag012-failure-intelligence-resolver.ts';
import { AG012RootCauseContextResolver } from '../resolvers/ag012-root-cause-context-resolver.ts';
import { AG012TechnicalMemoryResolver } from '../resolvers/ag012-technical-memory-resolver.ts';
import { AG012EconomicContextResolver } from '../resolvers/ag012-economic-context-resolver.ts';
import { AG012DecisionFactNormalizer } from '../facts/ag012-decision-fact-normalizer.ts';
import { AG012DataQualityEngine } from '../quality/ag012-data-quality-engine.ts';
import { AG012TechnicalFactorEngine } from '../factors/ag012-technical-factor-engine.ts';
import { AG012ReliabilityFactorEngine } from '../factors/ag012-reliability-factor-engine.ts';
import { AG012EconomicFactorEngine } from '../factors/ag012-economic-factor-engine.ts';
import { AG012MaintainabilityEngine } from '../factors/ag012-maintainability-engine.ts';
import { AG012ObsolescenceEngine } from '../factors/ag012-obsolescence-engine.ts';
import { AG012HardRuleEngine } from '../decision/ag012-hard-rule-engine.ts';
import { AG012ScoreEngine } from '../decision/ag012-score-engine.ts';
import { AG012DecisionMatrix } from '../decision/ag012-decision-matrix.ts';
import { AG012RecommendationBuilder } from './ag012-recommendation-builder.ts';
import { AG012TraceabilityValidator } from '../validators/ag012-traceability-validator.ts';
import { AG012OutputValidator } from '../validators/ag012-output-validator.ts';
import { AG012DecisionAudit } from '../audit/ag012-decision-audit.ts';
import { AG012DecisionConfigRegistry } from '../config/ag012-decision-config-registry.ts';

export class AG012DecisionEngine {
  public static execute(request: AG012ExecutionRequest): AG012ExecutionResponse {
    const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();

    // 1. Input Validation
    AG012InputValidator.validate(request);

    const evaluationAt = request.evaluation_at || new Date().toISOString();
    const decisionContext = request.decision_context || 'LIFECYCLE_REVIEW';

    // 2. Asset & Context Resolution
    const asset = AG012AssetResolver.resolve(request.asset_id, request.asset_raw);
    const asset360 = AG012Asset360Resolver.resolve(request.m010_context);
    const healthRisk = AG012HealthRiskResolver.resolve(request.m011_context);
    const failureIntel = AG012FailureIntelligenceResolver.resolve(request.ag008_context);
    const rca = AG012RootCauseContextResolver.resolve(request.ag010_context);
    const memory = AG012TechnicalMemoryResolver.resolve(request.ag011_context);
    const economic = AG012EconomicContextResolver.resolve(request.ag007_context);

    // 3. Normalize Facts
    const facts = AG012DecisionFactNormalizer.normalize(
      asset.id,
      evaluationAt,
      asset,
      healthRisk,
      failureIntel,
      rca,
      memory,
      economic
    );

    // 4. Data Quality & Sufficiency
    const dataQuality = AG012DataQualityEngine.evaluate(facts);

    // 5. Multi-Criteria Dimension Calculations
    const technical = AG012TechnicalFactorEngine.calculateScore(rca, memory, asset);
    const reliability = AG012ReliabilityFactorEngine.calculateScore(healthRisk, failureIntel);
    const economicRes = AG012EconomicFactorEngine.calculateScore(economic);
    const maintainability = AG012MaintainabilityEngine.calculateScore(failureIntel, memory);
    const obsolescence = AG012ObsolescenceEngine.calculateScore(asset, request.asset_raw);

    // 6. Hard Rules Evaluation (Pre-Gates)
    const hardRuleRes = AG012HardRuleEngine.evaluate(
      dataQuality,
      healthRisk.health_score,
      failureIntel.failure_count_12m,
      economicRes.mci,
      obsolescence.is_critical_obsolescence,
      economic,
      request.asset_raw
    );

    // 7. Decision Scores
    const scores = AG012ScoreEngine.calculateScores(
      reliability.reliability_score,
      economicRes.economic_sustainability_score,
      technical.technical_repairability_score,
      maintainability.maintainability_score,
      obsolescence.obsolescence_score
    );

    // 8. Decision Matrix
    const matrixRes = AG012DecisionMatrix.resolveRecommendation(
      scores,
      hardRuleRes.hard_rules,
      hardRuleRes.forced_recommendation
    );

    const configEvidence = AG012DecisionConfigRegistry.getCompositeDecisionModelEvidence();

    // 9. Recommendation Package Building
    const pkg = AG012RecommendationBuilder.build(
      asset.id,
      evaluationAt,
      decisionContext,
      matrixRes.recommendation,
      scores,
      hardRuleRes.hard_rules,
      dataQuality,
      facts,
      dataQuality.missing_critical_fields,
      configEvidence.ag012_decision_model_sha256
    );

    // 10. Traceability Validation
    AG012TraceabilityValidator.validate(pkg);

    const t1 = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const durationMs = Number((t1 - t0).toFixed(3));

    const response: AG012ExecutionResponse = {
      success: true,
      agent_id: 'AG-012',
      version: '1.0',
      asset_id: asset.id,
      evaluation_at: evaluationAt,
      package: pkg,
      telemetry: {
        duration_ms: durationMs,
        llm_calls: 0,
        tokens: 0,
        cost_usd: 0,
        provider: 'NONE'
      }
    };

    // 11. Output Validation
    AG012OutputValidator.validate(response);

    // 12. Audit Logging
    AG012DecisionAudit.logExecution(pkg, durationMs, request.request_id);

    return response;
  }
}
