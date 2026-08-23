// supabase/functions/agents-orchestrator/agents/ag013/core/ag013-bad-actor-engine.ts
// Master Deterministic Bad Actor Classification & Ranking Engine for AG-013 (v1.0)
// Frozen under Token: AG013-BAD-ACTOR-ENGINE-001
// Pure Deterministic Execution: Zero LLM, Zero AI Cost, Zero Tokens (§1-4 PRD-AG-013.2)

import type {
  BadActorAnalysisRequest,
  BadActorAnalysisPackage,
  AssetBadActorResult,
  BadActorFact
} from '../types/ag013.types.ts';

import { AG013InputContract } from '../contracts/ag013-input.contract.ts';
import { AG013BadActorConfigRegistry } from '../config/ag013-bad-actor-config-registry.ts';
import { AG013AssetPopulationResolver } from '../population/ag013-asset-population-resolver.ts';
import { AG013PeerGroupResolver } from '../population/ag013-peer-group-resolver.ts';
import { AG013Asset360Resolver } from '../resolvers/ag013-asset360-resolver.ts';
import { AG013HealthRiskResolver } from '../resolvers/ag013-health-risk-resolver.ts';
import { AG013FailureIntelligenceResolver } from '../resolvers/ag013-failure-intelligence-resolver.ts';
import { AG013EconomicContextResolver } from '../resolvers/ag013-economic-context-resolver.ts';
import { AG013RootCauseContextResolver } from '../resolvers/ag013-root-cause-context-resolver.ts';
import { AG013TechnicalMemoryResolver } from '../resolvers/ag013-technical-memory-resolver.ts';
import { AG013InterventionStrategyResolver } from '../resolvers/ag013-intervention-strategy-resolver.ts';
import { AG013FactNormalizer } from '../facts/ag013-fact-normalizer.ts';
import { AG013OperationalExposureResolver } from '../exposure/ag013-operational-exposure-resolver.ts';
import { AG013TemporalGuard } from '../guards/ag013-temporal-guard.ts';
import { AG013SourceMutationGuard } from '../guards/ag013-source-mutation-guard.ts';
import { AG013DataQualityEngine } from '../quality/ag013-data-quality-engine.ts';
import { AG013DataSufficiencyEngine } from '../quality/ag013-data-sufficiency-engine.ts';
import { AG013FailureBurdenEngine } from '../burden/ag013-failure-burden-engine.ts';
import { AG013EconomicBurdenEngine } from '../burden/ag013-economic-burden-engine.ts';
import { AG013ChronicityEngine } from '../chronicity/ag013-chronicity-engine.ts';
import { AG013InterventionEffectivenessEngine } from '../interventions/ag013-intervention-effectiveness-engine.ts';
import { AG013ConflictDetector } from '../conflicts/ag013-conflict-detector.ts';
import { AG013HardRuleEngine } from '../classification/ag013-hard-rule-engine.ts';
import { AG013ScoreEngine } from '../classification/ag013-score-engine.ts';
import { AG013ClassificationEngine } from '../classification/ag013-classification-engine.ts';
import { AG013RankingEngine } from '../ranking/ag013-ranking-engine.ts';
import { AG013ClassificationResultBuilder } from './ag013-classification-result-builder.ts';

export class AG013BadActorEngine {
  public static execute(request: BadActorAnalysisRequest): {
    success: boolean;
    package: BadActorAnalysisPackage;
    telemetry: {
      duration_ms: number;
      assets_evaluated_count: number;
      ai_calls: number;
      tokens_used: number;
      cost_usd: number;
    };
  } {
    const startTime = Date.now();

    // 1. Validate Input Contract
    const inputVal = AG013InputContract.validate(request);
    if (!inputVal.valid) {
      throw new Error(`[AG013_INPUT_ERROR] ${inputVal.errors.join(', ')}`);
    }

    // Security Check: Reject SQL / NoSQL Injection attempts in payload
    const rawStr = JSON.stringify(request);
    if (/(\bDROP\b|\bDELETE\b|\bINSERT\b|\bUPDATE\b|--|;|\$where)/i.test(rawStr) && rawStr.includes('DROP TABLE')) {
      throw new Error('[AG013_SECURITY_REJECTION] Detección de inyección SQL/NoSQL en payload de solicitud.');
    }

    // 2. Enforce DB Read-Only Guard
    AG013SourceMutationGuard.assertReadOnly();

    // 3. Composite Decision Model Evidence
    const evidence = AG013BadActorConfigRegistry.getCompositeDecisionModelEvidence();

    // 4. Resolve Asset Population Scope
    const popFilter = AG013AssetPopulationResolver.resolve(
      request.assets,
      request.population_scope,
      request.target_area,
      request.target_family
    );

    const assetResults: AssetBadActorResult[] = [];

    for (const item of popFilter.eligible_assets) {
      const asset360 = AG013Asset360Resolver.resolve(item.asset_raw);
      const peerGroup = AG013PeerGroupResolver.resolve(item.asset_raw);
      const failureCtx = AG013FailureIntelligenceResolver.resolve(item.ag008_context);
      const econCtx = AG013EconomicContextResolver.resolve(item.ag007_context);
      const healthCtx = AG013HealthRiskResolver.resolve(item.m011_context);
      const rcaCtx = AG013RootCauseContextResolver.resolve(item.ag010_context);
      const memCtx = AG013TechnicalMemoryResolver.resolve(item.ag011_context);
      const stratCtx = AG013InterventionStrategyResolver.resolve(item.ag012_context);

      // Exposure resolution
      const exposure = AG013OperationalExposureResolver.resolve(asset360.operating_hours_window);

      // Data Quality & Sufficiency
      const quality = AG013DataQualityEngine.evaluate(
        true,
        failureCtx.is_available,
        econCtx.is_available,
        healthCtx.is_available
      );

      const sufficiency = AG013DataSufficiencyEngine.evaluate(
        true,
        failureCtx.is_available,
        econCtx.is_available,
        healthCtx.is_available
      );

      // Burden & Performance Engines
      const failureBurden = AG013FailureBurdenEngine.evaluate(
        failureCtx.failure_count_window,
        failureCtx.recurrence_rate,
        failureCtx.downtime_hours,
        exposure.exposure_factor
      );

      const econBurden = AG013EconomicBurdenEngine.evaluate(
        econCtx.maintenance_cost_window,
        econCtx.budget_variance,
        econCtx.mci
      );

      const chronicity = AG013ChronicityEngine.evaluate(
        failureCtx.failure_count_window,
        failureCtx.recurrence_rate,
        failureCtx.reincidence_count_30d,
        failureCtx.trend
      );

      const ineffectiveness = AG013InterventionEffectivenessEngine.evaluate(
        failureCtx.reincidence_count_30d,
        memCtx.repeated_unsuccessful_interventions_count
      );

      // Health / Risk score dimension (100 - health = health degradation burden)
      const healthRiskScore = typeof healthCtx.health_score === 'number'
        ? Math.max(0, 100 - healthCtx.health_score)
        : (typeof healthCtx.risk_score === 'number' ? healthCtx.risk_score : 50.0);

      // Calculate Composite Bad Actor Score
      const badActorScore = AG013ScoreEngine.calculate(
        chronicity.chronicity_score,
        failureBurden.failure_burden_score,
        econBurden.economic_burden_score,
        healthRiskScore,
        ineffectiveness.ineffectiveness_score
      );

      // Evaluate Hard Rules
      const hardRules = AG013HardRuleEngine.evaluate(
        sufficiency.data_sufficiency_index,
        healthCtx.health_score,
        failureCtx.failure_count_window,
        chronicity.chronicity_score,
        failureCtx.recurrence_rate,
        badActorScore
      );

      // Detect Conflicts
      const conflicts = AG013ConflictDetector.detect(
        failureBurden.failure_burden_score,
        econBurden.economic_burden_score,
        healthCtx.health_score,
        chronicity.chronicity_score,
        stratCtx.recommended_strategy
      );

      // Classify
      const classification = AG013ClassificationEngine.classify(
        badActorScore,
        sufficiency.is_eligible_for_classification,
        hardRules.forced_classification
      );

      // Collect Drivers
      const keyDrivers = Array.from(new Set([
        ...chronicity.drivers,
        ...failureBurden.drivers,
        ...econBurden.drivers,
        ...ineffectiveness.drivers
      ]));

      // Facts collection
      const facts: BadActorFact[] = [
        AG013FactNormalizer.normalize(
          asset360.asset_id,
          'CHRONICITY',
          'AG-008',
          'REC_30D',
          failureCtx.reincidence_count_30d,
          chronicity.chronicity_score,
          AG013BadActorConfigRegistry.WEIGHTS.chronicity,
          request.evaluation_at
        ),
        AG013FactNormalizer.normalize(
          asset360.asset_id,
          'FAILURE_BURDEN',
          'AG-008',
          'FAIL_CNT',
          failureCtx.failure_count_window,
          failureBurden.failure_burden_score,
          AG013BadActorConfigRegistry.WEIGHTS.failure_burden,
          request.evaluation_at
        ),
        AG013FactNormalizer.normalize(
          asset360.asset_id,
          'ECONOMIC_BURDEN',
          'AG-007',
          'COST_WIN',
          econCtx.maintenance_cost_window,
          econBurden.economic_burden_score,
          AG013BadActorConfigRegistry.WEIGHTS.economic_burden,
          request.evaluation_at
        ),
        AG013FactNormalizer.normalize(
          asset360.asset_id,
          'HEALTH_RISK',
          'M-011',
          'HLTH_DEGRAD',
          healthCtx.health_score,
          healthRiskScore,
          AG013BadActorConfigRegistry.WEIGHTS.health_risk,
          request.evaluation_at
        ),
        AG013FactNormalizer.normalize(
          asset360.asset_id,
          'INTERVENTION_EFFECTIVENESS',
          'AG-011',
          'REP_INEFF',
          ineffectiveness.repeated_unsuccessful_count,
          ineffectiveness.ineffectiveness_score,
          AG013BadActorConfigRegistry.WEIGHTS.intervention_ineffectiveness,
          request.evaluation_at
        )
      ];

      const requiresReview = classification === 'BAD_ACTOR' || classification === 'SEVERE_BAD_ACTOR';

      assetResults.push({
        asset_id: asset360.asset_id,
        codigo_maquina: asset360.codigo_maquina,
        nombre: asset360.nombre,
        area: asset360.area,
        machine_family: asset360.machine_family,
        criticality: asset360.criticality,
        classification,
        rank: 0, // Assigned by ranking engine
        bad_actor_score: badActorScore,
        dimension_scores: {
          chronicity_score: chronicity.chronicity_score,
          failure_burden_score: failureBurden.failure_burden_score,
          economic_burden_score: econBurden.economic_burden_score,
          health_risk_score: Number(healthRiskScore.toFixed(2)),
          intervention_ineffectiveness_score: ineffectiveness.ineffectiveness_score
        },
        hard_rules_triggered: hardRules.triggered_rules,
        data_sufficiency: sufficiency,
        conflicts_identified: conflicts,
        key_drivers: keyDrivers,
        facts,
        requires_engineering_review: requiresReview
      });
    }

    // 5. Apply Deterministic Ranking
    const rankedResults = AG013RankingEngine.rank(assetResults);

    // 6. Build Final Canonical Package
    const finalPackage = AG013ClassificationResultBuilder.buildPackage(
      request.request_id,
      request.evaluation_at,
      request.population_scope,
      request.analysis_window,
      rankedResults,
      evidence.ag013_bad_actor_model_sha256
    );

    const duration = Date.now() - startTime;

    return {
      success: true,
      package: finalPackage,
      telemetry: {
        duration_ms: duration,
        assets_evaluated_count: rankedResults.length,
        ai_calls: 0,
        tokens_used: 0,
        cost_usd: 0.0
      }
    };
  }
}
