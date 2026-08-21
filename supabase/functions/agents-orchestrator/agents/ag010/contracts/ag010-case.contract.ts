// supabase/functions/agents-orchestrator/agents/ag010/contracts/ag010-case.contract.ts
// Case Scope and Case Identity Contract for AG-010 (v1.0)
// Frozen under Tokens: AG010-CASE-MODEL-001, AG010-CASE-SCOPE-001
// Invariant: Case identity strictly anchored to canonical asset_id & failure event (§38-45 PRD-AG-010.1)

export interface AG010CaseScope {
  case_id: string;
  asset_id: string;
  failure_title: string;
  problem_description: string;
  evaluation_at: string;
  source_trigger: 'WORK_ORDER' | 'ALERT' | 'USER_QUERY' | 'AG001_DISPATCH';
  source_entity_id?: string | null;
}

export function buildCaseId(assetId: string, timestampIso: string): string {
  const cleanDate = timestampIso.replace(/[-:TZ.]/g, '').slice(0, 14);
  return `RCA-${assetId}-${cleanDate}`;
}

export function validateCaseScope(scope: AG010CaseScope): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!scope.case_id) errors.push('case_id is required.');
  if (!scope.asset_id) errors.push('asset_id is required.');
  if (!scope.problem_description) errors.push('problem_description is required.');
  if (!scope.evaluation_at) errors.push('evaluation_at is required.');
  return { isValid: errors.length === 0, errors };
}
