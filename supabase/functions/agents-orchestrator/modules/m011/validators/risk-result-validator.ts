// supabase/functions/agents-orchestrator/modules/m011/validators/risk-result-validator.ts
// Risk Result Contract Validator for M-011 (v1.0)

import type { RiskResult } from '../types/m011.types.ts';

export class RiskResultValidator {
  public static validate(result: RiskResult): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!result.asset_id) errors.push('asset_id is missing.');
    if (!result.evaluation_at) errors.push('evaluation_at is missing.');
    if (!result.risk_state) errors.push('risk_state is missing.');
    if (!result.criticality) errors.push('criticality is missing.');
    if (!Array.isArray(result.components)) errors.push('components must be an array.');
    if (!result.model_version) errors.push('model_version is missing.');

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
