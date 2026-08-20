// supabase/functions/agents-orchestrator/modules/m011/quality/data-sufficiency-engine.ts
// Data Sufficiency Engine for Health and Risk Pipelines (v1.0)
// Frozen under Token: M011-DATA-SUFFICIENCY-001
// Invariant: Health and Risk sufficiency evaluated separately; missing != zero (§38-45 PRD-M-011.2)

import { evaluateDataSufficiency } from '../contracts/m011-data-sufficiency.contract.ts';
import type { DataSufficiencyEvaluation } from '../types/m011.types.ts';
import type { M011AssetInputContext } from '../contracts/m011-asset-input.contract.ts';

export class DataSufficiencyEngine {
  public static evaluateHealthSufficiency(context: Partial<M011AssetInputContext>): DataSufficiencyEvaluation {
    return evaluateDataSufficiency(context);
  }

  public static evaluateRiskSufficiency(context: Partial<M011AssetInputContext>): DataSufficiencyEvaluation {
    const baseEval = evaluateDataSufficiency(context);
    const missingCritical = [...baseEval.missing_critical_features];

    if (!context.identity?.criticidad) {
      if (!missingCritical.includes('identity.criticidad')) {
        missingCritical.push('identity.criticidad');
      }
    }

    const isSufficient = missingCritical.length === 0 && baseEval.sufficiency_score >= 60;

    return {
      is_sufficient: isSufficient,
      sufficiency_score: baseEval.sufficiency_score,
      missing_critical_features: missingCritical,
      warnings: baseEval.warnings
    };
  }
}
