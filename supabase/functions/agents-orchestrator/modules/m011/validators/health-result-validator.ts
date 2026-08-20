// supabase/functions/agents-orchestrator/modules/m011/validators/health-result-validator.ts
// Health Result Contract Validator for M-011 (v1.0)

import type { HealthResult } from '../types/m011.types.ts';

export class HealthResultValidator {
  public static validate(result: HealthResult): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!result.asset_id) errors.push('asset_id is missing.');
    if (!result.evaluation_at) errors.push('evaluation_at is missing.');
    if (!result.health_state) errors.push('health_state is missing.');
    if (!Array.isArray(result.components)) errors.push('components must be an array.');
    if (!result.model_version) errors.push('model_version is missing.');

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
