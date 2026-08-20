// supabase/functions/agents-orchestrator/modules/m011/contracts/m011-health-model.contract.ts
// Asset Health Scoring Model, Weights & Thresholds Contract (v1.0)
// Frozen under Tokens:
// - M011-HEALTH-MODEL-001
// - M011-HEALTH-FORMULA-001
// - M011-HEALTH-WEIGHTS-001
// - M011-HEALTH-THRESHOLDS-001
// Invariant: Scale 0 to 100; Higher = Better Health; Zero arbitrary weights (§18-24 PRD-M-011.1)

import type { HealthFeatureDefinition, HealthState, ScoreComponent } from '../types/m011.types.ts';
import type { M011AssetInputContext } from './m011-asset-input.contract.ts';

export const HEALTH_MODEL_VERSION = 'M011-HEALTH-1.0';

export const HEALTH_WEIGHTS = {
  FAILURE_FREQUENCY: 0.30,
  MAINTENANCE_COMPLIANCE: 0.30,
  PHYSICAL_FINDINGS: 0.20,
  DOWNTIME_IMPACT: 0.20
} as const;

export const HEALTH_FEATURE_DEFINITIONS: Record<string, HealthFeatureDefinition> = {
  HEALTH_FAILURE_FREQUENCY: {
    feature_id: 'HEALTH_FAILURE_FREQUENCY',
    feature_name: 'Frecuencia de Fallas Operativas (90d)',
    domain: 'FAILURES',
    usage: 'HEALTH_ONLY',
    time_window: '90_DAYS',
    raw_unit: 'fallas',
    direction: 'LOWER_IS_BETTER',
    weight: HEALTH_WEIGHTS.FAILURE_FREQUENCY,
    missing_policy: 'NOT_AVAILABLE'
  },
  HEALTH_MAINTENANCE_COMPLIANCE: {
    feature_id: 'HEALTH_MAINTENANCE_COMPLIANCE',
    feature_name: 'Cumplimiento de Mantenimiento Preventivo y Autónomo',
    domain: 'MAINTENANCE',
    usage: 'HEALTH_ONLY',
    time_window: 'CURRENT_YEAR',
    raw_unit: 'ratio (0-1.0)',
    direction: 'HIGHER_IS_BETTER',
    weight: HEALTH_WEIGHTS.MAINTENANCE_COMPLIANCE,
    missing_policy: 'NOT_AVAILABLE'
  },
  HEALTH_PHYSICAL_FINDINGS: {
    feature_id: 'HEALTH_PHYSICAL_FINDINGS',
    feature_name: 'Impacto de Hallazgos Físicos Activos',
    domain: 'FINDINGS',
    usage: 'HEALTH_ONLY',
    time_window: '90_DAYS',
    raw_unit: 'puntos de penalización',
    direction: 'LOWER_IS_BETTER',
    weight: HEALTH_WEIGHTS.PHYSICAL_FINDINGS,
    missing_policy: 'KNOWN'
  },
  HEALTH_DOWNTIME_IMPACT: {
    feature_id: 'HEALTH_DOWNTIME_IMPACT',
    feature_name: 'Impacto de Paros Operacionales (90d)',
    domain: 'DOWNTIME',
    usage: 'HEALTH_ONLY',
    time_window: '90_DAYS',
    raw_unit: 'minutos',
    direction: 'LOWER_IS_BETTER',
    weight: HEALTH_WEIGHTS.DOWNTIME_IMPACT,
    missing_policy: 'KNOWN'
  }
};

export function classifyHealthState(score: number | null, isSufficient: boolean): HealthState {
  if (!isSufficient || score === null) {
    return 'INSUFFICIENT_DATA';
  }
  if (score >= 85) return 'HEALTHY';
  if (score >= 65) return 'WATCH';
  if (score >= 40) return 'DEGRADED';
  return 'CRITICAL';
}

export function computeHealthScore(components: ScoreComponent[]): number | null {
  const activeComponents = components.filter(c => c.normalized_value !== null && c.data_status === 'KNOWN');
  if (activeComponents.length === 0) return null;

  const totalActiveWeight = activeComponents.reduce((sum, c) => sum + c.weight, 0);
  if (totalActiveWeight < 0.60) {
    // If less than 60% of required weight is available, score is insufficient
    return null;
  }

  const rawSum = activeComponents.reduce((sum, c) => sum + (c.normalized_value! * c.weight), 0);
  const reweightedScore = rawSum / totalActiveWeight;

  // Round to 1 decimal place deterministically
  return Math.round(reweightedScore * 10) / 10;
}
