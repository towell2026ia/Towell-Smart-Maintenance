// supabase/functions/agents-orchestrator/modules/m011/contracts/m011-data-sufficiency.contract.ts
// Data Sufficiency & Missingness Evaluation Engine Contract (v1.0)
// Frozen under Token: M011-DATA-SUFFICIENCY-001
// Invariant: DATA SUFFICIENCY != HEALTH SCORE; MISSING != ZERO; UNKNOWN != HEALTHY (§49-55 PRD-M-011.1)

import type { DataSufficiencyEvaluation } from '../types/m011.types.ts';
import type { M011AssetInputContext } from './m011-asset-input.contract.ts';

export function evaluateDataSufficiency(context: Partial<M011AssetInputContext>): DataSufficiencyEvaluation {
  const missingCritical: string[] = [];
  const warnings: string[] = [];
  let availableWeight = 0;

  // 1. Identity & Criticality (Mandatory for both Health & Risk)
  if (!context.identity || !context.identity.criticidad) {
    missingCritical.push('identity.criticidad');
  } else {
    availableWeight += 25;
  }

  // 2. Failure Metrics
  if (context.failure_metrics === undefined) {
    missingCritical.push('failure_metrics');
  } else {
    availableWeight += 25;
  }

  // 3. Maintenance Compliance
  if (context.maintenance_history === undefined) {
    missingCritical.push('maintenance_history');
  } else {
    availableWeight += 25;
  }

  // 4. Downtime History
  if (context.downtime_history === undefined) {
    warnings.push('downtime_history_not_provided_defaults_to_zero_exposure');
    availableWeight += 15;
  } else {
    availableWeight += 15;
  }

  // 5. Findings History
  if (context.findings === undefined) {
    warnings.push('findings_not_provided_assumes_no_unresolved_critical_findings');
    availableWeight += 10;
  } else {
    availableWeight += 10;
  }

  const isSufficient = missingCritical.length === 0 && availableWeight >= 65;

  return {
    is_sufficient: isSufficient,
    sufficiency_score: availableWeight,
    missing_critical_features: missingCritical,
    warnings
  };
}
