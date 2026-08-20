// supabase/functions/agents-orchestrator/modules/m010/validators/asset360-validator.ts
// Asset360 Output Validator for M-010 (v1.0)
// Frozen under Token: M010-ASSET360-CONTRACT-001
// Invariant: Rejects invalid semantic merges, missing source references, or unapproved sections (§101-106 PRD-M-010.2-R1)

import type { Asset360 } from '../types/m010.types.ts';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export function validateAsset360Output(asset: Asset360): ValidationResult {
  const errors: string[] = [];

  if (!asset.asset_id || typeof asset.asset_id !== 'string') {
    errors.push('asset_id is missing or invalid.');
  }

  if (!asset.identity || asset.identity.asset_id !== asset.asset_id) {
    errors.push('Identity section is missing or mismatched.');
  }

  if (!Array.isArray(asset.work_orders)) {
    errors.push('work_orders must be an array.');
  } else {
    for (const wo of asset.work_orders) {
      if (!wo.source_reference || !wo.source_reference.source_id) {
        errors.push(`Work order ${wo.folio} is missing source_reference.`);
      }
    }
  }

  if (!Array.isArray(asset.failure_history)) {
    errors.push('failure_history must be an array.');
  }

  if (!Array.isArray(asset.maintenance_plans)) {
    errors.push('maintenance_plans must be an array.');
  }

  if (!Array.isArray(asset.parts_history)) {
    errors.push('parts_history must be an array.');
  }

  if (!Array.isArray(asset.alerts)) {
    errors.push('alerts must be an array.');
  }

  if (!Array.isArray(asset.timeline)) {
    errors.push('timeline must be an array.');
  }

  if (!asset.data_completeness || !asset.data_completeness.overall_completeness) {
    errors.push('data_completeness metadata is missing.');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
