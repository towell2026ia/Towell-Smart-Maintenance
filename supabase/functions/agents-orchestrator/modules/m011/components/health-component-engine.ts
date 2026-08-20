// supabase/functions/agents-orchestrator/modules/m011/components/health-component-engine.ts
// Health Component Engine for M-011 (v1.0)
// Frozen under Token: M011-HEALTH-COMPONENT-ENGINE-001
// Invariant: Calculates normalized components and weighted contributions for Health Model (§56-62 PRD-M-011.2)

import { HEALTH_WEIGHTS, HEALTH_FEATURE_DEFINITIONS } from '../contracts/m011-health-model.contract.ts';
import { HealthRiskFeatureNormalizer } from '../normalizers/health-risk-feature-normalizer.ts';
import type { ResolvedRawFeature } from '../features/health-risk-feature-resolver.ts';
import type { ScoreComponent } from '../types/m011.types.ts';

export class HealthComponentEngine {
  public static buildHealthComponents(resolvedFeatures: Record<string, ResolvedRawFeature>): ScoreComponent[] {
    const components: ScoreComponent[] = [];

    // 1. Failure Frequency
    const f1 = resolvedFeatures['HEALTH_FAILURE_FREQUENCY'];
    const norm1 = f1?.raw_value !== null && f1?.raw_value !== undefined
      ? HealthRiskFeatureNormalizer.normalizeFailureFrequency(Number(f1.raw_value))
      : null;
    components.push({
      feature_id: 'HEALTH_FAILURE_FREQUENCY',
      feature_name: HEALTH_FEATURE_DEFINITIONS.HEALTH_FAILURE_FREQUENCY.feature_name,
      raw_value: f1?.raw_value ?? null,
      normalized_value: norm1,
      weight: HEALTH_WEIGHTS.FAILURE_FREQUENCY,
      contribution: norm1 !== null ? Math.round((norm1 * HEALTH_WEIGHTS.FAILURE_FREQUENCY) * 10) / 10 : null,
      data_status: f1?.data_status || 'NOT_AVAILABLE',
      rule_version: 'M011-HEALTH-COMP-1.0',
      source_references: f1?.source_references || []
    });

    // 2. Maintenance Compliance
    const f2 = resolvedFeatures['HEALTH_MAINTENANCE_COMPLIANCE'];
    const norm2 = f2?.raw_value !== null && f2?.raw_value !== undefined
      ? HealthRiskFeatureNormalizer.normalizeMaintenanceCompliance(Number(f2.raw_value))
      : null;
    components.push({
      feature_id: 'HEALTH_MAINTENANCE_COMPLIANCE',
      feature_name: HEALTH_FEATURE_DEFINITIONS.HEALTH_MAINTENANCE_COMPLIANCE.feature_name,
      raw_value: f2?.raw_value ?? null,
      normalized_value: norm2,
      weight: HEALTH_WEIGHTS.MAINTENANCE_COMPLIANCE,
      contribution: norm2 !== null ? Math.round((norm2 * HEALTH_WEIGHTS.MAINTENANCE_COMPLIANCE) * 10) / 10 : null,
      data_status: f2?.data_status || 'NOT_AVAILABLE',
      rule_version: 'M011-HEALTH-COMP-1.0',
      source_references: f2?.source_references || []
    });

    // 3. Physical Findings
    const f3 = resolvedFeatures['HEALTH_PHYSICAL_FINDINGS'];
    const norm3 = f3?.raw_value !== null && f3?.raw_value !== undefined
      ? HealthRiskFeatureNormalizer.normalizePhysicalFindings(Number(f3.raw_value))
      : 100;
    components.push({
      feature_id: 'HEALTH_PHYSICAL_FINDINGS',
      feature_name: HEALTH_FEATURE_DEFINITIONS.HEALTH_PHYSICAL_FINDINGS.feature_name,
      raw_value: f3?.raw_value ?? 0,
      normalized_value: norm3,
      weight: HEALTH_WEIGHTS.PHYSICAL_FINDINGS,
      contribution: norm3 !== null ? Math.round((norm3 * HEALTH_WEIGHTS.PHYSICAL_FINDINGS) * 10) / 10 : null,
      data_status: f3?.data_status || 'KNOWN',
      rule_version: 'M011-HEALTH-COMP-1.0',
      source_references: f3?.source_references || []
    });

    // 4. Downtime Impact
    const f4 = resolvedFeatures['HEALTH_DOWNTIME_IMPACT'];
    const norm4 = f4?.raw_value !== null && f4?.raw_value !== undefined
      ? HealthRiskFeatureNormalizer.normalizeDowntimeImpact(Number(f4.raw_value))
      : 100;
    components.push({
      feature_id: 'HEALTH_DOWNTIME_IMPACT',
      feature_name: HEALTH_FEATURE_DEFINITIONS.HEALTH_DOWNTIME_IMPACT.feature_name,
      raw_value: f4?.raw_value ?? 0,
      normalized_value: norm4,
      weight: HEALTH_WEIGHTS.DOWNTIME_IMPACT,
      contribution: norm4 !== null ? Math.round((norm4 * HEALTH_WEIGHTS.DOWNTIME_IMPACT) * 10) / 10 : null,
      data_status: f4?.data_status || 'KNOWN',
      rule_version: 'M011-HEALTH-COMP-1.0',
      source_references: f4?.source_references || []
    });

    return components;
  }
}
