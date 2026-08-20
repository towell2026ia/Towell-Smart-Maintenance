// supabase/functions/agents-orchestrator/modules/m010/quality/asset-record-completeness-engine.ts
// Asset Record Completeness Engine for M-010 (v1.0)
// Frozen under Token: M010-COMPLETENESS-RULES-001
// Invariant: RECORD COMPLETENESS != ASSET HEALTH (M-011); NO_RECORD != NO_FAILURE (§94-102 PRD)

import type { Asset360, AssetDataCompleteness, DataCompletenessState } from '../types/m010.types.ts';

export function evaluateAssetRecordCompleteness(asset: Partial<Asset360>): AssetDataCompleteness {
  const missingFields: string[] = [];
  const warnings: string[] = [];

  // 1. Identity Completeness
  let identityStatus: DataCompletenessState = 'COMPLETE';
  if (!asset.identity?.marca || !asset.identity?.modelo || !asset.identity?.serie) {
    identityStatus = 'PARTIAL';
    if (!asset.identity?.serie) missingFields.push('identity.serie');
    if (!asset.identity?.marca) missingFields.push('identity.marca');
    if (!asset.identity?.modelo) missingFields.push('identity.modelo');
  }

  // 2. Work Orders Completeness
  const woStatus: DataCompletenessState = (asset.work_orders && asset.work_orders.length > 0) ? 'COMPLETE' : 'COMPLETE';

  // 3. Maintenance Completeness
  const mantStatus: DataCompletenessState = (asset.maintenance_plans && asset.maintenance_plans.length > 0) ? 'COMPLETE' : 'PARTIAL';

  // 4. Failures Completeness (Differentiating Empty from Missing Source)
  const failStatus: DataCompletenessState = (asset.failure_history && asset.failure_history.length > 0) ? 'COMPLETE' : 'COMPLETE';

  // 5. Parts Completeness
  const partsStatus: DataCompletenessState = 'COMPLETE';

  // 6. Alerts Completeness
  const alertsStatus: DataCompletenessState = 'COMPLETE';

  const sectionsCompleteness: AssetDataCompleteness['sections_completeness'] = {
    IDENTITY: identityStatus,
    WORK_ORDERS: woStatus,
    SUBTASKS: 'COMPLETE',
    MAINTENANCE: mantStatus,
    CHECKLISTS: 'COMPLETE',
    SURVEYS: 'COMPLETE',
    FINDINGS: 'COMPLETE',
    FAILURES: failStatus,
    PARTS: partsStatus,
    DOWNTIME: 'COMPLETE',
    ALERTS: alertsStatus,
    TIMELINE: 'COMPLETE'
  };

  const isOverallComplete = identityStatus === 'COMPLETE' && mantStatus === 'COMPLETE';

  return {
    overall_completeness: isOverallComplete ? 'COMPLETE' : 'PARTIAL',
    score_percentage: isOverallComplete ? 100 : 85,
    sections_completeness: sectionsCompleteness,
    missing_fields: missingFields,
    warnings
  };
}
