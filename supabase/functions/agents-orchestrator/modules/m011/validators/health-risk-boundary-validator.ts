// supabase/functions/agents-orchestrator/modules/m011/validators/health-risk-boundary-validator.ts
// Health and Risk Boundary & Cross-Contamination Validator (v1.0)
// Frozen under Token: M011-HEALTH-RISK-BOUNDARY-VALIDATOR-001
// Invariant: Zero configuration crossover; Health and Risk strictly isolated (§32-36 PRD-M-011.2-R1)

import { HEALTH_FEATURE_DEFINITIONS, HEALTH_WEIGHTS } from '../contracts/m011-health-model.contract.ts';
import { RISK_FEATURE_DEFINITIONS, RISK_WEIGHTS } from '../contracts/m011-risk-model.contract.ts';
import type { ScoreComponent } from '../types/m011.types.ts';

export class HealthRiskBoundaryViolationError extends Error {
  constructor(message: string) {
    super(`[M011_HEALTH_RISK_CROSSOVER_VIOLATION] ${message}`);
    this.name = 'HealthRiskBoundaryViolationError';
  }
}

export class HealthRiskBoundaryValidator {
  public static validateHealthComponentsIsolation(components: ScoreComponent[]): void {
    const healthFeatureIds = Object.keys(HEALTH_FEATURE_DEFINITIONS);
    for (const comp of components) {
      if (!healthFeatureIds.includes(comp.feature_id)) {
        throw new HealthRiskBoundaryViolationError(
          `Feature '${comp.feature_id}' is not an authorized Health feature. Crossover prohibited.`
        );
      }
      if (comp.feature_id in RISK_FEATURE_DEFINITIONS && !comp.feature_id.startsWith('HEALTH_')) {
        throw new HealthRiskBoundaryViolationError(
          `Risk feature '${comp.feature_id}' contaminated Health pipeline.`
        );
      }
    }
  }

  public static validateRiskComponentsIsolation(components: ScoreComponent[]): void {
    const riskFeatureIds = Object.keys(RISK_FEATURE_DEFINITIONS);
    for (const comp of components) {
      if (!riskFeatureIds.includes(comp.feature_id)) {
        throw new HealthRiskBoundaryViolationError(
          `Feature '${comp.feature_id}' is not an authorized Risk feature. Crossover prohibited.`
        );
      }
      if (comp.feature_id in HEALTH_FEATURE_DEFINITIONS && !comp.feature_id.startsWith('RISK_')) {
        throw new HealthRiskBoundaryViolationError(
          `Health feature '${comp.feature_id}' contaminated Risk pipeline.`
        );
      }
    }
  }

  public static validateWeightSeparation(): void {
    // Assert health weights do not share keys with risk weights
    const healthWeightKeys = Object.keys(HEALTH_WEIGHTS);
    const riskWeightKeys = Object.keys(RISK_WEIGHTS);

    for (const key of healthWeightKeys) {
      if (riskWeightKeys.includes(key)) {
        throw new HealthRiskBoundaryViolationError(
          `Weight key '${key}' overlaps between Health and Risk weight definitions.`
        );
      }
    }
  }
}
