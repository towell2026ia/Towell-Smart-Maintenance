// supabase/functions/agents-orchestrator/agents/ag003/guards/data-quality-guard.ts
// Data Quality & Sufficiency Guard (§20-23 PRD)

import { DataSufficiencyStatus } from '../types/ag003.types.ts';
import { DATA_QUALITY_CONFIG } from '../rules/data-quality.rules.ts';

export interface DataQualityEvaluation {
  status: DataSufficiencyStatus;
  validRollsCount: number;
  invalidRollsCount: number;
  hasUnknownNulls: boolean;
  isAcceptableForRanking: boolean;
}

export function evaluateDataQuality(
  totalRolls: number,
  validRolls: number,
  invalidRolls: number,
  hasNullDefects: boolean
): DataQualityEvaluation {
  if (totalRolls === 0) {
    return {
      status: 'NO_PRODUCTION_DATA',
      validRollsCount: 0,
      invalidRollsCount: 0,
      hasUnknownNulls: false,
      isAcceptableForRanking: false
    };
  }

  if (validRolls >= DATA_QUALITY_CONFIG.MIN_ROLLS_SUFFICIENT) {
    return {
      status: 'SUFFICIENT_DATA',
      validRollsCount: validRolls,
      invalidRollsCount: invalidRolls,
      hasUnknownNulls: hasNullDefects,
      isAcceptableForRanking: true
    };
  }

  if (validRolls >= DATA_QUALITY_CONFIG.MIN_ROLLS_PARTIAL) {
    return {
      status: 'PARTIAL_DATA',
      validRollsCount: validRolls,
      invalidRollsCount: invalidRolls,
      hasUnknownNulls: hasNullDefects,
      isAcceptableForRanking: true
    };
  }

  return {
    status: 'INSUFFICIENT_DATA',
    validRollsCount: validRolls,
    invalidRollsCount: invalidRolls,
    hasUnknownNulls: hasNullDefects,
    isAcceptableForRanking: false
  };
}
