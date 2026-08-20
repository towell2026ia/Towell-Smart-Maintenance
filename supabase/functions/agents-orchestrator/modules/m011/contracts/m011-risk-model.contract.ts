// supabase/functions/agents-orchestrator/modules/m011/contracts/m011-risk-model.contract.ts
// Asset Operational Risk Scoring Model, Weights & Thresholds Contract (v1.0)
// Frozen under Tokens:
// - M011-RISK-MODEL-001
// - M011-RISK-FORMULA-001
// - M011-RISK-WEIGHTS-001
// - M011-RISK-THRESHOLDS-001
// Invariant: Scale 0 to 100; Higher = Higher Operational Exposure/Risk (§19-27 PRD-M-011.1)

import type { RiskFeatureDefinition, RiskState, ScoreComponent, AssetCriticality } from '../types/m011.types.ts';

export const RISK_MODEL_VERSION = 'M011-RISK-1.0';

export const RISK_WEIGHTS = {
  HEALTH_DEGRADATION: 0.35,
  MACHINE_CRITICALITY: 0.25,
  FAILURE_RECURRENCE_TREND: 0.20,
  ACTIVE_FINDINGS_SEVERITY: 0.20
} as const;

export const RISK_FEATURE_DEFINITIONS: Record<string, RiskFeatureDefinition> = {
  RISK_HEALTH_DEGRADATION: {
    feature_id: 'RISK_HEALTH_DEGRADATION',
    feature_name: 'Nivel de Degradación de Salud (100 - Health)',
    domain: 'FAILURES',
    usage: 'RISK_ONLY',
    time_window: '90_DAYS',
    raw_unit: 'puntos de degradación',
    direction: 'HIGHER_IS_WORSE',
    weight: RISK_WEIGHTS.HEALTH_DEGRADATION,
    missing_policy: 'NOT_AVAILABLE'
  },
  RISK_MACHINE_CRITICALITY: {
    feature_id: 'RISK_MACHINE_CRITICALITY',
    feature_name: 'Criticidad Operacional del Activo',
    domain: 'CRITICALITY',
    usage: 'RISK_ONLY',
    time_window: 'LIFETIME',
    raw_unit: 'nivel de criticidad',
    direction: 'HIGHER_IS_WORSE',
    weight: RISK_WEIGHTS.MACHINE_CRITICALITY,
    missing_policy: 'KNOWN'
  },
  RISK_FAILURE_RECURRENCE_TREND: {
    feature_id: 'RISK_FAILURE_RECURRENCE_TREND',
    feature_name: 'Recurrencia y Tendencia de Fallas (AG-008)',
    domain: 'FAILURES',
    usage: 'RISK_ONLY',
    time_window: '90_DAYS',
    raw_unit: 'score de recurrencia',
    direction: 'HIGHER_IS_WORSE',
    weight: RISK_WEIGHTS.FAILURE_RECURRENCE_TREND,
    missing_policy: 'KNOWN'
  },
  RISK_ACTIVE_FINDINGS_SEVERITY: {
    feature_id: 'RISK_ACTIVE_FINDINGS_SEVERITY',
    feature_name: 'Severidad de Hallazgos Físicos no Resueltos',
    domain: 'FINDINGS',
    usage: 'RISK_ONLY',
    time_window: '90_DAYS',
    raw_unit: 'puntos de severidad',
    direction: 'HIGHER_IS_WORSE',
    weight: RISK_WEIGHTS.ACTIVE_FINDINGS_SEVERITY,
    missing_policy: 'KNOWN'
  }
};

export function criticalityToRiskScore(criticality: AssetCriticality): number {
  switch (criticality) {
    case 'ALTA': return 100;
    case 'MEDIA': return 50;
    case 'BAJA': return 10;
    default: return 50;
  }
}

export function classifyRiskState(score: number | null, isSufficient: boolean): RiskState {
  if (!isSufficient || score === null) {
    return 'INSUFFICIENT_DATA';
  }
  if (score >= 75) return 'CRITICAL';
  if (score >= 50) return 'HIGH';
  if (score >= 25) return 'MODERATE';
  return 'LOW';
}

export function computeRiskScore(components: ScoreComponent[]): number | null {
  const activeComponents = components.filter(c => c.normalized_value !== null && c.data_status === 'KNOWN');
  if (activeComponents.length === 0) return null;

  const totalActiveWeight = activeComponents.reduce((sum, c) => sum + c.weight, 0);
  if (totalActiveWeight < 0.60) {
    return null;
  }

  const rawSum = activeComponents.reduce((sum, c) => sum + (c.normalized_value! * c.weight), 0);
  const reweightedScore = rawSum / totalActiveWeight;

  return Math.round(reweightedScore * 10) / 10;
}
