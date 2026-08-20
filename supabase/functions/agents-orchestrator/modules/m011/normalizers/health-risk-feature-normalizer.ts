// supabase/functions/agents-orchestrator/modules/m011/normalizers/health-risk-feature-normalizer.ts
// Feature Normalization Engine for M-011 (v1.0)
// Frozen under Token: M011-NORMALIZATION-ENGINE-001
// Invariant: Bounded [0, 100]; zero undocumented clamps; deterministic decimal rounding (§46-55 PRD-M-011.2)

import { criticalityToRiskScore } from '../contracts/m011-risk-model.contract.ts';
import type { AssetCriticality } from '../types/m011.types.ts';

export class HealthRiskFeatureNormalizer {
  // 1. HEALTH_FAILURE_FREQUENCY: 0 failures = 100, 5+ failures = 0
  public static normalizeFailureFrequency(rawFailures: number | null): number | null {
    if (rawFailures === null || rawFailures === undefined) return null;
    const clampedFailures = Math.min(Math.max(rawFailures, 0), 5);
    const score = 100 - (clampedFailures * 20);
    return Math.round(score * 10) / 10;
  }

  // 2. HEALTH_MAINTENANCE_COMPLIANCE: ratio 0-1.0 -> 0-100
  public static normalizeMaintenanceCompliance(rawComplianceRatio: number | null): number | null {
    if (rawComplianceRatio === null || rawComplianceRatio === undefined) return null;
    const clampedRatio = Math.min(Math.max(rawComplianceRatio, 0), 1.0);
    const score = clampedRatio * 100;
    return Math.round(score * 10) / 10;
  }

  // 3. HEALTH_PHYSICAL_FINDINGS: penalty points subtracted from 100
  public static normalizePhysicalFindings(penaltyPoints: number | null): number | null {
    if (penaltyPoints === null || penaltyPoints === undefined) return null;
    const score = Math.max(100 - penaltyPoints, 0);
    return Math.round(score * 10) / 10;
  }

  // 4. HEALTH_DOWNTIME_IMPACT: 0 min = 100, 480 min (8h) = 0
  public static normalizeDowntimeImpact(downtimeMinutes: number | null): number | null {
    if (downtimeMinutes === null || downtimeMinutes === undefined) return null;
    const clampedMin = Math.min(Math.max(downtimeMinutes, 0), 480);
    const score = 100 - (clampedMin / 4.8);
    return Math.round(score * 10) / 10;
  }

  // 5. RISK_HEALTH_DEGRADATION: 100 - health_score
  public static normalizeHealthDegradation(healthScore: number | null): number | null {
    if (healthScore === null || healthScore === undefined) return null;
    const score = Math.max(100 - healthScore, 0);
    return Math.round(score * 10) / 10;
  }

  // 6. RISK_MACHINE_CRITICALITY: ALTA = 100, MEDIA = 50, BAJA = 10
  public static normalizeMachineCriticality(criticality: AssetCriticality | null): number | null {
    if (!criticality) return null;
    return criticalityToRiskScore(criticality);
  }

  // 7. RISK_FAILURE_RECURRENCE_TREND: 0-100 score
  public static normalizeFailureRecurrenceTrend(rawScore: number | null): number | null {
    if (rawScore === null || rawScore === undefined) return null;
    return Math.min(Math.max(rawScore, 0), 100);
  }

  // 8. RISK_ACTIVE_FINDINGS_SEVERITY: 0-100 score
  public static normalizeActiveFindingsSeverity(rawSeverity: number | null): number | null {
    if (rawSeverity === null || rawSeverity === undefined) return null;
    return Math.min(Math.max(rawSeverity, 0), 100);
  }
}
