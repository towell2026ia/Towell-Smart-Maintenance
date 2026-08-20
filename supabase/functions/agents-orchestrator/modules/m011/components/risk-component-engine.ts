// supabase/functions/agents-orchestrator/modules/m011/components/risk-component-engine.ts
// Risk Component Engine for M-011 (v1.0)
// Frozen under Token: M011-RISK-COMPONENT-ENGINE-001
// Invariant: Calculates normalized components and weighted contributions for Risk Model (§70-76 PRD-M-011.2)

import { RISK_WEIGHTS, RISK_FEATURE_DEFINITIONS } from '../contracts/m011-risk-model.contract.ts';
import { HealthRiskFeatureNormalizer } from '../normalizers/health-risk-feature-normalizer.ts';
import type { ResolvedRawFeature } from '../features/health-risk-feature-resolver.ts';
import type { ScoreComponent, AssetCriticality } from '../types/m011.types.ts';

export class RiskComponentEngine {
  public static buildRiskComponents(
    resolvedFeatures: Record<string, ResolvedRawFeature>,
    healthScore: number | null
  ): ScoreComponent[] {
    const components: ScoreComponent[] = [];

    // 1. Health Degradation (100 - healthScore)
    const norm1 = healthScore !== null
      ? HealthRiskFeatureNormalizer.normalizeHealthDegradation(healthScore)
      : null;
    components.push({
      feature_id: 'RISK_HEALTH_DEGRADATION',
      feature_name: RISK_FEATURE_DEFINITIONS.RISK_HEALTH_DEGRADATION.feature_name,
      raw_value: healthScore !== null ? (100 - healthScore) : null,
      normalized_value: norm1,
      weight: RISK_WEIGHTS.HEALTH_DEGRADATION,
      contribution: norm1 !== null ? Math.round((norm1 * RISK_WEIGHTS.HEALTH_DEGRADATION) * 10) / 10 : null,
      data_status: norm1 !== null ? 'KNOWN' : 'NOT_AVAILABLE',
      rule_version: 'M011-RISK-COMP-1.0',
      source_references: []
    });

    // 2. Machine Criticality
    const f2 = resolvedFeatures['RISK_MACHINE_CRITICALITY'];
    const norm2 = f2?.raw_value
      ? HealthRiskFeatureNormalizer.normalizeMachineCriticality(f2.raw_value as AssetCriticality)
      : null;
    components.push({
      feature_id: 'RISK_MACHINE_CRITICALITY',
      feature_name: RISK_FEATURE_DEFINITIONS.RISK_MACHINE_CRITICALITY.feature_name,
      raw_value: f2?.raw_value ?? null,
      normalized_value: norm2,
      weight: RISK_WEIGHTS.MACHINE_CRITICALITY,
      contribution: norm2 !== null ? Math.round((norm2 * RISK_WEIGHTS.MACHINE_CRITICALITY) * 10) / 10 : null,
      data_status: f2?.data_status || 'NOT_AVAILABLE',
      rule_version: 'M011-RISK-COMP-1.0',
      source_references: f2?.source_references || []
    });

    // 3. Failure Recurrence & Trend (AG-008)
    const f3 = resolvedFeatures['RISK_FAILURE_RECURRENCE_TREND'];
    const norm3 = f3?.raw_value !== null && f3?.raw_value !== undefined
      ? HealthRiskFeatureNormalizer.normalizeFailureRecurrenceTrend(Number(f3.raw_value))
      : 0;
    components.push({
      feature_id: 'RISK_FAILURE_RECURRENCE_TREND',
      feature_name: RISK_FEATURE_DEFINITIONS.RISK_FAILURE_RECURRENCE_TREND.feature_name,
      raw_value: f3?.raw_value ?? 0,
      normalized_value: norm3,
      weight: RISK_WEIGHTS.FAILURE_RECURRENCE_TREND,
      contribution: norm3 !== null ? Math.round((norm3 * RISK_WEIGHTS.FAILURE_RECURRENCE_TREND) * 10) / 10 : null,
      data_status: f3?.data_status || 'KNOWN',
      rule_version: 'M011-RISK-COMP-1.0',
      source_references: f3?.source_references || []
    });

    // 4. Active Findings Severity
    const f4 = resolvedFeatures['RISK_ACTIVE_FINDINGS_SEVERITY'];
    const norm4 = f4?.raw_value !== null && f4?.raw_value !== undefined
      ? HealthRiskFeatureNormalizer.normalizeActiveFindingsSeverity(Number(f4.raw_value))
      : 0;
    components.push({
      feature_id: 'RISK_ACTIVE_FINDINGS_SEVERITY',
      feature_name: RISK_FEATURE_DEFINITIONS.RISK_ACTIVE_FINDINGS_SEVERITY.feature_name,
      raw_value: f4?.raw_value ?? 0,
      normalized_value: norm4,
      weight: RISK_WEIGHTS.ACTIVE_FINDINGS_SEVERITY,
      contribution: norm4 !== null ? Math.round((norm4 * RISK_WEIGHTS.ACTIVE_FINDINGS_SEVERITY) * 10) / 10 : null,
      data_status: f4?.data_status || 'KNOWN',
      rule_version: 'M011-RISK-COMP-1.0',
      source_references: f4?.source_references || []
    });

    return components;
  }
}
