// supabase/functions/agents-orchestrator/modules/m011/features/health-risk-feature-resolver.ts
// Health & Risk Raw Feature Resolver for M-011 (v1.0)
// Frozen under Token: M011-FEATURE-RESOLVER-RULES-001
// Invariant: Maps context strictly to closed catalog M011-FEATURE-CATALOG-001 (§15-26 PRD-M-011.2)

import type { DataQualityState, ScoreSourceReference } from '../types/m011.types.ts';
import type { M011AssetInputContext } from '../contracts/m011-asset-input.contract.ts';
import { resolveFeatureTimeWindow, type ResolvedTimeWindow } from './feature-window-resolver.ts';

export interface ResolvedRawFeature {
  feature_id: string;
  raw_value: number | string | null;
  data_status: DataQualityState;
  time_window: ResolvedTimeWindow;
  source_references: ScoreSourceReference[];
}

export class HealthRiskFeatureResolver {
  public static resolveAllFeatures(
    context: M011AssetInputContext,
    evaluationAt: string
  ): Record<string, ResolvedRawFeature> {
    const features: Record<string, ResolvedRawFeature> = {};

    // 1. HEALTH_FAILURE_FREQUENCY (90d)
    const win90 = resolveFeatureTimeWindow('90_DAYS', evaluationAt);
    const failVal = context.failure_metrics?.total_failures_90d !== undefined
      ? context.failure_metrics.total_failures_90d
      : null;
    features['HEALTH_FAILURE_FREQUENCY'] = {
      feature_id: 'HEALTH_FAILURE_FREQUENCY',
      raw_value: failVal,
      data_status: failVal !== null ? 'KNOWN' : 'NOT_AVAILABLE',
      time_window: win90,
      source_references: context.source_references?.filter(s => s.source_name.includes('fallas') || s.source_name.includes('ordenes')) || []
    };

    // 2. HEALTH_MAINTENANCE_COMPLIANCE (YTD)
    const winYtd = resolveFeatureTimeWindow('CURRENT_YEAR', evaluationAt);
    const prevRate = context.maintenance_history?.preventive_compliance_rate ?? null;
    const autoRate = context.maintenance_history?.autonomous_compliance_rate ?? null;
    let combinedCompliance: number | null = null;

    if (prevRate !== null && autoRate !== null) {
      combinedCompliance = (prevRate * 0.70) + (autoRate * 0.30);
    } else if (prevRate !== null) {
      combinedCompliance = prevRate;
    }

    features['HEALTH_MAINTENANCE_COMPLIANCE'] = {
      feature_id: 'HEALTH_MAINTENANCE_COMPLIANCE',
      raw_value: combinedCompliance,
      data_status: combinedCompliance !== null ? 'KNOWN' : 'NOT_AVAILABLE',
      time_window: winYtd,
      source_references: context.source_references?.filter(s => s.source_name.includes('calendario')) || []
    };

    // 3. HEALTH_PHYSICAL_FINDINGS (90d)
    const critFind = context.findings?.active_critical_findings_count || 0;
    const modFind = context.findings?.active_moderate_findings_count || 0;
    const mildFind = context.findings?.active_mild_findings_count || 0;
    const totalFindingPenalty = (critFind * 40) + (modFind * 15) + (mildFind * 5);

    features['HEALTH_PHYSICAL_FINDINGS'] = {
      feature_id: 'HEALTH_PHYSICAL_FINDINGS',
      raw_value: totalFindingPenalty,
      data_status: context.findings ? 'KNOWN' : 'KNOWN', // 0 penalty if none
      time_window: win90,
      source_references: context.source_references?.filter(s => s.source_name.includes('hallazgos') || s.source_name.includes('levantamientos')) || []
    };

    // 4. HEALTH_DOWNTIME_IMPACT (90d)
    const dtMinutes = context.downtime_history?.total_downtime_minutes_90d !== undefined
      ? context.downtime_history.total_downtime_minutes_90d
      : null;

    features['HEALTH_DOWNTIME_IMPACT'] = {
      feature_id: 'HEALTH_DOWNTIME_IMPACT',
      raw_value: dtMinutes,
      data_status: dtMinutes !== null ? 'KNOWN' : 'KNOWN',
      time_window: win90,
      source_references: context.source_references?.filter(s => s.source_name.includes('downtime') || s.source_name.includes('paros')) || []
    };

    // 5. RISK_MACHINE_CRITICALITY (Lifetime)
    const winLife = resolveFeatureTimeWindow('LIFETIME', evaluationAt);
    const crit = context.identity?.criticidad || null;
    features['RISK_MACHINE_CRITICALITY'] = {
      feature_id: 'RISK_MACHINE_CRITICALITY',
      raw_value: crit,
      data_status: crit ? 'KNOWN' : 'NOT_AVAILABLE',
      time_window: winLife,
      source_references: context.source_references?.filter(s => s.source_name.includes('maquinas')) || []
    };

    // 6. RISK_FAILURE_RECURRENCE_TREND (90d)
    const recScore = context.failure_metrics?.failure_recurrence_score || 0;
    const trend = context.failure_metrics?.failure_trend || 'STABLE';
    const trendAdd = trend === 'UP' ? 20 : (trend === 'DOWN' ? -10 : 0);
    const combinedRecTrend = Math.min(Math.max(recScore + trendAdd, 0), 100);

    features['RISK_FAILURE_RECURRENCE_TREND'] = {
      feature_id: 'RISK_FAILURE_RECURRENCE_TREND',
      raw_value: combinedRecTrend,
      data_status: 'KNOWN',
      time_window: win90,
      source_references: context.source_references?.filter(s => s.source_name.includes('AG-008') || s.source_name.includes('alertas')) || []
    };

    // 7. RISK_ACTIVE_FINDINGS_SEVERITY (90d)
    const riskFindingSeverity = Math.min((critFind * 50) + (modFind * 20) + (mildFind * 5), 100);
    features['RISK_ACTIVE_FINDINGS_SEVERITY'] = {
      feature_id: 'RISK_ACTIVE_FINDINGS_SEVERITY',
      raw_value: riskFindingSeverity,
      data_status: 'KNOWN',
      time_window: win90,
      source_references: context.source_references?.filter(s => s.source_name.includes('hallazgos')) || []
    };

    return features;
  }
}
